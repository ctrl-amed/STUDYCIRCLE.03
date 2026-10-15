"""Real-time multiplayer: Socket.IO events for study rooms, timers, chat and WebRTC relay."""
import json
import time

from flask import request
from flask_socketio import emit, join_room, leave_room

from extensions import socketio, supabase
from services.rooms_service import (broadcast_room_counts, ensure_room_lifecycle_worker,
                                    get_live_count, is_room_closed, maybe_reset_stale_session,
                                    note_if_room_empty, sid_for_room_user)
from services.suspension import user_room
from config import SHARED_CLOSE_GRACE_SECONDS
from state import (active_room_sessions, room_close_at, room_empty_since, room_members,
                   room_warnings, session_participants, sid_email, sid_to_room, timer_states)
from utils.helpers import new_log, now_iso


@socketio.on('connect')
def _start_workers_on_connect():
    ensure_room_lifecycle_worker()


@socketio.on('join_room')
def on_join_room(data):
    room = data.get('room')
    username = data.get('username')
    avatar_config = data.get('avatar_config')
    status = data.get('status', 'ONLINE')
    level = data.get('level', 1)

    maybe_reset_stale_session(room)

    try:
        r = supabase.table('rooms').select('privacy, task_type, is_started, host, max_members, is_closed, status').eq('name', room).execute()
        if r.data:
            info = r.data[0]
            if is_room_closed(info):
                emit('room_join_rejected', {
                    'reason': 'This room has been suspended.' if info.get('status') == 'suspended'
                              else 'This room has been closed.'
                })
                return
            returning = any(m['username'] == username for m in room_members.get(room, []))
            was_in_session = username in session_participants.get(room, set())

            # Room full check
            if not returning and get_live_count(room) >= int(info.get('max_members') or 4):
                emit('room_join_rejected', {'reason': 'This room is already full.'})
                return

            shared = info.get('privacy') == 'private' and info.get('task_type') == 'shared'
            if (shared and info.get('is_started') and info.get('host') != username
                    and not returning and not was_in_session):
                emit('room_join_rejected', {'reason': 'This shared session has already started.'})
                return
    except Exception as e:
        print("Join check error:", e)

    room_empty_since.pop(room, None)

    join_room(room)
    sid_to_room[request.sid] = (room, username)

    if room not in room_members:
        room_members[room] = []

    user_email = ""
    db_avatar = avatar_config
    total_focus_formatted = "0h 00m"  # Default focus time if there's no history yet

    try:
        u_res = supabase.table('users').select('id, email, avatar_config, level').eq('username', username).execute()
        if u_res.data:
            user_id = u_res.data[0]['id']
            user_email = u_res.data[0].get('email', '')
            db_avatar = u_res.data[0].get('avatar_config')
            level = u_res.data[0].get('level', level)

            # Calculate the user's real total focus time using user_id
            sessions_res = supabase.table('study_sessions').select('duration_minutes').eq('user_id', user_id).execute()
            if sessions_res.data:
                total_minutes = sum(int(s.get('duration_minutes', 0)) for s in sessions_res.data)
                hours = total_minutes // 60
                mins = total_minutes % 60
                total_focus_formatted = f"{hours}h {mins:02d}m"

    except Exception as e:
        print("Error fetching user info:", e)

    # Personal room, so warnings / suspension reach this socket too.
    # (Multiplayer uses a second socket that never emits user_connected.)
    if user_email:
        sid_email[request.sid] = user_email.strip().lower()
        join_room(user_room(user_email))

    is_host = False
    room_cfg = None
    try:
        room_res = supabase.table('rooms').select('host').eq('name', room).execute()
        if room_res.data:
            host_username = room_res.data[0].get('host')
            if host_username == username:
                is_host = True

            host_user_res = supabase.table('users').select('room_config').eq('username', host_username).execute()
            if host_user_res.data:
                room_cfg = host_user_res.data[0].get('room_config')
    except Exception as e:
        print("Error verifying host status:", e)

    if isinstance(room_cfg, str):
        try:
            room_cfg = json.loads(room_cfg)
        except Exception:
            pass

    existing_user = next((m for m in room_members[room] if m['username'] == username), None)
    is_new = existing_user is None

    if existing_user:
        existing_user['status'] = status
        if db_avatar:
            existing_user['avatar_config'] = db_avatar
        existing_user['level'] = level
        existing_user['isHost'] = is_host
        existing_user['email'] = user_email
        existing_user['totalFocusTime'] = total_focus_formatted
    else:
        room_members[room].append({
            'id': username,
            'username': username,
            'email': user_email,
            'status': status,
            'avatar_config': db_avatar,
            'level': level,
            'isHost': is_host,
            'totalFocusTime': total_focus_formatted
        })

    # log only when it's a NEW member
    emit('room_update', {
        'members': room_members[room],
        'room_config': room_cfg,
        'active_session': active_room_sessions.get(room),
        'timer_state': timer_states.get(room),
        'server_now': now_iso(),
        'logs': [new_log(username, 'joined the room')] if is_new else []
    }, room=room)

    # Late joiner: show them the room warning that was issued earlier
    rw = room_warnings.get(room)
    if rw and time.time() - rw['ts'] < 3600 and username not in rw['seen']:
        rw['seen'].add(username)
        emit('room_warning', rw['payload'])   # only to the person who just joined

    broadcast_room_counts(room)


