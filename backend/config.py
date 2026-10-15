"""Central configuration: environment variables and constants."""
import os
import re
import secrets

from dotenv import load_dotenv

load_dotenv()

# --- Gemini ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Model name can be changed without touching the code: set GEMINI_MODEL in .env / Render.
# If the terminal prints "Gemini rationale failed", set this to a model your API key supports.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# --- Database ---
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://your_local_fallback')
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_ANON_KEY")

# --- Google sign-in ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")   # optional but recommended (same ID as your frontend)

# --- Secret key (admin tokens + signup code hashing) ---
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)
    print("[WARNING] SECRET_KEY not set in .env. Admin tokens will reset on every server restart.")

# --- Admin auth ---
ADMIN_TOKEN_MAX_AGE = 60 * 60 * 8  # 8 hours
ADMIN_PASSWORD_REGEX = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$')
ADMIN_MAX_ATTEMPTS = 5
ADMIN_LOCK_SECONDS = 300

# --- Sign-up validation / verification ---
UMAK_EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@umak\.edu\.ph$', re.IGNORECASE)
STUDENT_ID_REGEX = re.compile(r'^[a-zA-Z]\d{8}$')
SIGNUP_CODE_TTL_MIN = 10        # a code works for 10 minutes
SIGNUP_CODE_MAX_ATTEMPTS = 5    # wrong guesses allowed per code
SIGNUP_RESEND_SECONDS = 60      # wait time between emails

# --- Default customization for new accounts ---
# Must match DEFAULT_AVATAR_CONFIG / DEFAULT_ROOM_CONFIG / DEFAULT_UNLOCKED_ITEMS in UserCustomizer.jsx
DEFAULT_AVATAR_CONFIG = {
    "body": "BODY1",
    "face": "FACE1",
    "tops": "TOP7",
    "bottoms": "BOTTOM6",
    "shoes": "",
    "hair": "",
    "accessories": "",
}
DEFAULT_ROOM_CONFIG = {"room": "ROOM1"}
DEFAULT_UNLOCKED_ITEMS = ["BODY1", "BODY2", "BODY3", "FACE1", "TOP7", "BOTTOM6", "ROOM1"]

# --- Warnings ---
WARNING_RESET_DAYS = 30      # warning count resets 30 days after the last warning
WARNING_DELIVER_DAYS = 7     # only re-deliver unseen warnings newer than this

# --- Study sessions ---
# Chapter 3: a session must last at least this many minutes to earn XP or coins.
MIN_SESSION_MINUTES = 25
# study_sessions.task_status values that count as a successful session (lowercase)
SUCCESS_STATUSES = {"completed", "early", "on-time", "on time"}

# --- Room lifecycle ---
INACTIVE_ROOM_MINUTES = 5
EMPTY_ROOM_GRACE_SECONDS = INACTIVE_ROOM_MINUTES * 60
SHARED_CLOSE_GRACE_SECONDS = 30

# --- Rewards ---
LEVEL_REWARD_TIERS = [1, 5, 10, 15, 20]

STREAK_REWARDS = {
    1:   {"coins": 5,   "xp": 0},
    3:   {"coins": 10,  "xp": 0},
    7:   {"coins": 20,  "xp": 0},
    14:  {"coins": 0,   "xp": 75},
    21:  {"coins": 0,   "xp": 100},
    30:  {"coins": 0,   "xp": 200},
    45:  {"coins": 100, "xp": 0},
    60:  {"coins": 120, "xp": 0},
    90:  {"coins": 150, "xp": 0},
    120: {"coins": 0,   "xp": 300},
    180: {"coins": 0,   "xp": 500},
    365: {"coins": 0,   "xp": 750},
}