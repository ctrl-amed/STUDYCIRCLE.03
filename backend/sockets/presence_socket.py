"""Socket events for user presence, warning acknowledgements and disconnect cleanup."""
from flask import request
from flask_socketio import emit, join_room

from extensions import socketio, supabase
from services.presence import broadcast_presence_to_admins
from services.rooms_service import broadcast_room_counts, note_if_room_empty
from services.suspension import get_pending_warnings, is_email_suspended, user_room
from state import online_users, room_members, sid_email, sid_to_room
from utils.helpers import new_log, parse_json_field


@socketio.on('ack_warning')
def handle_ack_warning(data):
    email = (data.get('email') or '').strip()
    rid = data.get('reportId')
    if not email or not rid:
        return
    try:
        u = supabase.table('users').select('id, inventory').eq('email', email).execute()
        if not u.data:
            return
        inv = parse_json_field(u.data[0].get('inventory'), []) or []
        key = f"warn_seen_{rid}"
        if key not in inv:
            inv.append(key)
            supabase.table('users').update({'inventory': inv}).eq('id', u.data[0]['id']).execute()
    except Exception as e:
        print("ack_warning error:", e)


@socketio.on('user_connected')
def handle_user_connected(data):
    email = (data.get('email') or '').strip().lower()
    if not email:
        return
    sid_email[request.sid] = email
    join_room(user_room(email))

    if is_email_suspended(email):
        emit('account_suspended', {'reason': 'Community Guidelines Violation',
                                   'liftUntil': 'Please log in again for details.'})
        return

    online_users[request.sid] = {'email': email, 'status': 'ONLINE'}
    try:
        supabase.table('users').update({'status': 'online'}).eq('email', email).execute()
    except Exception:
        pass
    broadcast_presence_to_admins()

    for w in get_pending_warnings(email):
        emit('account_warning', w)


@socketio.on('user_start_session')
def handle_user_start_session(data):
    email = (data.get('email') or '').strip().lower()
    if not email and request.sid in online_users:
        email = online_users[request.sid]['email']
    if email:
        online_users[request.sid] = {'email': email, 'status': 'STUDYING'}
        try:
            supabase.table('users').update({'status': 'studying'}).eq('email', email).execute()
        except Exception:
            pass
        broadcast_presence_to_admins()


@socketio.on('user_end_session')
def handle_user_end_session(data):
    email = (data.get('email') or '').strip().lower()
    if not email and request.sid in online_users:
        email = online_users[request.sid]['email']
    if email:
        online_users[request.sid] = {'email': email, 'status': 'ONLINE'}
        try:
            supabase.table('users').update({'status': 'online'}).eq('email', email).execute()
        except Exception:
            pass
        broadcast_presence_to_admins()


@socketio.on('disconnect')
def handle_disconnect():

    # --- 1. Remove the user from their study room if the tab was closed ---
    sid_email.pop(request.sid, None)
    info = sid_to_room.pop(request.sid, None)
    if info:
        room, username = info
        # only remove if this user has no other live socket in the same room
        still_in_room = any(v == info for v in sid_to_room.values())
        if not still_in_room and room in room_members:
            room_members[room] = [m for m in room_members[room] if m['username'] != username]
            socketio.emit('room_update', {
                'members': room_members[room],
                'logs': [new_log(username, 'left the room')]
            }, room=room)
            broadcast_room_counts(room)
            note_if_room_empty(room)

    # --- 2. Presence tracking for the IT admin dashboard ---
    if request.sid in online_users:
        user_info = online_users.pop(request.sid)
        email = user_info.get('email')
        still_open = any(u.get('email') == email for u in online_users.values())
        if not still_open and email:
            try:
                supabase.table('users').update({'status': 'offline'}).eq('email', email).execute()
            except Exception:
                pass
        broadcast_presence_to_admins()
