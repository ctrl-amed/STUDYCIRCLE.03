"""Study-room lifecycle.

Room lifecycle:
  active   = at least one person is inside
  inactive = nobody inside (still visible to players)
  closed   = hidden from players. A room closes when:
               - public / private-individual: empty for 5 minutes
               - private-shared: the host's synced session finished, after a
                 short grace period (SHARED_CLOSE_GRACE_SECONDS) so players can leave
                 (a shared room that stays empty for 5 minutes also closes)
"""
import time
from datetime import datetime

import config
from extensions import socketio, supabase
from state import (active_room_sessions, room_close_at, room_empty_since,
                   room_members, session_participants, sid_to_room, timer_states)
from utils.helpers import now_iso


def is_room_closed(room):
    return bool(room.get('is_closed')) or room.get('status') in ('suspended', 'closed')


def get_live_count(room_name):
    return len(room_members.get(room_name, []))


def is_room_active(room):
    """Active = someone is inside. Inactive = empty but not closed yet."""
    return get_live_count(room.get('name')) > 0


def note_if_room_empty(room):
    if not room_members.get(room):
        room_empty_since[room] = time.time()


def maybe_reset_stale_session(room):
    """If a room has been empty for a while, forget its finished session."""
    if room_members.get(room):
        return
    since = room_empty_since.get(room)
    if since and time.time() - since > config.EMPTY_ROOM_GRACE_SECONDS:
        active_room_sessions.pop(room, None)
        timer_states.pop(room, None)
        session_participants.pop(room, None)
        room_empty_since.pop(room, None)
        try:
            supabase.table('rooms').update({'is_started': False}).eq('name', room).execute()
        except Exception as e:
            print("Could not reset room:", e)


def broadcast_room_counts(room_name=None):
    """Pushes the live member count of every room to all connected clients,
    and keeps rooms.current_members in the database in sync."""
    counts = {name: len(m) for name, m in room_members.items()}
    socketio.emit('rooms_counts', counts)
    if room_name:
        try:
            supabase.table('rooms').update(
                {'current_members': get_live_count(room_name)}
            ).eq('name', room_name).execute()
        except Exception as e:
            print("Could not sync room count:", e)


def sid_for_room_user(room, username):
    """Newest live socket of this username in this room."""
    found = None
    for sid, (r, u) in sid_to_room.items():
        if r == room and u == username:
            found = sid
    return found


# ---- Room closing ----------------------------------------------------------

def room_empty_for(room_row):
    """Seconds this room has had nobody inside."""
    name = room_row.get('name')
    since = room_empty_since.get(name)
    if since is None:  # nobody ever joined: count from creation
        try:
            since = datetime.fromisoformat(str(room_row.get('created_at')).replace('Z', '+00:00')).timestamp()
        except Exception:
            since = time.time()  # can't tell, so don't close
    return time.time() - since


def _forget_room(room_name):
    for store in (room_members, active_room_sessions, timer_states,
                  session_participants, room_empty_since, room_close_at):
        store.pop(room_name, None)


def close_room(room_name, reason):
    """Marks the room closed (hidden from players) and tells everyone inside."""
    try:
        supabase.table('rooms').update({
            'is_closed': True,
            'status': 'closed',
            'closed_reason': reason,
            'closed_at': now_iso(),
            'current_members': 0,
        }).eq('name', room_name).execute()
    except Exception as e:
        print("Could not close room:", e)
        return

    socketio.emit('room_closed', {'room': room_name, 'reason': reason}, room=room_name)
    _forget_room(room_name)
    socketio.emit('rooms_changed')
    print(f"[ROOM CLOSED] {room_name}: {reason}")


def suspend_room(room_name, reason):
    """Isang lugar para sa pag-close ng room ng admin (Reports at Manage Rooms)."""
    supabase.table('rooms').update({
        'is_closed': True,
        'status': 'suspended',
        'closed_reason': reason,
        'closed_at': now_iso(),
        'current_members': 0,
    }).eq('name', room_name).execute()

    socketio.emit('room_closed', {
        'room': room_name,
        'reason': f"This room was closed by an administrator. Reason: {reason}"
    }, room=room_name)

    _forget_room(room_name)
    socketio.emit('rooms_changed')


def sweep_rooms():
    res = supabase.table('rooms').select('name, created_at, status').eq('is_closed', False).execute()
    now = time.time()
    for r in (res.data or []):
        if r.get('status') in ('suspended', 'closed'):
            continue
        name = r['name']
        live = get_live_count(name)

        # Private-shared room whose session already finished
        if name in room_close_at:
            if live == 0 or now >= room_close_at[name]:
                close_room(name, 'The session has ended, so this room is now closed.')
            continue

        if live > 0:
            continue

        # Public / private-individual (and abandoned shared rooms): empty for 5 min -> closed
        if room_empty_for(r) >= config.EMPTY_ROOM_GRACE_SECONDS:
            close_room(name, 'This room was closed after 5 minutes without anyone inside.')


def room_lifecycle_loop():
    while True:
        socketio.sleep(10)
        try:
            sweep_rooms()
        except Exception as e:
            print("Room sweep error:", e)


# Started lazily on the first request/connection. With debug=True this file runs
# twice (a watcher process and the real server); only the real server knows who is
# inside a room, so only it may sweep. The watcher never receives requests.
_lifecycle_started = False


def ensure_room_lifecycle_worker():
    global _lifecycle_started
    if not _lifecycle_started:
        _lifecycle_started = True
        socketio.start_background_task(room_lifecycle_loop)
