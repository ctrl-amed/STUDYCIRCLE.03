"""Suspensions, warnings and live enforcement (force logout, per-user socket rooms)."""
import threading
from datetime import datetime, timedelta, timezone

from flask import jsonify

import config
from extensions import socketio, supabase
from services.presence import broadcast_presence_to_admins
from services.rooms_service import broadcast_room_counts, note_if_room_empty
from state import online_users, room_members, sid_email, sid_to_room, suspended_emails
from utils.helpers import PHT, format_pht, new_log, parse_json_field, parse_ts, send_plain_email

DURATION_DELTAS = {
    '24 hours': timedelta(days=1), '1 day': timedelta(days=1),
    '3 days': timedelta(days=3),
    '7 days': timedelta(days=7), '1 week': timedelta(days=7),
    '14 days': timedelta(days=14), '2 weeks': timedelta(days=14),
    '30 days': timedelta(days=30), '1 month': timedelta(days=30),
    '90 days': timedelta(days=90), '3 months': timedelta(days=90),
}


# ---------------------------------------------------------------------------
# Email notices (warning / suspension / room action)
# Sent in a background thread so a slow SMTP server never delays the admin's
# action, and a failed email never undoes the warning or suspension itself.
# ---------------------------------------------------------------------------

def _send_email_async(to_email, subject, body, label):
    if not to_email:
        return

    def _job():
        try:
            send_plain_email(to_email, subject, body)
            print(f"[{label} EMAIL SENT] to {to_email}")
        except Exception as e:
            print(f"[{label} EMAIL FAILED] {to_email}: {e}")

    threading.Thread(target=_job, daemon=True).start()


def send_warning_email(email, username, reason, notes='', warning_count=1):
    """Official warning notice to a user (user report or message report)."""
    lines = [
        f"Hi {username or 'Student'},",
        "",
        "You have received an official warning from the StudyCircle administrators.",
        "",
        f"Reason: {reason or 'Community Guidelines Violation'}",
    ]
    if notes:
        lines.append(f"Details: {notes}")
    lines += [
        f"Active warnings on your account: {warning_count}",
        "",
        "Please follow the StudyCircle community guidelines. Further violations may "
        "lead to a suspension of your account.",
        "",
        "If you think this was a mistake, reply to this email and we will review it.",
        "",
        "- StudyCircle Team",
    ]
    _send_email_async(email, "StudyCircle: Official Warning", "\n".join(lines), "WARNING")


def send_suspension_email(email, username, reason, lift_display):
    """Suspension notice. Internal admin notes are NOT included."""
    body = "\n".join([
        f"Hi {username or 'Student'},",
        "",
        "Your StudyCircle account has been suspended by the administrators.",
        "",
        f"Reason: {reason or 'Community Guidelines Violation'}",
        f"Suspension ends: {lift_display}",
        "",
        "While your account is suspended you cannot log in or use StudyCircle.",
        "",
        "If you think this was a mistake, reply to this email and we will review it.",
        "",
        "- StudyCircle Team",
    ])
    _send_email_async(email, "StudyCircle: Your Account Has Been Suspended", body, "SUSPENSION")


def email_room_host(host_username, room_name, action, reason, notes=''):
    """Notice to a room's host. action = 'warned' or 'closed'."""
    if not host_username:
        return
    try:
        h = supabase.table('users').select('email').eq('username', host_username).execute()
        if not h.data:
            return
        host_email = h.data[0].get('email')
    except Exception as e:
        print("[ROOM NOTICE] could not look up host:", e)
        return

    if action == 'closed':
        subject = "StudyCircle: Your Room Was Closed"
        intro = f'Your study room "{room_name}" was closed by the StudyCircle administrators.'
        outro = "If you think this was a mistake, reply to this email and we will review it."
    else:
        subject = "StudyCircle: Official Warning for Your Room"
        intro = f'Your study room "{room_name}" received an official warning from the StudyCircle administrators.'
        outro = "Please make sure your room follows the community guidelines. Further violations may lead to the room being closed."

    lines = [f"Hi {host_username},", "", intro, "", f"Reason: {reason or 'Community Guidelines Violation'}"]
    if notes:
        lines.append(f"Details: {notes}")
    lines += ["", outro, "", "- StudyCircle Team"]
    _send_email_async(host_email, subject, "\n".join(lines), "ROOM NOTICE")


