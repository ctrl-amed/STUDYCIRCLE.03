"""Study rooms (HTTP side) and room history. Socket events live in sockets/rooms_socket.py."""
from datetime import datetime

from flask import Blueprint, jsonify, request

from extensions import socketio, supabase
from services.rooms_service import get_live_count, is_room_active, is_room_closed
from utils.helpers import PHT, _to_pht, parse_json_field

rooms_bp = Blueprint('rooms', __name__)


@rooms_bp.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        res = supabase.table('rooms').select('*').execute()
        rooms = [r for r in (res.data or []) if not is_room_closed(r)]   # closed / suspended = hidden
        for r in rooms:
            r['current_members'] = get_live_count(r['name'])
            r['is_active'] = is_room_active(r)
        return jsonify({'success': True, 'rooms': rooms}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@rooms_bp.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.get_json() or {}
    host = data.get('host')
    max_members = int(data.get('max_members', 4))

    try:
        # Enforce a 3-room limit only for group rooms (max_members > 1).
        # "Today" is Philippine (Manila) time.
        if max_members > 1:
            today = datetime.now(PHT).date()
            existing = supabase.table('rooms').select('*').eq('host', host).execute()
            today_rooms = [
                r for r in existing.data
                if (_to_pht(r.get('created_at')) or datetime.min.replace(tzinfo=PHT)).date() == today
                and (r.get('max_members') or 4) > 1
            ]

            if len(today_rooms) >= 3:
                return jsonify({'success': False, 'error': 'Room limit reached! You can only host a maximum of 3 group rooms per day.'}), 400

        # Payload matching the current columns on the rooms table
        room_payload = {
            "name": data.get('name'),
            "course": data.get('course', 'General Studies'),
            "host": host,
            "privacy": data.get('privacy', 'public'),
            "code": data.get('code'),
            "current_members": 0,  # nobody has actually joined yet, the host joins via socket
            "max_members": max_members,
            "task_type": data.get('task_type', 'individual'),
            "is_started": data.get('is_started', False),
            "technique": data.get('technique', 'Pomodoro'),
            "focus_time": data.get('focus_time', 25),
            "break_time": data.get('break_time', 5),
            "tasks": data.get('tasks', [])
        }

        res = supabase.table('rooms').insert(room_payload).execute()

        # Count this room on the host's profile (users.rooms_created).
        # Wrapped separately so a counter hiccup never fails the room creation itself.
        try:
            u = supabase.table('users').select('rooms_created').eq('username', host).execute()
            if u.data:
                supabase.table('users').update({
                    'rooms_created': int(u.data[0].get('rooms_created') or 0) + 1
                }).eq('username', host).execute()
        except Exception as counter_err:
            print("Could not increment rooms_created:", counter_err)

        # let every Rooms page / admin page refresh its list
        socketio.emit('rooms_changed')

        return jsonify({'success': True, 'room': res.data[0]}), 201

    except Exception as e:
        print("ROOM CREATION ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


@rooms_bp.route('/api/get-room-history', methods=['GET'])
def get_room_history():
    """History tab: rooms this user has studied in, with totals from THEIR OWN sessions only."""
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
    try:
        u_res = supabase.table('users').select('id').eq('email', email).execute()
        if not u_res.data:
            return jsonify({"success": True, "history": []}), 200
        user_id = u_res.data[0]['id']

        sess = supabase.table('study_sessions').select('*') \
            .eq('user_id', user_id).order('created_at', desc=True).execute().data or []
        sess = [s for s in sess if s.get('room_id') is not None]

        room_ids = list({s['room_id'] for s in sess})
        rooms = {}
        if room_ids:
            rr = supabase.table('rooms').select('*').in_('id', room_ids).execute().data or []
            rooms = {r['id']: r for r in rr}

        grouped = {}
        for s in sess:   # newest first, so the first row seen per room is its latest session
            r = rooms.get(s['room_id'])
            if not r:
                continue
            g = grouped.setdefault(r['id'], {
                'id': r['id'],
                'name': r['name'],
                'course': r.get('course') or 'General Studies',
                'host': r['host'],
                'privacy': (r.get('privacy') or 'public').lower(),
                'maxMembers': r.get('max_members') or 4,
                'technique': r.get('technique') or 'Pomodoro',
                'breakMinutesPerBreak': r.get('break_time') or 0,
                'focusMinutes': 0,
                'sessions': 0,
                'xp': 0.0,
                'coins': 0,
                'tasks': [],
                'lastAt': s.get('created_at'),
            })
            g['focusMinutes'] += int(s.get('duration_minutes') or 0)
            g['sessions'] += 1
            g['xp'] += float(s.get('exp_gained') or 0)
            g['coins'] += int(s.get('coins_gained') or 0)
            tl = parse_json_field(s.get('tasks_list'), []) or []
            for t in tl:
                if isinstance(t, dict):
                    g['tasks'].append({'text': t.get('text') or t.get('task') or '', 'completed': bool(t.get('completed'))})
                elif isinstance(t, str):
                    g['tasks'].append({'text': t, 'completed': False})

        history = list(grouped.values())
        for g in history:
            g['xp'] = int(round(g['xp']))
            # estimate: one break of the room's break length per completed session
            g['breakMinutes'] = g['breakMinutesPerBreak'] * g['sessions']
        history.sort(key=lambda g: g['lastAt'] or '', reverse=True)

        return jsonify({"success": True, "history": history}), 200
    except Exception as e:
        print("GET ROOM HISTORY ERROR:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500