@socketio.on('request_join_private_room')
def handle_private_join_request(data):
    room_name = data.get('room')
    # Broadcast the incoming request only to that specific room
    emit('incoming_join_request', data, room=room_name)


@socketio.on('sync_timer')
def handle_sync_timer(data):
    room = data.get('room')
    emit('timer_update', data, room=room, include_self=False)


@socketio.on('update_status')
def on_update_status(data):
    room = data.get('room')
    username = data.get('username')
    status = data.get('status')

    if room in room_members:
        for m in room_members[room]:
            if m['username'] == username:
                m['status'] = status
        emit('room_update', {'members': room_members[room], 'logs': []}, room=room)


@socketio.on('leave_room')
def on_leave_room(data):
    """Removes the user from the in-memory room list and syncs everyone else."""
    room = data.get('room')
    username = data.get('username')

    leave_room(room)
    sid_to_room.pop(request.sid, None)

    if room in room_members:
        room_members[room] = [m for m in room_members[room] if m['username'] != username]
        emit('room_update', {
            'members': room_members[room],
            'logs': [new_log(username, 'left the room')]
        }, room=room)
        broadcast_room_counts(room)
        note_if_room_empty(room)


@socketio.on('send_room_message')
def on_send_room_message(data):
    """Broadcasts a chat message to everyone currently in the room."""
    room = data.get('room')
    # Broadcast to everyone in the room, including the sender
    emit('receive_room_message', data, room=room)


@socketio.on('request_join_room')
def handle_request_join_room(data):
    room_name = data.get('room')
    guest_username = data.get('username')

    # Broadcast specifically to that room, so only its members/host receive it
    emit('incoming_join_request', {
        'username': guest_username,
        'room': room_name
    }, room=room_name)


@socketio.on('host_room_response')
def handle_host_response(data):
    room_name = data.get('room')
    username = data.get('username')
    approved = data.get('approved')

    # Broadcast the decision back to the room / requesting user
    emit('join_request_decision', {
        'username': username,
        'approved': approved,
        'room': room_name
    }, broadcast=True)


# ---------------- WebRTC signalling relay ----------------

def _relay_webrtc(event, data):
    info = sid_to_room.get(request.sid)
    if not info or not isinstance(data, dict):
        return
    room, sender = info
    target_sid = sid_for_room_user(room, data.get('target'))
    if not target_sid or target_sid == request.sid:
        return
    payload = {'from': sender}
    for key in ('sdp', 'candidate'):
        if key in data:
            payload[key] = data[key]
    socketio.emit(event, payload, room=target_sid)


@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    _relay_webrtc('webrtc_offer', data)


@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    _relay_webrtc('webrtc_answer', data)


@socketio.on('webrtc_ice_candidate')
def handle_ice_candidate(data):
    _relay_webrtc('webrtc_ice_candidate', data)


@socketio.on('update_speaking_status')
def handle_speaking_status(data):
    room = data.get('room')
    username = data.get('username')
    is_speaking = data.get('isSpeaking')
    # Broadcast to everyone else in the room except the one who triggered it
    emit('member_speaking_update', {'username': username, 'isSpeaking': is_speaking}, room=room, include_self=False)


