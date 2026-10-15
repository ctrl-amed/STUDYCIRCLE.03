"""IT admin: login, password, create admin, users, rooms, logs, suspend user."""
import re
import secrets
from datetime import datetime, timedelta, timezone
import uuid

from flask import Blueprint, jsonify, request
from flask_mail import Message

import config
from extensions import bcrypt, mail, supabase, token_serializer
from services.presence import get_current_presence_summary
from services.rooms_service import get_live_count, is_room_active, is_room_closed, suspend_room
from services.suspension import _lift_suspension, apply_user_suspension
from utils.decorators import _admin_fail, _admin_locked, admin_login_attempts, require_admin
from utils.helpers import (_count_between, _fetch_all, _iso_utc, _pct_change, _resolve_range,
                           _to_pht, parse_json_field, parse_ts)

admin_bp = Blueprint('admin', __name__)


# --- Admin authentication (professors / IT staff) ---

@admin_bp.route('/api/itadmin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    res = supabase.table('admins').select('*').eq('email', email).execute()
    admin = res.data[0] if res.data else None

    # Not an admin email: plain 401, and we don't count it. The frontend then tries student login.
    if not admin:
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    if _admin_locked(email):
        return jsonify({'success': False, 'error': 'Too many failed attempts. Try again in a few minutes.'}), 429

    if not admin['is_active'] or not bcrypt.check_password_hash(admin['password'], password):
        _admin_fail(email)
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    admin_login_attempts.pop(email, None)
    supabase.table('admins').update({'last_login_at': datetime.now(timezone.utc).isoformat()}).eq('id', admin['id']).execute()

    return jsonify({
        'success': True,
        'token': token_serializer.dumps({'id': admin['id']}),
        'mustChangePassword': bool(admin['must_change_password']),
        'admin': {'username': admin['username'], 'fullName': admin['full_name'], 'role': admin['role']}
    }), 200


@admin_bp.route('/api/itadmin/change-password', methods=['POST'])
@require_admin(allow_pending=True)
def admin_change_password():
    data = request.get_json() or {}
    old_pw = data.get('old_password') or ''
    new_pw = data.get('new_password') or ''

    if not config.ADMIN_PASSWORD_REGEX.match(new_pw):
        return jsonify({'success': False, 'error': 'Password needs 8+ characters, upper and lower case, a number, and a special character.'}), 400
    if old_pw == new_pw:
        return jsonify({'success': False, 'error': 'New password must be different from the current one.'}), 400

    res = supabase.table('admins').select('password').eq('id', request.admin['id']).execute()
    if not res.data or not bcrypt.check_password_hash(res.data[0]['password'], old_pw):
        return jsonify({'success': False, 'error': 'Current password is incorrect.'}), 400

    supabase.table('admins').update({
        'password': bcrypt.generate_password_hash(new_pw).decode('utf-8'),
        'must_change_password': False
    }).eq('id', request.admin['id']).execute()

    return jsonify({'success': True, 'token': token_serializer.dumps({'id': request.admin['id']})}), 200


@admin_bp.route('/api/itadmin/create-admin', methods=['POST'])
@require_admin(super_only=True)
def admin_create_admin():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    full_name = (data.get('fullName') or '').strip()
    email = (data.get('email') or '').strip().lower()

    if not username or not full_name or not email:
        return jsonify({'success': False, 'error': 'Username, full name and email are required.'}), 400

    temp_password = secrets.token_urlsafe(9) + 'A1!'   # guarantees the password rules
    try:
        supabase.table('admins').insert({
            'username': username,
            'full_name': full_name,
            'email': email,
            'password': bcrypt.generate_password_hash(temp_password).decode('utf-8'),
            'role': 'professor',
            'must_change_password': True,
        }).execute()
    except Exception as e:
        return jsonify({'success': False, 'error': f'Could not create admin: {e}'}), 400

    return jsonify({'success': True, 'tempPassword': temp_password}), 201


# --- Admin data endpoints ---

@admin_bp.route('/api/itadmin/users', methods=['GET'])
@require_admin()
def admin_get_users():
    try:
        users_res = supabase.table('users').select('id, username, email, status, created_at').order('created_at', desc=True).execute()
        users = users_res.data or []

        # 1. Total sessions from study_sessions table
        sessions_res = supabase.table('study_sessions').select('user_id').execute()
        sessions_count_by_user_id = {}
        for s in (sessions_res.data or []):
            uid = s.get('user_id')
            if uid is not None:
                sessions_count_by_user_id[uid] = sessions_count_by_user_id.get(uid, 0) + 1

        # 2. Lifetime flags count and active suspension check
        susp_res = supabase.table('suspensions').select('*').order('created_at', desc=True).execute()
        all_suspensions = susp_res.data or []

        flags_count_by_user = {}
        active_susp_by_user = {}
        now = datetime.now(timezone.utc)

        for s in all_suspensions:
            u_id = s.get('user_id')
            if u_id is not None:
                # Count ALL rows = permanent flags history (never resets to 0)
                flags_count_by_user[u_id] = flags_count_by_user.get(u_id, 0) + 1

                if s.get('is_active'):
                    until = parse_ts(s.get('suspended_until'))
                    if until is not None and now >= until:
                        # expired: lift it (also resets users.status) and don't count it as active
                        _lift_suspension(s)
                        continue
                    if u_id not in active_susp_by_user:
                        active_susp_by_user[u_id] = s

        # Grab live memory presence
        presence = get_current_presence_summary()
        online_map = presence['online_map']  # { "email@umak.edu.ph": "ONLINE" | "STUDYING" }

        formatted_users = []
        for u in users:
            u_id = u.get('id')
            user_email = (u.get('email') or '').strip().lower()
            is_active_susp = u_id in active_susp_by_user

            # Real-time state priority: Suspended > Studying > Active > Inactive
            live_state = online_map.get(user_email)
            if is_active_susp:
                status_display = 'Suspended'
            elif live_state == 'STUDYING':
                status_display = 'Studying'
            elif live_state == 'ONLINE':
                status_display = 'Active'
            else:
                status_display = 'Inactive'

            # Days since account creation
            created_time = u.get('created_at')
            days_ago = 0
            if created_time:
                try:
                    c_date = datetime.fromisoformat(created_time.replace('Z', '+00:00')).date()
                    days_ago = (datetime.now().date() - c_date).days
                except Exception:
                    days_ago = 0

            formatted_users.append({
                'id': u_id,
                'username': u.get('username') or 'User',
                'email': u.get('email'),
                'status': status_display,
                'totalSessions': sessions_count_by_user_id.get(u_id, 0),
                'lastActive': 'Today' if (days_ago == 0 or live_state) else f"{days_ago}d ago",
                'daysAgo': 0 if live_state else days_ago,
                'flags': flags_count_by_user.get(u_id, 0),
                'isSuspended': is_active_susp
            })

        total_users = len(formatted_users)
        active_count = presence['active_users_count']
        studying_count = presence['currently_studying_count']
        suspended_count = sum(1 for u in formatted_users if u['status'] == 'Suspended')

        return jsonify({
            'success': True,
            'users': formatted_users,
            'metrics': {
                'totalUsers': total_users,
                'activeUsers': active_count,
                'currentlyStudying': studying_count,
                'reportedUsers': suspended_count
            }
        }), 200

    except Exception as e:
        print("ADMIN GET USERS ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/api/itadmin/rooms', methods=['GET'])
@require_admin()
def admin_get_rooms():
    """Manage Rooms page.
    Total    = every room CREATED in the range (active, inactive, closed, suspended).
    Reported = reports about rooms created in the range.
    Active / Inactive are derived live by the frontend from the rows."""
    try:
        range_key = request.args.get('range', 'All time')
        is_all_time = range_key in ('All time', '', None)

        q = supabase.table('rooms').select('*').order('created_at', desc=True)
        start = end = None
        if not is_all_time:
            try:
                start, end = _resolve_range(range_key, request.args.get('start'), request.args.get('end'))
            except (ValueError, TypeError) as ve:
                return jsonify({'success': False, 'error': f'Invalid date range: {ve}'}), 400
            q = q.gte('created_at', _iso_utc(start)).lt('created_at', _iso_utc(end))

        rooms = _fetch_all(lambda: q)   # no is_closed / status filter on purpose

        for r in rooms:
            r['current_members'] = get_live_count(r['name'])
            closed = is_room_closed(r)
            r['is_active'] = (not closed) and is_room_active(r)
            if r.get('status') == 'suspended':
                r['status_display'] = 'Suspended'
            elif closed:
                r['status_display'] = 'Closed'
            else:
                r['status_display'] = 'Active' if r['is_active'] else 'Inactive'

        # ---------- Total rooms card ----------
        total_cur = len(rooms)
        total_change = None
        if not is_all_time:
            prev_start, prev_end = start - (end - start), start
            total_prev = _count_between('rooms', 'created_at', prev_start, prev_end)
            total_change = _pct_change(total_cur, total_prev)

        # ---------- Reported rooms card ----------
        rep_q = supabase.table('reports').select('id', count='exact').eq('target_type', 'room')
        reported_change = None
        if not is_all_time:
            rep_cur = rep_q.gte('created_at', _iso_utc(start)).lt('created_at', _iso_utc(end)).limit(1).execute().count or 0
            rep_prev = supabase.table('reports').select('id', count='exact').eq('target_type', 'room') \
                .gte('created_at', _iso_utc(prev_start)).lt('created_at', _iso_utc(prev_end)).limit(1).execute().count or 0
            reported_change = _pct_change(rep_cur, rep_prev)
        else:
            rep_cur = rep_q.limit(1).execute().count or 0

        return jsonify({
            'success': True,
            'rooms': rooms,
            'metrics': {
                'totalRooms':    {'value': total_cur, 'change': total_change},
                'reportedRooms': {'value': rep_cur,   'change': reported_change},
            }
        }), 200
    except Exception as e:
        print("ADMIN GET ROOMS ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/api/itadmin/rooms/<int:room_id>/close', methods=['POST'])
@require_admin()
def admin_close_room(room_id):
    data = request.get_json() or {}
    reason = data.get('reason') or 'Community Guidelines Violation'
    try:
        res = supabase.table('rooms').select('name, host').eq('id', room_id).execute()
        if not res.data:
            return jsonify({'success': False, 'error': 'Room not found.'}), 404
        room = res.data[0]

        suspend_room(room['name'], reason)

        # Email sa host (hindi dapat mag-fail ang close kahit di ma-send)
        try:
            h = supabase.table('users').select('email').eq('username', room['host']).execute()
            if h.data:
                mail.send(Message(
                    subject="StudyCircle: Your room was closed",
                    recipients=[h.data[0]['email']],
                    body=f"Hi {room['host']},\n\nYour room \"{room['name']}\" was closed by an administrator.\nReason: {reason}\n\n- StudyCircle Team"
                ))
        except Exception as mail_err:
            print("[ROOM CLOSE MAIL]:", mail_err)

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# --- IT Logs ---

def _normalize_log_action(action_taken):
    text = (action_taken or '').lower()
    if 'suspend' in text:
        return 'Suspended'
    if 'warn' in text:
        return 'Warning'
    return 'Dismissed'


def _normalize_log_duration(duration):
    """'7 Days / 1 Week' -> '7 Days', 'Permanent / Indefinite' -> 'Permanent'."""
    if not duration:
        return 'N/A'
    d = str(duration).strip()
    if d.lower().startswith('permanent'):
        return 'Permanent'
    if d.lower().startswith('custom'):
        return 'Custom'
    return d.split('/')[0].strip()


@admin_bp.route('/api/itadmin/logs', methods=['GET'])
@require_admin()
def admin_get_logs():
    """
    Admin action history for the IT Logs page. Built from:
      1) reports that an admin already acted on (dismissed / warned / suspended)
      2) suspensions issued directly (e.g. from Manage Users) that have no matching report
    """
    try:
        logs = []

        # ---- 1. Actioned reports ----
        rep_res = supabase.table('reports').select('*') \
            .neq('status', 'pending') \
            .order('updated_at', desc=True) \
            .limit(1000).execute()

        for r in (rep_res.data or []):
            # skip anything that was never actually actioned
            if not r.get('action_taken') and r.get('status') not in ('resolved', 'closed'):
                continue

            dt = _to_pht(r.get('updated_at') or r.get('created_at'))
            if not dt:
                continue

            action = _normalize_log_action(r.get('action_taken'))
            details = parse_json_field(r.get('target_details'), {}) or {}
            target = details.get('username') or details.get('host') or details.get('roomName') or 'Unknown'

            ticket = str(r.get('ticket_id') or '')
            digits = re.sub(r'\D', '', ticket)
            log_id = f"LOG-{digits}" if digits else f"LOG-{str(r.get('id'))[:6].upper()}"

            logs.append({
                'logId': log_id,
                'date': dt.strftime('%Y-%m-%d'),
                'timestamp': dt.strftime('%H:%M:%S'),
                'admin': r.get('admin_username') or 'IT Admin',
                'targetUser': target,
                'action': action,
                'duration': _normalize_log_duration(r.get('suspension_duration')) if action == 'Suspended' else 'N/A',
                '_dt': dt,
            })

        # ---- 2. Direct suspensions (skip ones already covered by a report log) ----
        susp_res = supabase.table('suspensions').select('*') \
            .order('created_at', desc=True).limit(1000).execute()
        susp_rows = susp_res.data or []

        user_ids = list({s['user_id'] for s in susp_rows if s.get('user_id') is not None})
        names = {}
        if user_ids:
            u_res = supabase.table('users').select('id, username').in_('id', user_ids).execute()
            names = {u['id']: u['username'] for u in (u_res.data or [])}

        for s in susp_rows:
            dt = _to_pht(s.get('created_at'))
            if not dt:
                continue
            target = names.get(s.get('user_id')) or s.get('email') or 'Unknown'

            already_logged = any(
                l['action'] == 'Suspended'
                and l['targetUser'].lower() == str(target).lower()
                and abs((l['_dt'] - dt).total_seconds()) < 300
                for l in logs
            )
            if already_logged:
                continue

            logs.append({
                'logId': f"LOG-S{s.get('id')}",
                'date': dt.strftime('%Y-%m-%d'),
                'timestamp': dt.strftime('%H:%M:%S'),
                'admin': s.get('admin_username') or 'IT Admin',
                'targetUser': target,
                'action': 'Suspended',
                'duration': _normalize_log_duration(s.get('duration')),
                '_dt': dt,
            })

        # newest first, then number the rows and drop the helper field
        logs.sort(key=lambda l: l['_dt'], reverse=True)
        for i, l in enumerate(logs, start=1):
            l['id'] = i
            l.pop('_dt', None)

        return jsonify({'success': True, 'logs': logs}), 200

    except Exception as e:
        print("ADMIN GET LOGS ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/api/itadmin/suspend-user', methods=['POST'])
@require_admin()
def admin_suspend_user():
    """Inserts a suspension record into the public.suspensions table and applies the Strike Policy (Table 3.10)."""
    data = request.json or {}
    target_email = data.get('email')
    reason = data.get('reason', 'Community Guidelines Violation')
    notes = data.get('notes', '')
    custom_dt = data.get('customDatetime')
    
    # Kukunin ang violation class mula sa frontend. Kung wala, default sa 'A' (Minor)
    violation_class = str(data.get('violationClass', 'A')).strip().upper()
    if violation_class not in ['A', 'B', 'C']:
        violation_class = 'A'

    if not target_email:
        return jsonify({'success': False, 'message': 'Email required'}), 400

    try:
        user_res = supabase.table('users').select('id, username, inventory').eq('email', target_email).execute()
        if not user_res.data:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user = user_res.data[0]
        user_id = user['id']
        username = user.get('username')

        # I-load ang user inventory kung saan natin isi-save ang strike records
        inventory = parse_json_field(user.get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        now = datetime.now(timezone.utc)
        
        # =====================================================================
        # STRIKE POLICY IMPLEMENTATION (Table 3.10)
        # =====================================================================
        
        active_items = []
        current_active_points = 0
        
        # 1. Linisin ang expired strikes at bilangin ang current active points
        for item in inventory:
            if isinstance(item, dict) and item.get('type') == 'strike':
                expiry_str = item.get('expires_at')
                if expiry_str:
                    expiry_dt = parse_ts(expiry_str)
                    if expiry_dt and now >= expiry_dt:
                        continue  # Expired na ang strike, huwag isama sa computation
                current_active_points += item.get('points', 0)
                active_items.append(item)
            else:
                active_items.append(item)  # Panatilihin ang ibang items (badges, reminders)

        # 2. I-set ang bagong points at expiration base sa violation class (Table 3.10)
        points_to_add = 0
        expiry_days = None
        
        if violation_class == 'C':
            points_to_add = 5
            expiry_days = None  # Permanent (walang expiration)
        elif violation_class == 'B':
            points_to_add = 2
            expiry_days = 180   # Expires in 180 days
        else: # Class A
            points_to_add = 1
            expiry_days = 90    # Expires in 90 days
            
        new_strike = {
            'id': f"strike_{uuid.uuid4().hex[:8]}",
            'type': 'strike',
            'class': violation_class,
            'points': points_to_add,
            'issued_at': now.isoformat(),
            'expires_at': (now + timedelta(days=expiry_days)).isoformat() if expiry_days else None
        }
        
        active_items.append(new_strike)
        new_total_points = current_active_points + points_to_add
        
        # I-save ang updated strike record sa database ng user
        supabase.table('users').update({'inventory': active_items}).eq('id', user_id).execute()
        
        # 3. Tukuyin ang haba ng parusa base sa naipong points (Table 3.10)
        calculated_duration = '1 Day' # Fallback
        
        if new_total_points <= 1:
            # Level 1: Warning lang (Walang suspension)
            warning_payload = {
                'reason': f"Warning: {reason} (Violation Class {violation_class})",
                'notes': notes or 'Please adhere to the community guidelines.',
                'targetType': 'user'
            }
            
            # Gamitin ang internal helper para ipadala ang warning nang direkta sa user
            emit_to_user(target_email, 'account_warning', warning_payload, username)
            
            return jsonify({
                'success': True,
                'message': f"Warning issued to {target_email}. Total Points: {new_total_points}. No suspension applied.",
                'suspended_until': None
            }), 200
            
        elif new_total_points == 2:
            calculated_duration = '1 Day'
        elif new_total_points == 3:
            calculated_duration = '3 Days'
        elif new_total_points == 4:
            calculated_duration = '7 Days'
        else: # 5 or more points (Level 5)
            calculated_duration = 'Permanent'
            
        # 4. I-apply ang computed suspension
        expiration_iso = apply_user_suspension(
            user_id, target_email, reason, calculated_duration, custom_dt, notes,
            request.admin['username']
        )

        return jsonify({
            'success': True,
            'message': f"Suspension logged for {target_email} (Total Points: {new_total_points}, Duration: {calculated_duration})",
            'suspended_until': expiration_iso
        }), 200

    except Exception as e:
        print("ADMIN SUSPEND ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500