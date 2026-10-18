"""Real-time presence tracking for the IT admin dashboard."""
from extensions import socketio
from state import online_users


def get_current_presence_summary():
    """Calculates active online and currently studying counts."""
    active_emails = set()
    studying_emails = set()

    for info in online_users.values():
        em = (info.get('email') or '').lower()
        if em:
            active_emails.add(em)
            if info.get('status') == 'STUDYING':
                studying_emails.add(em)

    return {
        "active_users_count": len(active_emails),
        "currently_studying_count": len(studying_emails),
        "online_map": {info['email'].lower(): info['status'] for info in online_users.values() if info.get('email')}
    }


def broadcast_presence_to_admins():
    """Broadcasts real-time counts and user states to IT Admin clients."""
    summary = get_current_presence_summary()
    socketio.emit('admin_presence_update', summary)