@socketio.on('kick_room_member')
def handle_kick_room_member(data):
    room = data.get('room')
    target_username = data.get('username')

    # Broadcast to the whole room (or the specific user) that they were kicked
    emit('kicked_from_room', {'username': target_username}, room=room)


# ---------------- Shared (synced) sessions ----------------

@socketio.on('start_shared_room')
def handle_start_shared_room(data):
    room_name = data.get('room')
    session = data.get('session')
    try:
        r = supabase.table('rooms').select('host').eq('name', room_name).execute()
        if not r.data or r.data[0].get('host') != data.get('username'):
            emit('room_join_rejected', {'reason': 'Only the host can start the session.'})
            return
    except Exception as e:
        print("Host check error:", e)
        return

    if room_name in active_room_sessions or not session:
        return  # already started (double click) or nothing to start

    if session:
        session = dict(session)
        session['startedAt'] = now_iso()
        active_room_sessions[room_name] = session

        # everyone in the room right now may leave and come back to this session
        session_participants[room_name] = {m['username'] for m in room_members.get(room_name, [])}

        try:
            focus_secs = int(session.get('focusTime') or 25) * 60
        except (TypeError, ValueError):
            focus_secs = 25 * 60
        timer_states[room_name] = {
            'isRunning': True,
            'isFocusPhase': True,
            'remainingSec': focus_secs,
            'currentSessionCount': 0,
            'updatedAt': session['startedAt'],
        }

    try:
        upd = {'is_started': True}
        if session:
            upd['technique'] = session.get('techniqueName')
            upd['focus_time'] = session.get('focusTime')
            upd['break_time'] = session.get('breakTime')
            upd['tasks'] = session.get('tasks', [])
        supabase.table('rooms').update(upd).eq('name', room_name).execute()
    except Exception as e:
        print("Room update error:", e)

    socketio.emit('shared_room_started', {
        'room': room_name,
        'session': session,
        'timer': timer_states.get(room_name),
        'serverNow': now_iso(),
    }, room=room_name)


@socketio.on('host_timer_update')
def handle_host_timer_update(data):
    """Only the host can pause / resume / change phase. Everyone else follows."""
    room = data.get('room')
    username = data.get('username')
    timer = data.get('timer') or {}

    if room not in active_room_sessions:
        return
    try:
        r = supabase.table('rooms').select('host').eq('name', room).execute()
        if not r.data or r.data[0].get('host') != username:
            return  # not the host: ignore
    except Exception as e:
        print("Host timer check error:", e)
        return

    try:
        state = {
            'isRunning': bool(timer.get('isRunning')),
            'isFocusPhase': bool(timer.get('isFocusPhase', True)),
            'remainingSec': max(0, int(timer.get('remainingSec') or 0)),
            'currentSessionCount': max(0, int(timer.get('currentSessionCount') or 0)),
            'updatedAt': now_iso(),
        }
    except (TypeError, ValueError):
        return

    timer_states[room] = state
    emit('timer_state', {'timer': state, 'serverNow': now_iso()}, room=room, include_self=False)


@socketio.on('request_timer_state')
def handle_request_timer_state(data):
    room = data.get('room')
    state = timer_states.get(room)
    if state:
        emit('timer_state', {'timer': state, 'serverNow': now_iso()})  # only to the requester


@socketio.on('shared_session_finished')
def handle_shared_session_finished(data):
    """Host says the whole synced session is done: give everyone a short grace
    period to leave, then the sweeper closes the room."""
    room = data.get('room')
    username = data.get('username')
    try:
        r = supabase.table('rooms').select('host, privacy, task_type').eq('name', room).execute()
        info = r.data[0] if r.data else None
        if not info or info.get('host') != username:
            return
        if not (info.get('privacy') == 'private' and info.get('task_type') == 'shared'):
            return
    except Exception as e:
        print("Finish check error:", e)
        return

    if room in room_close_at:
        return  # already scheduled

    room_close_at[room] = time.time() + SHARED_CLOSE_GRACE_SECONDS
    socketio.emit('room_closing', {
        'room': room,
        'seconds': SHARED_CLOSE_GRACE_SECONDS,
        'reason': 'Everyone has finished the session. This room will close soon, so you can leave now.',
    }, room=room)