# ---------------------------------------------------------------------------
# Warnings (derived from the reports table, no schema change)
# ---------------------------------------------------------------------------

def _warning_reports_for_user(username):
    res = supabase.table('reports') \
        .select('id, target_type, target_details, reason, action_notes, action_taken, updated_at') \
        .in_('target_type', ['user', 'message']) \
        .ilike('action_taken', '%warn%') \
        .order('updated_at', desc=True).limit(1000).execute()
    uname = (username or '').strip().lower()
    out = []
    for r in (res.data or []):
        d = parse_json_field(r.get('target_details'), {}) or {}
        n = (d.get('username') or d.get('reportedUsername') or d.get('sender') or '').strip().lower()
        if n == uname:
            out.append(r)
    return out


def get_active_warning_count(username):
    """Warnings in the current 'chain'. If the last warning is 30+ days old the count is 0.
    Each earlier warning only counts if it was within 30 days of the next one."""
    times = sorted(t for t in (parse_ts(r.get('updated_at')) for r in _warning_reports_for_user(username)) if t)
    if not times:
        return 0
    gap = timedelta(days=config.WARNING_RESET_DAYS)
    if datetime.now(timezone.utc) - times[-1] >= gap:
        return 0
    count = 1
    for i in range(len(times) - 2, -1, -1):
        if times[i + 1] - times[i] < gap:
            count += 1
        else:
            break
    return count


def get_pending_warnings(email):
    """Warnings the user has not acknowledged yet (so they still see them after being offline)."""
    try:
        u = supabase.table('users').select('username, inventory').eq('email', email).execute()
        if not u.data:
            return []
        username = u.data[0]['username']
        inv = parse_json_field(u.data[0].get('inventory'), []) or []
        seen = {x for x in inv if isinstance(x, str)}
        cutoff = datetime.now(timezone.utc) - timedelta(days=config.WARNING_DELIVER_DAYS)
        count = get_active_warning_count(username)
        out = []
        for r in _warning_reports_for_user(username):
            ts = parse_ts(r.get('updated_at'))
            if ts and ts >= cutoff and f"warn_seen_{r['id']}" not in seen:
                out.append({
                    'reason': r.get('reason') or 'Community Guidelines Violation',
                    'notes': r.get('action_notes') or '',
                    'targetType': r.get('target_type'),
                    'reportId': str(r['id']),
                    'warningCount': count,
                })
        return out
    except Exception as e:
        print("get_pending_warnings error:", e)
        return []


# ---------------------------------------------------------------------------
# Suspensions
# ---------------------------------------------------------------------------

def calculate_suspension_expiration(duration_str, custom_datetime_str=None):
    """
    Returns the exact UTC ISO timestamp when the suspension expires, or None
    for a permanent suspension.
    Interprets the HTML datetime-local input as Philippine Time (UTC+8)
    and stores it in UTC for reliable database comparisons.
    """
    now = datetime.now(timezone.utc)
    label = str(duration_str or '').strip()
    low = label.lower()

    if low.startswith('permanent'):
        return None

    if low.startswith('custom'):
        if custom_datetime_str:
            try:
                # <input type="datetime-local" /> gives "YYYY-MM-DDTHH:MM" with no timezone
                dt = datetime.fromisoformat(custom_datetime_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=PHT)
                return dt.astimezone(timezone.utc).isoformat()
            except Exception as e:
                print("Custom datetime parse error:", e)
        return (now + timedelta(days=1)).isoformat()

    # match on each part of a label such as "7 Days / 1 Week"
    for part in low.split('/'):
        if part.strip() in DURATION_DELTAS:
            return (now + DURATION_DELTAS[part.strip()]).isoformat()

    print(f"[SUSPENSION] Unknown duration label '{label}', defaulting to 1 day")
    return (now + timedelta(days=1)).isoformat()


