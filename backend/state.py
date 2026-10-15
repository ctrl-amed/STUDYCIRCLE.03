"""In-memory runtime state shared by routes, services and socket handlers.
These dicts/sets are only ever mutated in place, never reassigned."""

# --- Suspensions / warnings / sockets ---
suspended_emails = set()   # lowercase emails that are currently suspended (cache)
sid_email = {}             # socket id -> lowercase email (all sockets of a user)
pending_warnings = {}      # email -> [payload] for warnings that were not delivered
room_warnings = {}         # room -> {'payload', 'ts', 'seen': set(usernames)}

# --- Study rooms ---
active_room_sessions = {}
room_members = {}
timer_states = {}          # room -> host's latest timer snapshot
session_participants = {}  # room -> usernames allowed to (re)join a started shared session
room_empty_since = {}      # room -> when the last person left
sid_to_room = {}           # socket id -> (room, username)
room_close_at = {}         # private-shared room -> time.time() when it will be closed
room_hosts = {}            # pending join requests / room -> host mapping

# --- Presence (IT admin dashboard) ---
# { socket_id: {"email": str, "status": "ONLINE" | "STUDYING"} }
online_users = {}