def _lift_suspension(susp):
    """Marks one suspension inactive and resets the user's status if nothing else is active."""
    supabase.table('suspensions').update({'is_active': False}).eq('id', susp['id']).execute()
    other = supabase.table('suspensions').select('id') \
        .eq('user_id', susp['user_id']).eq('is_active', True).execute()
    if not other.data:
        supabase.table('users').update({'status': 'offline'}).eq('id', susp['user_id']).execute()
        try:
            u = supabase.table('users').select('email').eq('id', susp['user_id']).execute()
            if u.data:
                suspended_emails.discard((u.data[0]['email'] or '').strip().lower())
        except Exception:
            pass


def get_active_suspension(user_id):
    """
    Checks the 'suspensions' table for any active suspension for this user.
    Any suspension that has passed its expiration time is deactivated on the spot.
    Returns: suspension record dict if actively suspended, None if free to log in.
    """
    try:
        res = supabase.table('suspensions').select('*') \
            .eq('user_id', user_id).eq('is_active', True) \
            .order('created_at', desc=True).execute()

        now = datetime.now(timezone.utc)
        active = None
        for s in (res.data or []):
            until = parse_ts(s.get('suspended_until'))
            if until is not None and now >= until:
                _lift_suspension(s)
                print(f"[AUTO-LIFT] Suspension {s['id']} expired for user {user_id}. Restored access.")
                continue
            if active is None:
                active = s
        return active
    except Exception as e:
        print("Error checking suspension table:", e)
        return None


def lift_expired_suspensions():
    """Runs every minute so suspensions end on time even if the user never logs in."""
    try:
        res = supabase.table('suspensions').select('id, user_id, suspended_until') \
            .eq('is_active', True).execute()
        now = datetime.now(timezone.utc)
        lifted = False
        for s in (res.data or []):
            until = parse_ts(s.get('suspended_until'))
            if until is not None and now >= until:
                _lift_suspension(s)
                lifted = True
                print(f"[AUTO-LIFT JOB] Suspension {s['id']} lifted.")
        if lifted:
            socketio.emit('users_changed')   # an open IT Users page refreshes itself
    except Exception as e:
        print("[AUTO-LIFT JOB ERROR]:", e)


def suspended_response(susp):
    """Builds the 403 response the login screen shows, with the lift time in Philippine time."""
    reason = susp.get('reason') or "Community Guidelines Violation"
    if susp.get('suspended_until'):
        lift_display = format_pht(susp['suspended_until'])
    else:
        lift_display = 'Permanent, until reviewed by IT administration'
    return jsonify({
        'suspended': True,
        'is_suspended': True,
        'error': f"ACCOUNT SUSPENDED: {reason}",
        'reason': reason,
        'liftUntil': lift_display
    }), 403


def apply_user_suspension(user_id, email, reason, duration, custom_dt, notes, admin_username):
    """Single place that creates a suspension. Used by Manage Users AND Reports,
    so the suspension email is sent from here for both."""
    expiration_iso = calculate_suspension_expiration(duration, custom_dt)

    supabase.table('suspensions').update({'is_active': False}) \
        .eq('user_id', user_id).eq('is_active', True).execute()

    supabase.table('suspensions').insert({
        'user_id': user_id,
        'email': email,
        'reason': reason,
        'duration': duration,
        'internal_notes': notes,
        'suspended_until': expiration_iso,
        'is_active': True,
        'admin_username': admin_username
    }).execute()

    supabase.table('users').update({'status': 'Suspended'}).eq('id', user_id).execute()
    socketio.emit('users_changed')   # lets an open Manage Users page refresh

    lift_display = format_pht(expiration_iso) if expiration_iso else 'Permanent, until reviewed by IT administration'
    force_logout_user(email, reason, lift_display)

    # Email notice (background thread; never blocks or breaks the suspension)
    username = None
    try:
        u = supabase.table('users').select('username').eq('id', user_id).execute()
        username = u.data[0]['username'] if u.data else None
    except Exception:
        pass
    send_suspension_email(email, username, reason, lift_display)

    return expiration_iso


# ---------------------------------------------------------------------------
# Live enforcement helpers
# ---------------------------------------------------------------------------

def is_email_suspended(email):
    """Ang set ay cache lang. Kapag nandoon ang email, i-verify sa DB
    at linisin kung wala na palang active na suspension."""
    email_l = (email or '').strip().lower()
    if email_l not in suspended_emails:
        return False
    try:
        u = supabase.table('users').select('id').eq('email', email_l).execute()
        if u.data and get_active_suspension(u.data[0]['id']):
            return True
    except Exception as e:
        print("is_email_suspended check error:", e)
        return True   # kapag hindi ma-verify, huwag munang alisin
    suspended_emails.discard(email_l)
    return False


def preload_suspended_emails():
    """Fills the suspended-email cache from the DB. Call once at startup."""
    try:
        res = supabase.table('suspensions').select('email').eq('is_active', True).execute()
        suspended_emails.update((r.get('email') or '').strip().lower() for r in (res.data or []) if r.get('email'))
    except Exception as e:
        print("Could not preload suspended emails:", e)


def user_room(email):
    """Personal socket room ng user, para maabot siya kahit saang page."""
    return f"user:{(email or '').strip().lower()}"


def sids_for_user(email, username=None):
    email_l = (email or '').strip().lower()
    sids = {sid for sid, e in sid_email.items() if e == email_l}
    sids |= {sid for sid, info in online_users.items() if (info.get('email') or '') == email_l}
    if username:
        sids |= {sid for sid, (room, uname) in sid_to_room.items() if uname == username}
    return sids


def emit_to_user(email, event, payload, username=None):
    """Ipapadala sa LAHAT ng socket ng user. Returns kung ilang socket ang naabot."""
    sids = sids_for_user(email, username)
    for sid in sids:
        socketio.emit(event, payload, room=sid)
    return len(sids)


def find_report_target_user(details):
    username = (details.get('username') or details.get('reportedUsername') or details.get('sender') or '').strip()
    email = (details.get('email') or '').strip()
    q = supabase.table('users').select('id, email, username')
    if email:
        q = q.eq('email', email)
    elif username:
        q = q.eq('username', username)
    else:
        return None
    res = q.execute()
    return res.data[0] if res.data else None


def force_logout_user(email, reason, lift_display):
    email_l = (email or '').strip().lower()
    if not email_l:
        return
    suspended_emails.add(email_l)

    try:
        u = supabase.table('users').select('username').eq('email', email_l).execute()
        username = u.data[0]['username'] if u.data else None
    except Exception:
        username = None

    # 1. Sabihan MUNA ang lahat ng socket niya (bago siya tanggalin sa room maps)
    emit_to_user(email_l, 'account_suspended',
                 {'reason': reason, 'liftUntil': lift_display}, username)

    # 2. Tanggalin sa study room(s)
    if username:
        for sid, (room, uname) in list(sid_to_room.items()):
            if uname == username:
                sid_to_room.pop(sid, None)
        for room in list(room_members.keys()):
            before = len(room_members[room])
            room_members[room] = [m for m in room_members[room] if m['username'] != username]
            if len(room_members[room]) != before:
                socketio.emit('room_update', {
                    'members': room_members[room],
                    'logs': [new_log(username, 'left the room')]
                }, room=room)
                broadcast_room_counts(room)
                note_if_room_empty(room)

    # 3. Presence
    for sid, info in list(online_users.items()):
        if (info.get('email') or '') == email_l:
            online_users.pop(sid, None)
    broadcast_presence_to_admins()