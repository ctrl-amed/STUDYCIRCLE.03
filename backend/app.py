from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, timezone
import json
import google.generativeai as genai
from flask_socketio import SocketIO, join_room, leave_room, emit
from pypdf import PdfReader
import uuid
import re
import time
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from functools import wraps

# =============================================================================
# APP CONFIGURATION & SETUP
# =============================================================================

load_dotenv()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)
bcrypt = Bcrypt(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Pulled from Render/Environment, falls back to a local default if not set
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://your_local_fallback')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Email configuration (replace with your actual mail server credentials)
# Mail setup using environment variables
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['DEFAULT_MAIL_SENDER'] = os.getenv('DEFAULT_MAIL_SENDER', f"StudyCircle <{os.getenv('MAIL_USERNAME')}>")

mail = Mail(app)


# =============================================================================
# SHARED HELPERS
# =============================================================================

def parse_json_field(value, default=None):
    """
    jsonb columns can come back as a dict/list OR as a JSON string (because
    update_customization stores them with json.dumps). This handles both.
    """
    if value is None:
        return default
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return default
    return value


# =============================================================================
# ADMIN AUTH HELPERS
# =============================================================================

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)
    print("[WARNING] SECRET_KEY not set in .env. Admin tokens will reset on every server restart.")

token_serializer = URLSafeTimedSerializer(SECRET_KEY)
ADMIN_TOKEN_MAX_AGE = 60 * 60 * 8  # 8 hours
ADMIN_PASSWORD_REGEX = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$')

# Lock an admin account for 5 min after 5 wrong passwords (in memory)
ADMIN_MAX_ATTEMPTS = 5
ADMIN_LOCK_SECONDS = 300
admin_login_attempts = {}


def _admin_locked(email):
    rec = admin_login_attempts.get(email)
    if not rec:
        return False
    if rec['locked_until'] > time.time():
        return True
    if rec['locked_until']:
        admin_login_attempts.pop(email, None)
    return False


def _admin_fail(email):
    rec = admin_login_attempts.setdefault(email, {'count': 0, 'locked_until': 0})
    rec['count'] += 1
    if rec['count'] >= ADMIN_MAX_ATTEMPTS:
        rec['locked_until'] = time.time() + ADMIN_LOCK_SECONDS


def require_admin(allow_pending=False, super_only=False):
    """Protects a route. Reads the Bearer token, re-checks the admin in the DB
    (so deactivating a professor takes effect immediately), and sets request.admin."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
            try:
                payload = token_serializer.loads(token, max_age=ADMIN_TOKEN_MAX_AGE)
            except (BadSignature, SignatureExpired):
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401

            res = supabase.table('admins') \
                .select('id, username, full_name, role, is_active, must_change_password') \
                .eq('id', payload.get('id')).execute()
            admin = res.data[0] if res.data else None

            if not admin or not admin['is_active']:
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            if admin['must_change_password'] and not allow_pending:
                return jsonify({'success': False, 'error': 'Password change required.', 'mustChangePassword': True}), 403
            if super_only and admin['role'] != 'super_admin':
                return jsonify({'success': False, 'error': 'Forbidden'}), 403

            request.admin = admin
            return f(*args, **kwargs)
        return wrapper
    return decorator


def calculate_level_from_total_xp(total_xp):
    """
    Works out a user's Level (1-50) and the XP needed for their next level,
    based on total accumulated XP.
    One single function that turns "total XP" into "Level + XP needed for next
    level". Every endpoint that needs to know a user's level calls this same
    function, so a user's level can never disagree between different parts of
    the app.
    """
    level = 1
    cumulative = 0
    for l in range(1, 51):
        cost = int(100 * (l ** 1.5))
        if total_xp >= cumulative:
            level = l
        cumulative += cost

    running_total = 0
    for l in range(1, level + 1):
        running_total += int(100 * (l ** 1.5))
    next_level_xp = running_total

    return level, next_level_xp


# =============================================================================
# STREAK FREEZE HELPER
# Ensures every user has exactly one row in streak_freezes_inventory. Called
# right after a new account is created (signup / google-signup).
# =============================================================================

def ensure_streak_freeze_row(user_id):
    try:
        existing = supabase.table('streak_freezes_inventory').select('user_id').eq('user_id', user_id).execute()
        if not existing.data:
            supabase.table('streak_freezes_inventory').insert({
                "user_id": user_id,
                "freezes_count": 1,
                "max_slots": 2
            }).execute()
    except Exception as e:
        print("Could not create streak freeze row:", e)

# =============================================================================
# REPORTS
# =============================================================================

@app.route('/api/reports', methods=['POST'])
def create_report():
    data = request.json or {}
    try:
        response = supabase.table('reports').insert({
            "reporter_username": data.get('reporter_username'), # Changed from reporter_email
            "target_type": data.get('target_type'),       # 'room', 'user', or 'message'
            "target_details": data.get('target_details'), # JSON details object
            "reason": data.get('reason'),
            "additional_notes": data.get('additional_notes', ''),
            "status": "pending"
        }).execute()
        return jsonify({"success": True, "report": response.data[0]}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/itadmin/reports', methods=['GET'])
@require_admin()
def admin_get_reports():
    try:
        response = supabase.table('reports').select('*').order('created_at', desc=True).execute()
        return jsonify({"success": True, "reports": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/itadmin/reports/<report_id>', methods=['PATCH'])
@require_admin()
def admin_update_report(report_id):
    data = request.json or {}
    status = data.get('status') # 'resolved' or 'closed'
    action_taken = data.get('actionTaken')
    reason = data.get('reason')
    notes = data.get('notes') or data.get('actionNotes') or data.get('additionalNotes')
    suspension_duration = data.get('suspensionDuration')

    if not status:
        return jsonify({"success": False, "error": "Status is required."}), 400

    try:
        # Fetch the report target type + details to validate server-side rules
        rep_res = supabase.table('reports').select('target_type, target_details').eq('id', report_id).execute()
        rep_row = rep_res.data[0] if rep_res.data else {}
        target_type = rep_row.get('target_type')

        # Enforce rule: Rooms, dismissals, and warnings must ALWAYS have a NULL suspension duration
        is_suspend_action = action_taken and 'Suspend' in action_taken
        is_message_or_user = target_type in ['message', 'user']

        if target_type == 'room' or not (is_suspend_action and is_message_or_user):
            suspension_duration = None

        # Update Supabase record. The admin name comes from the login token, not the frontend.
        update_payload = {
            "status": status,
            "action_taken": action_taken,
            "reason": reason,
            "action_notes": notes,
            "suspension_duration": suspension_duration,
            "admin_username": request.admin['username']
        }

        response = supabase.table('reports').update(update_payload).eq('id', report_id).execute()

        # ---- NEW: a suspend action on a user/message report creates a real suspension ----
        if is_suspend_action and is_message_or_user:
            details = parse_json_field(rep_row.get('target_details'), {}) or {}
            target_username = (details.get('username') or details.get('reportedUsername')
                               or details.get('sender') or '').strip()
            target_email = (details.get('email') or '').strip()

            q = supabase.table('users').select('id, email')
            if target_email:
                q = q.eq('email', target_email)
            elif target_username:
                q = q.eq('username', target_username)
            else:
                q = None

            u_res = q.execute() if q is not None else None
            if u_res and u_res.data:
                raw_dur = data.get('suspensionDuration') or '24 Hours / 1 Day'
                custom_dt = None
                duration_label = raw_dur
                if raw_dur.startswith('Custom'):
                    duration_label = 'Custom Date/Time'
                    custom_dt = raw_dur.split(':', 1)[1].strip() if ':' in raw_dur else None

                apply_user_suspension(
                    u_res.data[0]['id'], u_res.data[0]['email'],
                    reason or 'Community Guidelines Violation',
                    duration_label, custom_dt, notes or '',
                    request.admin['username']
                )
            else:
                print(f"[REPORT SUSPEND] Could not find target user for report {report_id}: {details}")

        if target_type == 'room' and action_taken and re.search(r'suspend|close', action_taken, re.I):
            details = parse_json_field(rep_row.get('target_details'), {}) or {}
            room_name = details.get('roomName')
            if room_name:
                supabase.table('rooms').update({
                    'is_closed': True,
                    'status': 'suspended',
                    'closed_reason': reason or 'Community Guidelines Violation',
                    'closed_at': now_iso()
                }).eq('name', room_name).execute()
                # kick everyone currently inside + refresh lists
                socketio.emit('room_closed', {'room': room_name, 'reason': 'This room has been suspended by an administrator.'}, room=room_name)
                socketio.emit('rooms_changed')

        return jsonify({"success": True, "message": "Report updated successfully", "report": response.data}), 200
    except Exception as e:
        print("ERROR UPDATING REPORT:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

# =============================================================================
# SUSPENSION HELPERS
# =============================================================================

# Philippine Standard Time definition (UTC+8)
PHT = timezone(timedelta(hours=8))

def calculate_suspension_expiration(duration_str, custom_datetime_str=None):
    """
    Calculates an exact ISO timestamp when suspension expires in UTC.
    Interprets HTML datetime-local input as Philippine Time (UTC+8)
    and stores it in standard UTC for reliable database comparisons.
    """
    now = datetime.now(timezone.utc)

    if duration_str == 'Custom Date/Time' and custom_datetime_str:
        try:
            # <input type="datetime-local" /> produces "YYYY-MM-DDTHH:MM" without timezone.
            # Treat as Philippine Time (UTC+8) and convert to UTC
            dt = datetime.fromisoformat(custom_datetime_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=PHT)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception as e:
            print("Custom datetime parse error:", e)
            return (now + timedelta(days=1)).isoformat()

    durations = {
        '24 Hours / 1 Day': timedelta(days=1),
        '3 Days': timedelta(days=3),
        '7 Days / 1 Week': timedelta(days=7),
        '14 Days / 2 Weeks': timedelta(days=14),
        '30 Days / 1 Month': timedelta(days=30),
        '90 Days / 3 Months': timedelta(days=90),
    }

    if duration_str in durations:
        return (now + durations[duration_str]).isoformat()
    elif duration_str == 'Permanent / Indefinite':
        return None  # Permanent / Indefinite

    return (now + timedelta(days=1)).isoformat()


def get_active_suspension(user_id):
    """
    Checks the 'suspensions' table for any active suspension for this user.
    If a suspension has passed its expiration time, it automatically deactivates it.
    Returns: suspension record dict if actively suspended, None if free to log in.
    """
    try:
        res = supabase.table('suspensions') \
            .select('*') \
            .eq('user_id', user_id) \
            .eq('is_active', True) \
            .order('created_at', desc=True) \
            .limit(1) \
            .execute()

        if not res.data:
            return None

        suspension = res.data[0]
        suspended_until_str = suspension.get('suspended_until')

        # If permanent (no end date), they remain suspended
        if not suspended_until_str:
            return suspension

        # Ensure safe timezone-aware comparison
        suspended_until = datetime.fromisoformat(suspended_until_str.replace('Z', '+00:00'))
        if suspended_until.tzinfo is None:
            suspended_until = suspended_until.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)

        if now >= suspended_until:
            # AUTO-LIFT: Mark suspension as inactive in the suspensions table
            supabase.table('suspensions').update({'is_active': False}).eq('id', suspension['id']).execute()
            # Update user status back to offline
            supabase.table('users').update({'status': 'offline'}).eq('id', user_id).execute()
            print(f"[AUTO-LIFT] Suspension expired for user ID {user_id}. Restored access.")
            return None

        return suspension
    except Exception as e:
        print("Error checking suspension table:", e)
        return None

def apply_user_suspension(user_id, email, reason, duration, custom_dt, notes, admin_username):
    """Single place that creates a suspension. Used by Manage Users AND Reports."""
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
    return expiration_iso

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.route('/')
def home():
    return jsonify({"status": "success", "message": "StudyCircle Backend is live and running!"}), 200


# =============================================================================
# AUTHENTICATION (signup, Google signup, login, password reset)
# =============================================================================

UMAK_EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@umak\.edu\.ph$', re.IGNORECASE)
STUDENT_ID_REGEX = re.compile(r'^[a-zA-Z]\d{8}$')

def is_umak_email(email):
    return bool(email) and bool(UMAK_EMAIL_REGEX.match(email.strip()))

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    student_id = data.get('student_id')
    password = data.get('password')

    if not username or not email or not password or not student_id:
        return jsonify({'error': 'Please provide all required fields.'}), 400

    email = email.strip()
    student_id = student_id.strip()

    if not is_umak_email(email):
        return jsonify({'error': 'You must sign up with a valid @umak.edu.ph email.', 'field': 'email'}), 400

    if not STUDENT_ID_REGEX.match(student_id):
        return jsonify({'error': 'Invalid student ID format.', 'field': 'student_id'}), 400

    try:
        existing_email = supabase.table('users').select('*').eq('email', email).execute()
        if existing_email.data:
            return jsonify({'error': 'This email is already registered.', 'field': 'email'}), 400

        existing_username = supabase.table('users').select('*').eq('username', username).execute()
        if existing_username.data:
            return jsonify({'error': 'Username is already taken.', 'field': 'username'}), 400

        existing_student_id = supabase.table('users').select('*').eq('student_id', student_id).execute()
        if existing_student_id.data:
            return jsonify({'error': 'This student ID is already registered.', 'field': 'student_id'}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        response = supabase.table('users').insert({
            "username": username,
            "email": email,
            "student_id": student_id,
            "password": hashed_password,
            "coins": 100,
            "streak": 0,
            "inventory": [],
            "status": "offline",
            "max_xp": 100,
        }).execute()

        created_user = response.data[0] if response.data else {}

        if created_user.get('id'):
            ensure_streak_freeze_row(created_user['id'])

        inv_data = created_user.get('inventory')
        if isinstance(inv_data, str):
            inv_data = json.loads(inv_data)

        return jsonify({
            'message': 'User created successfully!',
            'user': {
                'username': created_user.get('username', username),
                'email': created_user.get('email', email),
                'studentId': created_user.get('student_id', student_id),
                'coins': created_user.get('coins', 100),
                'streak': created_user.get('streak', 0),
                'bestStreak': created_user.get('best_streak') or 0,
                'roomsCreated': created_user.get('rooms_created') or 0,
                'currentXP': created_user.get('current_xp', 0),
                'maxXP': created_user.get('max_xp', 100),
                'level': created_user.get('level', 1),
                'inventory': inv_data or [],
                # explicit nulls so a new account never inherits the previous
                # account's avatar / room / owned items in the browser
                'avatarConfig': None,
                'roomConfig': None,
                'unlockedItems': None
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/google-signup', methods=['POST'])
def google_signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    student_id = data.get('student_id')
    google_id = data.get('google_id')

    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    email = email.strip()

    if not is_umak_email(email):
        return jsonify({'error': 'You must sign in with a valid @umak.edu.ph email.'}), 400

    try:
        existing_user = supabase.table('users').select('*').eq('email', email).execute()

        if existing_user.data:
            user = existing_user.data[0]

            # --- CHECK ACTIVE SUSPENSION ---
            active_susp = get_active_suspension(user['id'])
            if active_susp:
                reason = active_susp.get('reason') or "Community Guidelines Violation"
                suspended_until = active_susp.get('suspended_until')
                lift_display = active_susp.get('duration') or 'Until reviewed by IT administration'
                if suspended_until:
                    try:
                        dt = datetime.fromisoformat(suspended_until.replace('Z', '+00:00'))
                        lift_display = dt.strftime('%B %d, %Y at %I:%M %p UTC')
                    except Exception:
                        lift_display = suspended_until

                return jsonify({
                    'suspended': True,
                    'is_suspended': True,
                    'error': f"ACCOUNT SUSPENDED: {reason}",
                    'reason': reason,
                    'liftUntil': lift_display
                }), 403

            raw_inv = user.get('inventory')
            if isinstance(raw_inv, str):
                raw_inv = json.loads(raw_inv)

            return jsonify({
                'message': 'Login successful!',
                'user': {
                    'username': user['username'],
                    'email': user['email'],
                    'studentId': user.get('student_id'),
                    'coins': user.get('coins', 100),
                    'streak': user.get('streak', 0),
                    'bestStreak': user.get('best_streak') or 0,
                    'roomsCreated': user.get('rooms_created') or 0,
                    'currentXP': user.get('current_xp', 0),
                    'maxXP': user.get('max_xp', 100),
                    'level': user.get('level', 1),
                    'inventory': raw_inv or [],
                    'avatarConfig': parse_json_field(user.get('avatar_config')),
                    'roomConfig': parse_json_field(user.get('room_config')),
                    'unlockedItems': parse_json_field(user.get('unlocked_items'))
                }
            }), 200

        if not username or not student_id:
            return jsonify({'needs_username': True}), 200

        student_id = student_id.strip()

        if not STUDENT_ID_REGEX.match(student_id):
            return jsonify({'error': 'Invalid student ID format.', 'field': 'student_id'}), 400

        existing_student_id = supabase.table('users').select('*').eq('student_id', student_id).execute()
        if existing_student_id.data:
            return jsonify({'error': 'This student ID is already registered.', 'field': 'student_id'}), 400

        dummy_password = bcrypt.generate_password_hash(google_id or 'google_secure_pass').decode('utf-8')

        response = supabase.table('users').insert({
            "username": username,
            "email": email,
            "student_id": student_id,
            "password": dummy_password,
            "coins": 100,
            "streak": 0,
            "inventory": [],
            "status": "offline",
            "max_xp": 100,
        }).execute()

        created_user = response.data[0] if response.data else {}

        if created_user.get('id'):
            ensure_streak_freeze_row(created_user['id'])

        raw_inv = created_user.get('inventory')
        if isinstance(raw_inv, str):
            raw_inv = json.loads(raw_inv)

        return jsonify({
            'message': 'Google account registered successfully!',
            'user': {
                'username': created_user.get('username', username),
                'email': created_user.get('email', email),
                'studentId': created_user.get('student_id', student_id),
                'coins': created_user.get('coins', 100),
                'streak': created_user.get('streak', 0),
                'bestStreak': created_user.get('best_streak') or 0,
                'roomsCreated': created_user.get('rooms_created') or 0,
                'currentXP': created_user.get('current_xp', 0),
                'maxXP': created_user.get('max_xp', 100),
                'level': created_user.get('level', 1),
                'inventory': raw_inv or [],
                'avatarConfig': None,
                'roomConfig': None,
                'unlockedItems': None
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Please provide email and password.'}), 400

    try:
        response = supabase.table('users').select('*').eq('email', email.strip()).execute()
        users = response.data

        if not users:
            return jsonify({'error': 'Invalid email or password.'}), 401

        user = users[0]

        # --- CHECK ACTIVE SUSPENSION FROM 'suspensions' TABLE ---
        active_susp = get_active_suspension(user['id'])
        if active_susp:
            reason = active_susp.get('reason') or "Community Guidelines Violation"
            suspended_until = active_susp.get('suspended_until')

            lift_display = active_susp.get('duration') or 'Until reviewed by IT administration'
            if suspended_until:
                try:
                    dt = datetime.fromisoformat(suspended_until.replace('Z', '+00:00'))
                    lift_display = dt.strftime('%B %d, %Y at %I:%M %p UTC')
                except Exception:
                    lift_display = suspended_until

            return jsonify({
                'suspended': True,
                'is_suspended': True,
                'error': f"ACCOUNT SUSPENDED: {reason}",
                'reason': reason,
                'liftUntil': lift_display
            }), 403

        # Normal password check
        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid email or password.'}), 401

        raw_inv = user.get('inventory')
        if isinstance(raw_inv, str):
            raw_inv = json.loads(raw_inv)

        return jsonify({
            'message': 'Login successful!',
            'user': {
                'username': user['username'],
                'email': user['email'],
                'studentId': user.get('student_id'),
                'coins': user.get('coins', 100),
                'streak': user.get('streak', 0),
                'bestStreak': user.get('best_streak') or 0,
                'roomsCreated': user.get('rooms_created') or 0,
                'currentXP': user.get('current_xp', 0),
                'maxXP': user.get('max_xp', 100),
                'level': user.get('level', 1),
                'inventory': raw_inv or [],
                'avatarConfig': parse_json_field(user.get('avatar_config')),
                'roomConfig': parse_json_field(user.get('room_config')),
                'unlockedItems': parse_json_field(user.get('unlocked_items'))
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Please provide an email address.'}), 400

    try:
        # Check if the email exists in the Supabase database
        response = supabase.table('users').select('*').eq('email', email).execute()

        if not response.data:
            return jsonify({'error': 'Email address not found in our system.'}), 404

        user = response.data[0]
        username = user.get('username', 'User')

        # Generate a secure random token for the password reset and save it to Supabase
        reset_token = secrets.token_urlsafe(32)
        supabase.table('users').update({'reset_token': reset_token}).eq('email', email).execute()

        reset_link = f"http://localhost:5173/changepassword?token={reset_token}"

        # Email configuration using Gmail SMTP
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")

        # Build the email message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = "Password Reset Request - StudyCircle"

        email_body = f"""
Hello {username},

We received a request to reset your StudyCircle password.

Click the link below to reset your password:
{reset_link}

This link expires in 15 minutes.

If you didn't request this, simply ignore this email.

- StudyCircle Team
        """
        msg.attach(MIMEText(email_body, 'plain'))

        # Send the email via Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, email, msg.as_string())
        server.quit()

        return jsonify({
            'message': 'Password reset link sent successfully to your email!',
            'reset_link': reset_link
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required.'}), 400

    try:
        # Check if the token is valid
        response = supabase.table('users').select('*').eq('reset_token', token).execute()

        if not response.data:
            return jsonify({'error': 'Invalid or expired reset token.'}), 400

        user_email = response.data[0]['email']

        # Hash the new password securely
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')

        # Update the password and clear the reset token
        supabase.table('users').update({
            'password': hashed_password,
            'reset_token': None
        }).eq('email', user_email).execute()

        return jsonify({'message': 'Password successfully updated!'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/change-password-direct', methods=['POST'])
def change_password_direct():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not email or not old_password or not new_password:
        return jsonify({'error': 'All fields are required.'}), 400

    try:
        res = supabase.table('users').select('id, password').ilike('email', email).execute()
        if not res.data:
            return jsonify({'error': 'User not found.'}), 404

        user = res.data[0]

        if not bcrypt.check_password_hash(user['password'], old_password):
            return jsonify({'error': 'Incorrect old password.'}), 400

        hashed_new_password = bcrypt.generate_password_hash(new_password).decode('utf-8')

        supabase.table('users').update({
            'password': hashed_new_password
        }).eq('id', user['id']).execute()

        return jsonify({'success': True, 'message': 'Password updated successfully!'}), 200
    except Exception as e:
        print("[CHANGE PASSWORD ERROR]:", str(e))
        return jsonify({'error': str(e)}), 500

# =============================================================================
# EMAIL REMINDERS (scheduled background job + settings endpoints)
# =============================================================================

def send_study_reminder():
    with app.app_context():
        # Current Philippine Standard Time (UTC+8)
        now_pht = datetime.now(timezone.utc) + timedelta(hours=8)
        current_time_str = now_pht.strftime("%H:%M")
        current_minute_iso_prefix = now_pht.strftime("%Y-%m-%dT%H:%M")
        today_date_str = now_pht.strftime("%Y-%m-%d")

        # -------------------------------------------------------------
        # A. DAILY RECURRING REMINDERS (from public.study_reminders)
        # -------------------------------------------------------------
        try:
            rem_res = supabase.table('study_reminders') \
                .select('user_id, reminder_time, last_sent_date') \
                .eq('enabled', True) \
                .eq('reminder_time', current_time_str) \
                .execute()

            for item in (rem_res.data or []):
                if item.get('last_sent_date') == today_date_str:
                    continue

                u_res = supabase.table('users').select('email, username').eq('id', item['user_id']).execute()
                if not u_res.data:
                    continue

                user = u_res.data[0]
                target_email = user['email']
                username = user['username']

                msg = Message(
                    subject="⏰ StudyCircle Daily Reminder: Time to Focus!",
                    recipients=[target_email],
                    body=f"Hi {username},\n\nThis is your daily study reminder! Log in to StudyCircle and keep your streak going! 🔥\n\n- StudyCircle Team"
                )
                mail.send(msg)

                supabase.table('study_reminders').update({
                    'last_sent_date': today_date_str
                }).eq('user_id', item['user_id']).execute()

                print(f"[DAILY REMINDER SENT] to {target_email} at {current_time_str} PHT")
        except Exception as e:
            print("[DAILY REMINDER WORKER ERROR]:", e)

        # -------------------------------------------------------------
        # B. MANUAL REMINDERS (scheduled for exact date & time)
        # -------------------------------------------------------------
        try:
            # Query all users who have items in their inventory
            users_res = supabase.table('users').select('id, email, username, inventory').execute()
            for u in (users_res.data or []):
                inv = parse_json_field(u.get('inventory'), [])
                if not isinstance(inv, list):
                    continue

                modified = False
                for item in inv:
                    if isinstance(item, dict) and item.get('type') == 'manual_reminder':
                        # Check if matches current minute and hasn't been sent yet
                        rem_dt = str(item.get('datetime', ''))
                        is_sent = item.get('sent', False)

                        if not is_sent and rem_dt.startswith(current_minute_iso_prefix):
                            target_email = u.get('email')
                            username = u.get('username') or 'Student'

                            try:
                                msg = Message(
                                    subject="⏰ StudyCircle Scheduled Reminder: Study Time!",
                                    recipients=[target_email],
                                    body=f"Hi {username},\n\nThis is your scheduled study reminder for {rem_dt}!\n\nOpen StudyCircle now and jump into a focus session: http://localhost:5173\n\n- StudyCircle Team"
                                )
                                mail.send(msg)
                                item['sent'] = True
                                modified = True
                                print(f"[MANUAL REMINDER SENT] to {target_email} for {rem_dt}")
                            except Exception as m_err:
                                print(f"[MANUAL REMINDER SEND FAILED for {target_email}]:", m_err)

                if modified:
                    supabase.table('users').update({'inventory': inv}).eq('id', u['id']).execute()

        except Exception as e:
            print("[MANUAL REMINDER WORKER ERROR]:", e)


# Background scheduler that checks every minute for scheduled reminders
scheduler = BackgroundScheduler()
scheduler.add_job(func=send_study_reminder, trigger="interval", minutes=1)
scheduler.start()


@app.route('/api/get-reminders', methods=['GET'])
def get_reminders():
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    try:
        user_res = supabase.table('users').select('id, inventory').ilike('email', email).execute()
        if not user_res.data:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user = user_res.data[0]
        user_id = user['id']

        # 1. Daily Reminder from public.study_reminders table
        rem_res = supabase.table('study_reminders').select('*').eq('user_id', user_id).execute()
        daily_enabled = False
        daily_time = '08:00'

        if rem_res.data:
            daily_enabled = bool(rem_res.data[0].get('enabled'))
            daily_time = rem_res.data[0].get('reminder_time') or '08:00'

        # 2. Manual reminders from user's inventory
        raw_inv = parse_json_field(user.get('inventory'), [])
        if not isinstance(raw_inv, list):
            raw_inv = []

        manual_reminders = [item for item in raw_inv if isinstance(item, dict) and item.get('type') == 'manual_reminder']

        return jsonify({
            'success': True,
            'dailyReminderEnabled': daily_enabled,
            'dailyReminderTime': daily_time,
            'manualReminders': manual_reminders
        }), 200
    except Exception as e:
        print("[GET REMINDERS ERROR]:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/update-reminder', methods=['POST'])
def update_reminder():
    data = request.json or {}
    email = (data.get('email') or '').strip()
    enabled = bool(data.get('enabled'))
    reminder_time = data.get('time', '08:00')

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        user_res = supabase.table('users').select('id').ilike('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user_id = user_res.data[0]['id']

        # Upsert into public.study_reminders table
        existing = supabase.table('study_reminders').select('user_id').eq('user_id', user_id).execute()
        if existing.data:
            supabase.table('study_reminders').update({
                'enabled': enabled,
                'reminder_time': reminder_time
            }).eq('user_id', user_id).execute()
        else:
            supabase.table('study_reminders').insert({
                'user_id': user_id,
                'enabled': enabled,
                'reminder_time': reminder_time
            }).execute()

        # Confirmation email if enabled
        if enabled:
            try:
                msg = Message(
                    subject="⏰ StudyCircle Reminder Set Successfully!",
                    recipients=[email],
                    body=f"Hello!\n\nYour daily study reminder has been set to {reminder_time} (Philippine Standard Time).\n\nKeep your focus strong!\n- StudyCircle Team"
                )
                mail.send(msg)
            except Exception as mail_err:
                print("[MAIL SEND ERROR]:", mail_err)

        return jsonify({"success": True, "message": "Reminder settings updated successfully!"}), 200
    except Exception as e:
        print("[UPDATE REMINDER ERROR]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/add-manual-reminder', methods=['POST'])
def add_manual_reminder():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    dt_str = data.get('datetime')
    title = data.get('title', 'Custom Reminder')

    if not email or not dt_str:
        return jsonify({"success": False, "message": "Email and datetime are required"}), 400

    try:
        user_res = supabase.table('users').select('id, inventory').ilike('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": f"User {email} not found"}), 404

        user = user_res.data[0]
        raw_inv = parse_json_field(user.get('inventory'), [])
        if not isinstance(raw_inv, list):
            raw_inv = []

        reminder_obj = {
            'id': str(uuid.uuid4()),
            'type': 'manual_reminder',
            'title': title,
            'datetime': dt_str,
            'sent': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        # Append to inventory list
        updated_inv = [item for item in raw_inv]
        updated_inv.append(reminder_obj)

        # 1. Guarantee Database Save in public.users
        save_res = supabase.table('users').update({
            'inventory': updated_inv
        }).eq('id', user['id']).execute()

        if not save_res.data:
            return jsonify({"success": False, "message": "Failed to persist to database"}), 500

        # 2. Try sending initial confirmation email safely without breaking the DB save
        try:
            if app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'):
                msg = Message(
                    subject="⏰ StudyCircle Custom Reminder Added",
                    recipients=[email],
                    body=f"Hello!\n\nA manual study reminder has been scheduled for {dt_str} (Philippine Standard Time).\n\nKeep up the great work!\n- StudyCircle Team"
                )
                mail.send(msg)
                print(f"[MANUAL REMINDER CONFIRMATION SENT] to {email}")
        except Exception as mail_err:
            print("[EMAIL DISPATCH WARNING - check app password / credentials]:", mail_err)

        return jsonify({"success": True, "reminder": reminder_obj}), 200

    except Exception as e:
        print("[ADD MANUAL REMINDER ERROR]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/remove-manual-reminder', methods=['POST'])
def remove_manual_reminder():
    data = request.json or {}
    email = (data.get('email') or '').strip()
    rem_id = data.get('id')

    if not email or not rem_id:
        return jsonify({"success": False, "message": "Email and reminder ID required"}), 400

    try:
        user_res = supabase.table('users').select('id, inventory').ilike('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user = user_res.data[0]
        raw_inv = parse_json_field(user.get('inventory'), [])
        if not isinstance(raw_inv, list):
            raw_inv = []

        updated_inv = [item for item in raw_inv if not (isinstance(item, dict) and item.get('id') == rem_id)]

        supabase.table('users').update({
            'inventory': updated_inv
        }).eq('id', user['id']).execute()

        return jsonify({"success": True}), 200
    except Exception as e:
        print("[REMOVE MANUAL REMINDER ERROR]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/test-email', methods=['POST'])
def test_email():
    data = request.json
    recipient_email = data.get('email')

    if not recipient_email:
        return jsonify({"success": False, "message": "No email provided"}), 400

    try:
        msg = Message(
            subject="🧪 StudyCircle Test Email",
            recipients=[recipient_email],
            body="Hello! This is a test email from your StudyCircle app to verify that email reminders are working perfectly."
        )
        mail.send(msg)
        return jsonify({"success": True, "message": "Test email sent successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# PROFILE & CUSTOMIZATION
# =============================================================================

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    old_email = data.get('old_email')
    new_username = data.get('new_username')
    new_email = data.get('new_email')

    if not old_email:
        return jsonify({'error': 'Original email is required.'}), 400

    update_data = {}
    if new_username:
        update_data['username'] = new_username
    if new_email:
        update_data['email'] = new_email

    try:
        response = supabase.table('users').update(update_data).eq('email', old_email).execute()
        return jsonify({'success': True, 'message': 'Profile updated successfully!'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/get-profile', methods=['GET'])
def get_profile():
    """Returns the real database row for the Profile page (avatar, rooms created, best streak, etc.)."""
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required.'}), 400
    try:
        res = supabase.table('users').select(
            'username, email, level, current_xp, max_xp, coins, streak, best_streak, rooms_created, avatar_config, inventory'
        ).eq('email', email).execute()
        if not res.data:
            return jsonify({'success': False, 'message': 'User not found.'}), 404

        u = res.data[0]
        streak = int(u.get('streak') or 0)
        stored_best = int(u.get('best_streak') or 0)
        best = max(stored_best, streak)
        if best > stored_best:  # self-heal old accounts
            supabase.table('users').update({'best_streak': best}).eq('email', email).execute()

        return jsonify({
            'success': True,
            'profile': {
                'username': u.get('username'),
                'email': u.get('email'),
                'level': u.get('level') or 1,
                'currentXP': u.get('current_xp') or 0,
                'maxXP': u.get('max_xp') or 100,
                'coins': u.get('coins') or 0,
                'streak': streak,
                'bestStreak': best,
                'roomsCreated': int(u.get('rooms_created') or 0),
                'avatarConfig': parse_json_field(u.get('avatar_config')),
                'inventory': parse_json_field(u.get('inventory'), []),
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/update-customization', methods=['POST'])
def update_customization():
    data = request.json or {}
    email = data.get('email')
    avatar_config = data.get('avatarConfig')
    room_config = data.get('roomConfig')
    unlocked_items = data.get('unlockedItems')

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        # Pass direct Python dict/list objects to Supabase for jsonb columns
        update_payload = {}
        if avatar_config is not None:
            update_payload["avatar_config"] = avatar_config if isinstance(avatar_config, dict) else json.loads(avatar_config)
        if room_config is not None:
            update_payload["room_config"] = room_config if isinstance(room_config, dict) else json.loads(room_config)
        if unlocked_items is not None:
            update_payload["unlocked_items"] = unlocked_items if isinstance(unlocked_items, list) else json.loads(unlocked_items)

        # .eq (exact match) so "_" or "%" in an email can never match other users
        res = supabase.table('users').update(update_payload).eq('email', email.strip()).execute()

        if not res.data:
            print(f"[CUSTOMIZATION ERROR] No user found with email: {email}")
            return jsonify({"success": False, "message": f"User {email} not found"}), 404

        return jsonify({"success": True, "message": "Customization saved to database successfully!"}), 200
    except Exception as e:
        print("[CUSTOMIZATION EXCEPTION]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/update-coins', methods=['POST'])
def update_coins_db():
    data = request.json or {}
    email = data.get('email')
    coins = data.get('coins')

    if not email or coins is None:
        return jsonify({"success": False, "message": "Email and coins are required"}), 400

    try:
        res = supabase.table('users').update({
            "coins": int(coins)
        }).eq('email', email.strip()).execute()

        if not res.data:
            return jsonify({"success": False, "message": f"User {email} not found"}), 404

        return jsonify({"success": True, "message": "Coins updated in database successfully!"}), 200
    except Exception as e:
        print("[UPDATE COINS EXCEPTION]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# FRIENDS SYSTEM (search, requests, accept/reject, list, remove)
# =============================================================================

@app.route('/api/search-users', methods=['GET'])
def search_users():
    query = request.args.get('query', '').strip()
    current_email = request.args.get('email', '')

    if not query:
        return jsonify({"success": True, "users": []}), 200

    try:
        # 1. Get every email that's already a friend or has a pending request,
        #    so they don't show up again in search results
        friendships_res = supabase.table('friendships').select('*').or_(f"sender_email.eq.{current_email},receiver_email.eq.{current_email}").execute()

        excluded_emails = {current_email}
        for item in friendships_res.data:
            if item['status'] in ['accepted', 'pending']:
                other_email = item['receiver_email'] if item['sender_email'] == current_email else item['sender_email']
                excluded_emails.add(other_email)

        # 2. Search for users not in the excluded list
        response = supabase.table('users').select('username, email, level, avatar_config').ilike('username', f"%{query}%").execute()

        filtered_users = [u for u in response.data if u['email'] not in excluded_emails]

        return jsonify({"success": True, "users": filtered_users}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/send-friend-request', methods=['POST'])
def send_friend_request():
    data = request.get_json()
    sender_email = data.get('senderEmail')
    receiver_email = data.get('receiverEmail')

    if not sender_email or not receiver_email:
        return jsonify({"success": False, "message": "Sender and receiver emails are required."}), 400

    try:
        # Save the request in the Supabase friendships table
        supabase.table('friendships').insert({
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "status": "pending"
        }).execute()

        return jsonify({"success": True, "message": "Friend request sent successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/get-friends-data', methods=['GET'])
def get_friends_data():
    email = request.args.get('email')

    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    try:
        # Get accepted friends and incoming requests
        response = supabase.table('friendships').select('*').or_(f"sender_email.eq.{email},receiver_email.eq.{email}").execute()

        # Safe check in case the response data is null or empty
        if not response.data:
            return jsonify({"success": True, "friends": [], "requests": []}), 200

        friends = []
        requests = []

        for item in response.data:
            status = item.get('status')
            sender = item.get('sender_email')
            receiver = item.get('receiver_email')

            if status == 'accepted':
                friend_email = receiver if sender == email else sender
                # Get the friend's details from the users table
                u_res = supabase.table('users').select('username, email, level, avatar_config').eq('email', friend_email).execute()
                if u_res.data:
                    friends.append(u_res.data[0])

            elif status == 'pending' and receiver == email:
                # Incoming request for this user
                u_res = supabase.table('users').select('username, email, level, avatar_config').eq('email', sender).execute()
                if u_res.data:
                    requests.append({
                        "id": item.get('id'),
                        "sender": u_res.data[0]
                    })

        return jsonify({"success": True, "friends": friends, "requests": requests}), 200

    except Exception as e:
        print(f"Error in get_friends_data: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/handle-friend-request', methods=['POST'])
def handle_friend_request():
    data = request.get_json()
    request_id = data.get('requestId')
    action = data.get('action')  # 'accept' or 'reject'

    try:
        if action == 'accept':
            supabase.table('friendships').update({"status": "accepted"}).eq('id', request_id).execute()
        else:
            supabase.table('friendships').delete().eq('id', request_id).execute()

        return jsonify({"success": True, "message": f"Request {action}ed successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/remove-friend', methods=['POST'])
def remove_friend():
    data = request.get_json()
    user_email = data.get('userEmail')
    friend_email = data.get('friendEmail')

    if not user_email or not friend_email:
        return jsonify({"success": False, "message": "Both emails are required."}), 400

    try:
        # Delete the friendship record no matter which side is sender/receiver
        supabase.table('friendships').delete().or_(
            f"and(sender_email.eq.{user_email},receiver_email.eq.{friend_email}),and(sender_email.eq.{friend_email},receiver_email.eq.{user_email})"
        ).execute()

        return jsonify({"success": True, "message": "Friend removed successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# LEADERBOARD
# =============================================================================

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        # Top 10 users by XP for "All Time"
        all_time_res = supabase.table('users').select('username, avatar_url, avatar_config, current_xp').order('current_xp', desc=True).limit(10).execute()

        # Top 10 users by streak
        streaks_res = supabase.table('users').select('username, avatar_url, avatar_config, streak').order('streak', desc=True).limit(10).execute()

        def format_avatar(url, username):
            return url if url else f"https://api.dicebear.com/7.x/pixel-art/svg?seed={username}"

        all_time = []
        for i, user in enumerate(all_time_res.data):
            all_time.append({
                "rank": i + 1,
                "username": user.get('username'),
                "pfp": format_avatar(user.get('avatar_url'), user.get('username')),
                "avatar_config": user.get('avatar_config'),
                "score": f"{user.get('current_xp', 0):,} XP"
            })

        streaks = []
        for i, user in enumerate(streaks_res.data):
            streaks.append({
                "rank": i + 1,
                "username": user.get('username'),
                "pfp": format_avatar(user.get('avatar_url'), user.get('username')),
                "avatar_config": user.get('avatar_config'),
                "streak": f"{user.get('streak', 0)} d"
            })

        return jsonify({
            "success": True,
            "leaderboard": {
                "all-time": all_time,
                "this-month": all_time,  # Placeholder until there's a monthly tracking table
                "streaks": streaks
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# CHAT / MESSAGING
# =============================================================================

@app.route('/api/messages', methods=['GET'])
def get_messages():
    user1 = request.args.get('user1')
    user2 = request.args.get('user2')

    if not user1 or not user2:
        return jsonify({"success": False, "message": "Missing user emails"}), 400

    try:
        # Get all messages between the two users
        response = supabase.table('messages').select('*') \
            .in_('sender_email', [user1, user2]) \
            .in_('receiver_email', [user1, user2]) \
            .order('created_at').execute()

        return jsonify({"success": True, "messages": response.data}), 200
    except Exception as e:
        print("Error fetching messages:", e)
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/send-message', methods=['POST'])
def send_message():
    data = request.json
    sender = data.get('sender_email')
    receiver = data.get('receiver_email')
    message = data.get('message')

    if not sender or not receiver or not message:
        return jsonify({"success": False, "message": "Incomplete data"}), 400

    try:
        # Save the message to the database
        supabase.table('messages').insert({
            "sender_email": sender,
            "receiver_email": receiver,
            "message": message
        }).execute()

        return jsonify({"success": True}), 200
    except Exception as e:
        print("Error sending message:", e)
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# STUDY SESSIONS & XP ENGINE
# =============================================================================

@app.route('/api/save-session', methods=['POST'])
def save_session():
    data = request.json or {}
    email = data.get('email')
    activity = data.get('activity') or data.get('workType') or 'Focus Session'
    technique = data.get('technique') or data.get('techniqueName') or 'Pomodoro'
    duration = int(data.get('duration') or data.get('focusTime') or data.get('durationMinutes') or 0)
    total_tasks = int(data.get('totalTasks', 0))
    completed_tasks = int(data.get('completedTasks', 0))

    try:
        supabase.table('study_sessions').insert({
            "email": email,
            "activity_name": activity,
            "technique": technique,
            "duration_minutes": duration,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks
        }).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/v1/sessions/complete', methods=['POST'])
def complete_focus_session():
    """v2.1 EXP Engine & API Specification Controller."""
    data = request.json or {}
    raw_email = data.get('email', '').strip()

    # Carefully handle all the possible key names coming from the frontend
    duration_minutes = int(data.get('durationMinutes') or data.get('focusTime') or data.get('duration') or 25)
    technique = str(data.get('technique') or data.get('techniqueName') or 'Pomodoro').strip()
    activity_name = str(data.get('activity') or data.get('workType') or 'Focus Session').strip()

    tasks_completed = max(0, int(data.get('tasksCompleted', 0)))
    total_tasks = max(tasks_completed, int(data.get('totalTasks', tasks_completed)))
    tasks_list = data.get('tasksList', [])

    # --- Feedback fields from the feedback modal ---
    task_status = data.get('taskStatus', 'Completed').strip()
    productivity_level = int(data.get('productivityLevel', 3))
    accomplished_text = data.get('accomplishedText', '').strip()

    is_multiplayer = data.get('isMultiplayer', False)
    is_host = data.get('isHost', False)
    room_size = int(data.get('roomSize', 1))

    if not raw_email:
        return jsonify({"success": False, "error": "Email is required. Please check login state."}), 400

    try:
        if room_size > 6:
            return jsonify({"success": False, "error": f"Group room size exceeds strict limit: N = {room_size}. Max N = 6."}), 400

        user_res = supabase.table('users').select('*').eq('email', raw_email).execute()
        if not user_res.data:
            return jsonify({"success": False, "error": f"User record not found for {raw_email}"}), 404

        user = user_res.data[0]
        user_id = user['id']
        current_xp = float(user.get('current_xp') or 0.0)
        current_coins = int(user.get('coins') or 0)
        current_level = int(user.get('level') or 1)
        current_streak = int(user.get('streak') or 0)

        # v2.1 Master EXP Formula
        R_base = 0.4
        tech_upper = technique.upper()
        if '52' in tech_upper:
            mu_tech = 1.1
        elif '90' in tech_upper or 'ULTRADIAN' in tech_upper:
            mu_tech = 1.2
        else:
            mu_tech = 1.0

        mu_checklist = 1.0 + min(tasks_completed * 0.05, 0.25)

        if not is_multiplayer or room_size <= 1:
            session_type = 'SOLO'
            SessMult = 1.00
        elif is_host:
            session_type = 'HOST'
            SessMult = 1.15
        else:
            session_type = 'MEMBER'
            SessMult = 1.05

        if room_size <= 1:
            CapMult = 1.00
        elif room_size == 2:
            CapMult = 1.05
        elif room_size <= 5:
            CapMult = 1.10
        elif room_size == 6:
            CapMult = 1.15
        else:
            CapMult = 1.00

        bonus_exp = 4.0 if ('ULTRADIAN' in tech_upper and duration_minutes >= 90) else 0.0

        base_calc = duration_minutes * R_base * mu_tech * mu_checklist
        calculated_exp = (base_calc * SessMult * CapMult) + bonus_exp
        rounded_exp_gained = round(calculated_exp, 4)

        # Look at this user's session history once — used for BOTH the daily
        # coin cap AND the streak check below.
        today = datetime.now().date()
        today_str = today.strftime('%Y-%m-%d')
        yesterday_str = (today - timedelta(days=1)).strftime('%Y-%m-%d')

        history_res = supabase.table('study_sessions').select('created_at, coins_gained').eq('email', raw_email).execute()
        history = history_res.data or []

        studied_today = False
        studied_yesterday = False
        coins_earned_today = 0
        for s in history:
            created_at = s.get('created_at') or ''
            if created_at.startswith(today_str):
                studied_today = True
                coins_earned_today += int(s.get('coins_gained') or 0)
            elif created_at.startswith(yesterday_str):
                studied_yesterday = True

        # Enforce the 100-coin-per-day limit
        raw_coins_gained = max(1, int(round(duration_minutes * 0.2)))
        coins_gained = max(0, min(raw_coins_gained, 100 - coins_earned_today))

        new_xp = current_xp + rounded_exp_gained
        new_coins = current_coins + coins_gained

        # Level calculation (1 to 50, continuous / sequential leveling)
        new_level, new_max_xp = calculate_level_from_total_xp(new_xp)

        # Streak logic, freeze-aware
        freeze_used = False
        if studied_today:
            # Already logged a session today — keep the streak where it is
            new_streak = current_streak if current_streak > 0 else 1
        elif studied_yesterday or current_streak == 0:
            # Picking up right where yesterday left off, or starting a brand new streak
            new_streak = current_streak + 1
        else:
            # A day was missed — see if a streak freeze can save it
            sf_res = supabase.table('streak_freezes_inventory').select('*').eq('user_id', user_id).execute()
            freezes_count = sf_res.data[0].get('freezes_count', 0) if sf_res.data else 0

            if freezes_count > 0:
                supabase.table('streak_freezes_inventory').update({
                    "freezes_count": freezes_count - 1
                }).eq('user_id', user_id).execute()
                new_streak = current_streak + 1
                freeze_used = True
            else:
                # No freeze available — the streak resets
                new_streak = 1

        # Best streak = the highest streak this account has ever reached
        new_best_streak = max(int(user.get('best_streak') or 0), new_streak)

        # NOTE: the 3rd streak-freeze slot is no longer unlocked automatically at
        # Level 20. It is unlocked when the player CLAIMS the Level 20 reward
        # (see claim_reward below).

        # 1. Update the users table (streak included)
        supabase.table('users').update({
            "current_xp": int(round(new_xp)),
            "coins": new_coins,
            "level": new_level,
            "max_xp": new_max_xp,
            "streak": new_streak,
            "best_streak": new_best_streak
        }).eq('id', user_id).execute()

        # 2. Insert into study_sessions table, including feedback fields
        supabase.table('study_sessions').insert({
            "email": user['email'],
            "activity_name": activity_name,
            "technique": technique,
            "duration_minutes": duration_minutes,
            "total_tasks": total_tasks,
            "completed_tasks": tasks_completed,
            "tasks_list": tasks_list,
            "task_status": task_status,
            "productivity_level": productivity_level,
            "accomplished_text": accomplished_text,
            "exp_gained": rounded_exp_gained,
            "coins_gained": coins_gained
        }).execute()

        print(f"[v2.1 EXP SUCCESS] {user['email']}: +{rounded_exp_gained} EXP, +{coins_gained} Coins, Level: {new_level}, Streak: {new_streak}")

        return jsonify({
            "success": True,
            "expGained": rounded_exp_gained,
            "currentXP": int(round(new_xp)),
            "totalExp": new_xp,
            "coins": new_coins,
            "level": new_level,
            "maxXP": new_max_xp,
            "streak": new_streak,
            "bestStreak": new_best_streak,
            "streakFreezeUsed": freeze_used,
            "didLevelUp": new_level > current_level
        }), 200

    except Exception as e:
        print("[v2.1 EXP ERROR]:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/get-all-sessions', methods=['GET'])
def get_all_sessions():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
    try:
        response = supabase.table('study_sessions').select('*').eq('email', email).order('created_at', desc=True).execute()
        return jsonify({"success": True, "sessions": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# AI FEATURES (Kitsu chat, flashcards/quizzes/notes generation,
# task-text validation, and the WSM technique recommendation engine)
# =============================================================================

@app.route('/api/kitsu-chat', methods=['POST'])
def kitsu_chat():
    """Endpoint for the AI Chat feature (Kitsu AI Chat)."""
    data = request.get_json()
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'Message is required.'}), 400

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({'success': False, 'error': 'GEMINI_API_KEY is missing.'}), 500

        # Pass the API key directly and re-configure genai to avoid stale
        # Vertex environment variables that can cause 401 errors.
        os.environ["GEMINI_API_KEY"] = api_key
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel('gemini-3.6-flash')

        prompt = f"You are Kitsu, a cozy, friendly, and helpful anime-style study fox assistant for a study app called StudyCircle. Keep your answers encouraging, concise, and study-focused. User says: {user_message}"

        response = model.generate_content(prompt)
        ai_reply = response.text

        return jsonify({'success': True, 'reply': ai_reply}), 200
    except Exception as e:
        print("EXACT GEMINI ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generate-ai-tool', methods=['POST'])
def generate_ai_tool():
    """Generates Flashcards / Quizzes / Notes from an uploaded PDF file."""
    tool_type = request.form.get('toolType', 'Notes')
    file = request.files.get('file')

    if not file:
        return jsonify({'error': 'No file uploaded.'}), 400

    file_path = None
    try:
        upload_dir = 'temp_uploads'
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        file.save(file_path)

        reader = PdfReader(file_path)
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        if not extracted_text.strip():
            extracted_text = "Sample study material content."

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-3.6-flash')

        if tool_type in ['Pre-quiz', 'Post-quiz']:
            prompt = f"""
            Analyze the following text and generate exactly 5 multiple-choice questions based strictly on its content.
            Return the output strictly as a valid JSON object in this exact format, with no markdown code blocks or extra text:
            {{
              "questions": [
                {{
                  "question": "Question text here?",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": 0
                }}
              ]
            }}
            Text: {extracted_text[:6000]}
            """
        elif tool_type == 'Flashcards':
            prompt = f"""
            Analyze the following text and generate 4 flashcards containing a key term and definition based strictly on the text.
            Return the output strictly as a valid JSON array of objects in this exact format, with no markdown code blocks:
            [
              {{ "term": "Term 1", "definition": "Definition 1" }}
            ]
            Text: {extracted_text[:6000]}
            """
        else:  # Notes
            prompt = f"""
            Analyze the following document text and provide comprehensive, structured study notes with clear headings and bullet points based strictly on the text content:
            Text: {extracted_text[:6000]}
            """

        response = model.generate_content(prompt)
        result_text = response.text.strip()

        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        return jsonify({'success': True, 'data': result_text.strip()}), 200

    except Exception as e:
        print("EXACT GENERATE TOOL ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass


# --- WSM (Weighted Sum Model) constants, used by the technique recommendation engine ---

TASK_WEIGHTS = {
    "Creation": {"df": 0.8, "fm": 0.1, "cs": 0.1},
    "Writing": {"df": 0.7, "fm": 0.2, "cs": 0.1},
    "Practicing": {"df": 0.6, "fm": 0.3, "cs": 0.1},
    "Reading": {"df": 0.5, "fm": 0.4, "cs": 0.1},
    "Review": {"df": 0.2, "fm": 0.4, "cs": 0.4},
    "Memorize": {"df": 0.1, "fm": 0.5, "cs": 0.4}
}

FRAMEWORK_SCORES = {
    "Pomodoro": {"df": 2, "fm": 10, "cs": 9},
    "52-17 Method": {"df": 6, "fm": 6, "cs": 5},
    "90m Deep Work": {"df": 10, "fm": 2, "cs": 2}
}

# --- Task validation dictionary, used to check whether a task description matches its category ---

TASK_DICTIONARIES = {
    "reading": [
        "read", "reading", "reread", "re-read", "go through", "go over", "look through", "scan", "skim",
        "browse", "examine", "inspect", "study", "read through", "read over", "read up on", "work through",
        "peruse", "consult", "refer to", "look up", "read chapter", "read article", "read book", "read notes",
        "read handout", "read module", "read lesson", "read paper", "read research paper", "read journal",
        "read documentation", "go through documentation", "read instructions", "read textbook", "read slides",
        "read lecture", "read source", "read reference", "read material", "read resources", "read literature",
        "read case study", "read essay", "read report", "read paragraph", "read passage", "read pages",
        "finish reading", "complete reading", "understand the chapter", "understand the article",
        "study the material", "examine the material", "review the text", "annotate while reading", "highlight",
        "mark important parts", "identify key points", "find main ideas", "extract information", "take notes while reading"
    ],
    "writing": [
        "write", "writing", "draft", "drafting", "compose", "composing", "create text", "produce text",
        "prepare a draft", "make a draft", "write up", "write down", "rewrite", "re-write", "revise", "revision",
        "edit", "editing", "proofread", "proofreading", "polish", "improve wording", "rephrase", "paraphrase",
        "outline", "create an outline", "write an outline", "develop an outline", "journal", "journal writing",
        "freewrite", "free writing", "essay", "write essay", "report", "write report", "research paper",
        "write research paper", "paper", "write paper", "paragraph", "write paragraph", "reflection",
        "write reflection", "documentation", "write documentation", "letter", "write letter", "response",
        "write response", "discussion post", "write discussion post", "article", "write article",
        "reflection paper", "document", "email", "write email", "blog", "write blog", "script", "write script",
        "story", "write story", "poem", "write poem", "caption", "write caption", "introduction",
        "write introduction", "conclusion", "write conclusion", "thesis statement", "write thesis statement",
        "proposal", "write proposal", "case study", "write case study", "lab report", "write lab report",
        "answer questions in writing", "complete written activity"
    ],
    "review": [
        "review", "reviewing", "revise", "revision", "go over", "go through", "look back", "revisit", "recheck",
        "check again", "check", "recap", "recap notes", "recap lesson", "refresh", "refresh memory",
        "refresh knowledge", "brush up", "brush up on", "reinforce", "reinforce learning", "consolidate",
        "consolidate knowledge", "relearn", "revisit lesson", "revisit chapter", "revisit notes", "review notes",
        "review chapter", "review lesson", "review module", "review material", "review lecture", "review slides",
        "review textbook", "review article", "review assignment", "review answers", "review mistakes",
        "check notes", "check previous work", "check previous lesson", "look at notes again", "study again",
        "study previous material", "study past lessons", "refresh concepts", "summarize", "make a summary",
        "review summary", "review key points", "review important points", "review highlights", "review before exam",
        "exam review", "test review", "quiz review", "final review", "pre-exam review", "review for exam",
        "review for quiz", "review for test", "review flashcards", "check understanding", "revisit difficult topics",
        "review weak areas", "correct mistakes", "go over mistakes", "analyze mistakes", "review feedback"
    ],
    "practice": [
        "practice", "practise", "practicing", "practising", "exercise", "exercises", "drill", "drills", "train",
        "training", "rehearse", "rehearsal", "work on", "work through", "try", "attempt", "solve", "solving",
        "answer", "answering", "complete problems", "do problems", "solve problems", "practice problems",
        "practice questions", "answer questions", "answer exercises", "do exercises", "workbook",
        "workbook exercises", "worksheet", "complete worksheet", "problem set", "complete problem set",
        "sample problems", "sample questions", "mock test", "mock exam", "practice test", "practice exam",
        "quiz practice", "test practice", "exam practice", "take a quiz", "take a test", "take an exam",
        "simulate exam", "exam simulation", "hands-on practice", "hands on", "apply", "apply concepts",
        "apply knowledge", "application", "implement", "code practice", "coding exercise", "programming exercise",
        "debug practice", "debug code", "solve equations", "solve math problems", "calculate", "calculations",
        "compute", "perform calculations", "work out", "practice speaking", "practice pronunciation",
        "practice writing", "practice grammar", "practice vocabulary", "practice presentation",
        "rehearse presentation", "practice skills", "skill practice", "repeat exercises", "repeat problems",
        "practice technique", "practice method", "practice procedure", "practice steps", "practice application"
    ],
    "memorize": [
        "memorize", "memorise", "memorizing", "memorising", "learn by heart", "commit to memory", "remember",
        "remembering", "retain", "retention", "recall", "recalling", "memorization", "memorisation",
        "rote learning", "rote memorization", "learn", "master", "mastering", "internalize", "internalise",
        "ingrain", "fix in memory", "store in memory", "flashcards", "flash card", "make flashcards",
        "review flashcards", "active recall", "recall practice", "selftest", "self testing", "retrieval practice",
        "retrieval", "spaced repetition", "spaced review", "repeat", "repetition", "repeat until remembered",
        "repeat information", "repeat terms", "repeat definitions", "learn terms", "learn definitions",
        "memorize terms", "memorize definitions", "memorize formulas", "memorize equations", "memorize facts",
        "memorize dates", "memorize names", "memorize vocabulary", "memorize concepts", "memorize keywords",
        "memorize rules", "memorize steps", "memorize procedures", "memorize sequence", "memorize lists",
        "memorize code", "memorize syntax", "memorize commands", "learn vocabulary", "vocabulary memorization",
        "learn formulas", "learn facts", "learn dates", "learn names", "recall facts", "recall terms",
        "recall definitions", "recall formulas", "recall concepts", "recall information", "test my memory",
        "memory drill", "memorization drill", "mnemonics", "mnemonic", "use mnemonic", "acronym",
        "make an acronym", "association", "associate concepts", "remember key points"
    ],
    "creation": [
        "create", "creating", "creation", "make", "making", "build", "building", "develop", "developing",
        "design", "designing", "produce", "producing", "construct", "constructing", "develop a project",
        "make a project", "create a project", "project", "prototype", "prototyping", "design a prototype",
        "create prototype", "develop prototype", "plan", "planning", "brainstorm", "brainstorming",
        "conceptualize", "conceptualise", "ideate", "ideation", "generate ideas", "come up with ideas",
        "create ideas", "design layout", "create layout", "design interface", "create interface",
        "design UI", "create UI", "design UX", "create UX", "wireframe", "wireframing", "mockup", "mock-up",
        "create mockup", "design mockup", "draw", "drawing", "illustrate", "illustration", "create illustration",
        "make diagram", "create diagram", "create chart", "create infographic", "create presentation",
        "make presentation", "design presentation", "create poster", "make poster", "design poster",
        "create graphic", "design graphic", "create logo", "design logo", "create website", "build website",
        "develop website", "create application", "build application", "develop application", "create app",
        "build app", "develop app", "create system", "build system", "develop system", "implement feature",
        "develop feature", "build feature", "create database", "design database", "build database",
        "create model", "build model", "develop model", "create content", "produce content", "create video",
        "edit video", "create animation", "create artwork", "make artwork", "creative project", "creative work",
        "make something", "create something", "develop concept", "design solution", "create solution", "build solution"
    ]
}


@app.route('/api/validate-task', methods=['POST'])
def validate_task():
    data = request.get_json() or {}
    category = str(data.get('category', '')).strip().lower()
    tasks = data.get('tasks', [])

    if not category or not tasks:
        return jsonify({'success': False, 'error': 'Category and tasks are required.'}), 400

    keywords = TASK_DICTIONARIES.get(category, [])
    # Match the longest phrases first (e.g. "read chapter" before "read")
    sorted_keywords = sorted(keywords, key=len, reverse=True)

    results = []
    overall_score = 0.0

    for raw_task in tasks:
        task_str = str(raw_task).strip()
        # Normalize: strip punctuation and lowercase
        clean_task = re.sub(r'[^\w\s-]', ' ', task_str.lower())
        temp_text = f" {clean_task} "

        matched_keywords = []

        for kw in sorted_keywords:
            kw_clean = kw.strip().lower()
            # \b (word boundary) so only whole words are matched
            pattern = rf'\b{re.escape(kw_clean)}\b'
            if re.search(pattern, temp_text):
                matched_keywords.append(kw_clean)
                # Remove the matched word from temp_text to avoid double-counting
                temp_text = re.sub(pattern, ' ', temp_text)

        matched_count = len(matched_keywords)

        # Scoring formula based on the actual number of matches:
        if matched_count == 0:
            score = 0.0
        elif matched_count == 1:
            score = 0.75  # One clear keyword/phrase match -> Aligned
        elif matched_count == 2:
            score = 0.90  # Stronger signal
        else:
            score = 1.0  # Many matching keywords

        # Threshold categorization from Section 5 of the thesis
        if score >= 0.70:
            status = "Aligned"
        elif score >= 0.40:
            status = "Needs Review"
        else:
            status = "Not Aligned"

        results.append({
            'task': task_str,
            'score': round(score, 2),
            'status': status,
            'matchedKeywords': matched_keywords
        })
        overall_score += score

    avg_score = round(overall_score / len(tasks), 2) if tasks else 0.0
    final_status = "Aligned" if avg_score >= 0.70 else ("Needs Review" if avg_score >= 0.40 else "Not Aligned")

    return jsonify({
        'success': True,
        'averageScore': avg_score,
        'status': final_status,
        'taskBreakdown': results
    }), 200


@app.route('/api/ai-recommendation', methods=['POST'])
def ai_recommendation():
    data = request.get_json() or {}
    email = data.get('email')
    work_type = data.get('workType', 'Reading')
    tasks = data.get('tasks', [])

    if not email:
        return jsonify({'success': False, 'error': 'Email is required.'}), 400

    try:
        # 1. Get history from Supabase for the Historical Modifier (H_f)
        sessions_res = supabase.table('study_sessions').select('*').eq('email', email).order('created_at', desc=True).limit(20).execute()
        user_history = sessions_res.data or []

        perf_tracking = {
            "Pomodoro": {"attempts": 0, "successes": 0},
            "52-17 Method": {"attempts": 0, "successes": 0},
            "90m Deep Work": {"attempts": 0, "successes": 0}
        }
        for s in user_history:
            tech = s.get('technique', 'Pomodoro')
            if tech in perf_tracking:
                perf_tracking[tech]["attempts"] += 1
                if s.get('status') in ['early', 'on-time', 'completed']:
                    perf_tracking[tech]["successes"] += 1

        def get_historical_modifier(fw_name):
            rec = perf_tracking[fw_name]
            if rec["attempts"] < 3:
                return 1.0
            return max(0.5, rec["successes"] / rec["attempts"])

        # 2. WSM session weight calculation (averaging weights across tasks)
        matched_categories = []
        for t in tasks:
            t_lower = str(t).lower()
            matched = "Reading"
            for cat in TASK_WEIGHTS.keys():
                if cat.lower() in t_lower or cat.lower() in work_type.lower():
                    matched = cat
                    break
            matched_categories.append(matched)

        if not matched_categories:
            matched_categories = ["Reading"]

        num_tasks = len(matched_categories)
        total_df = sum(TASK_WEIGHTS[cat]["df"] for cat in matched_categories)
        total_fm = sum(TASK_WEIGHTS[cat]["fm"] for cat in matched_categories)
        total_cs = sum(TASK_WEIGHTS[cat]["cs"] for cat in matched_categories)

        session_weights = {
            "df": total_df / num_tasks,
            "fm": total_fm / num_tasks,
            "cs": total_cs / num_tasks
        }

        # 3. WSM framework scoring & selection
        best_framework = "Pomodoro"
        highest_score = -1
        framework_details = {
            "Pomodoro": {"focus": 25, "break": 5, "sessions": 4},
            "52-17 Method": {"focus": 52, "break": 17, "sessions": 3},
            "90m Deep Work": {"focus": 90, "break": 20, "sessions": 2}
        }

        for fw, scores in FRAMEWORK_SCORES.items():
            base_score = (
                (session_weights["df"] * scores["df"]) +
                (session_weights["fm"] * scores["fm"]) +
                (session_weights["cs"] * scores["cs"])
            )
            h_mod = get_historical_modifier(fw)
            final_score = base_score * h_mod

            if final_score > highest_score:
                highest_score = final_score
                best_framework = fw

        config = framework_details[best_framework]

        # 4. Use Gemini for the user-facing explanation/rationale
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-3.6-flash')

        prompt = f"""
        You are Kitsu AI, an expert adaptive study coach inside StudyCircle. 
        A Weighted Sum Model algorithm determined that the user should use the '{best_framework}' technique ({config['focus']}m focus / {config['break']}m break) based on their tasks: {tasks}.
        Write a short, friendly, and motivating explanation (max 3 sentences) acknowledging their specific tasks and why this technique matches their cognitive profile.
        Return ONLY the explanation text.
        """

        response = model.generate_content(prompt)
        rationale = response.text.strip()

        return jsonify({
            'success': True,
            'techniqueName': best_framework,
            'focus': config['focus'],
            'break': config['break'],
            'sessions': config['sessions'],
            'recommendation': rationale
        }), 200

    except Exception as e:
        print("WSM AI Recommendation Error:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


# =============================================================================
# REAL-TIME MULTIPLAYER (Socket.IO events + rooms)
# =============================================================================

# In-memory tracker of who's currently in each room, for real-time sync
active_room_sessions = {}
room_members = {}

timer_states = {}          # room -> host's latest timer snapshot
session_participants = {}  # room -> usernames allowed to (re)join a started shared session
room_empty_since = {}  # room -> when the last person left

# maps socket id -> (room, username) so we can clean up when a tab closes
sid_to_room = {}

INACTIVE_ROOM_MINUTES = 5
EMPTY_ROOM_GRACE_SECONDS = INACTIVE_ROOM_MINUTES * 60


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_log(user, action):
    """Unique id + real timestamp, so the client can dedupe and show '2 mins ago'."""
    return {'id': f"log_{uuid.uuid4().hex}", 'user': user, 'action': action, 'ts': now_iso()}


def is_room_closed(room):
    return bool(room.get('is_closed')) or room.get('status') in ('suspended', 'closed')


def get_live_count(room_name):
    return len(room_members.get(room_name, []))


def is_room_active(room):
    """Active = someone inside, OR empty for less than INACTIVE_ROOM_MINUTES."""
    name = room.get('name')
    if get_live_count(name) > 0:
        return True
    last = room_empty_since.get(name)
    if last is None:
        try:
            dt = datetime.fromisoformat(str(room.get('created_at')).replace('Z', '+00:00'))
            last = dt.timestamp()
        except Exception:
            last = 0
    return (time.time() - last) < EMPTY_ROOM_GRACE_SECONDS


def note_if_room_empty(room):
    if not room_members.get(room):
        room_empty_since[room] = time.time()


def maybe_reset_stale_session(room):
    """If a room has been empty for a while, forget its finished session."""
    if room_members.get(room):
        return
    since = room_empty_since.get(room)
    if since and time.time() - since > EMPTY_ROOM_GRACE_SECONDS:
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


# Server just started, so nobody is inside any room yet
try:
    supabase.table('rooms').update({'current_members': 0}).neq('id', 0).execute()
except Exception as e:
    print("Could not reset room counts:", e)


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
                emit('room_join_rejected', {'reason': 'This room has been suspended.'})
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
        u_res = supabase.table('users').select('email, avatar_config, level').eq('username', username).execute()
        if u_res.data:
            user_email = u_res.data[0].get('email', '')
            db_avatar = u_res.data[0].get('avatar_config')
            level = u_res.data[0].get('level', level)

            # Calculate the user's real total focus time from 'study_sessions'
            sessions_res = supabase.table('study_sessions').select('duration_minutes').eq('email', user_email).execute()
            if sessions_res.data:
                total_minutes = sum(int(s.get('duration_minutes', 0)) for s in sessions_res.data)
                hours = total_minutes // 60
                mins = total_minutes % 60
                total_focus_formatted = f"{hours}h {mins:02d}m"

    except Exception as e:
        print("Error fetching user info:", e)

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

    broadcast_room_counts(room)


@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        res = supabase.table('rooms').select('*').execute()
        rooms = [r for r in (res.data or []) if not is_room_closed(r)]   # suspended = hidden
        for r in rooms:
            r['current_members'] = get_live_count(r['name'])
            r['is_active'] = is_room_active(r)
        return jsonify({'success': True, 'rooms': rooms}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.get_json() or {}
    host = data.get('host')
    max_members = int(data.get('max_members', 4))

    try:
        # Enforce a 3-room limit only for group rooms (max_members > 1)
        if max_members > 1:
            today_str = datetime.now().strftime('%Y-%m-%d')
            existing = supabase.table('rooms').select('*').eq('host', host).execute()
            today_rooms = [r for r in existing.data if r.get('created_at', '').startswith(today_str) and r.get('max_members', 4) > 1]

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


# --- Tracks pending join requests: { room_name: { guest_username: socket_id } } or maps rooms to hosts ---
room_hosts = {}


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


@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    # Forward the offer to the specific target peer
    socketio.emit('webrtc_offer', data, room=data.get('target'))


@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    socketio.emit('webrtc_answer', data, room=data.get('target'))


@socketio.on('webrtc_ice_candidate')
def handle_ice_candidate(data):
    socketio.emit('webrtc_ice_candidate', data, room=data.get('target'))


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


# =============================================================================
# PROGRESS, LEVELS & REWARDS
# =============================================================================

@app.route('/api/update-progress', methods=['POST'])
def update_progress():
    data = request.json
    email = data.get('email')
    earned_xp = data.get('earnedXP', 0)

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        # 1. Get the user's current data from Supabase
        user_res = supabase.table('users').select('id, current_xp, level').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        current_user = user_res.data[0]
        current_xp = current_user.get('current_xp', 0)
        new_xp = current_xp + earned_xp

        # 2. Calculate the new level using the shared level helper
        new_level, new_max_xp = calculate_level_from_total_xp(new_xp)

        # 3. Update the Supabase database
        supabase.table('users').update({
            "current_xp": new_xp,
            "level": new_level,
            "max_xp": new_max_xp
        }).eq('email', email).execute()

        # NOTE: the 3rd streak-freeze slot is unlocked by CLAIMING the Level 20
        # reward (see claim_reward), not automatically when Level 20 is reached.

        return jsonify({
            "success": True,
            "currentXP": new_xp,
            "level": new_level,
            "maxXP": new_max_xp
        }), 200

    except Exception as e:
        print("Error updating progress:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


LEVEL_REWARD_TIERS = [1, 5, 10, 15, 20, 25, 30, 40, 50]


@app.route('/api/claim-reward', methods=['POST'])
def claim_reward():
    data = request.json or {}
    email = (data.get('email') or '').strip()
    try:
        level = int(data.get('level'))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "A valid level is required"}), 400

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
    if level not in LEVEL_REWARD_TIERS:
        return jsonify({"success": False, "message": "Unknown reward tier."}), 400

    try:
        user_res = supabase.table('users').select('id, inventory, current_xp, level').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404
        user = user_res.data[0]

        # the server decides whether the player really reached this level
        real_level, _ = calculate_level_from_total_xp(int(user.get('current_xp') or 0))
        real_level = max(real_level, int(user.get('level') or 1))
        if level > real_level:
            return jsonify({"success": False, "message": f"Reach Level {level} first."}), 403

        inventory = parse_json_field(user.get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        reward_key = f"level_{level}_reward"
        already = reward_key in inventory
        if not already:
            inventory.append(reward_key)
            supabase.table('users').update({"inventory": inventory}).eq('id', user['id']).execute()

            # Level 20+ reward: 3rd streak-freeze slot
            if level >= 20:
                ensure_streak_freeze_row(user['id'])
                try:
                    supabase.table('streak_freezes_inventory').update({"max_slots": 3}).eq('user_id', user['id']).execute()
                except Exception as sf_err:
                    print("Note on streak freeze update:", sf_err)

        return jsonify({"success": True, "alreadyClaimed": already, "inventory": inventory}), 200

    except Exception as e:
        print("Error claiming reward:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/claim-streak-reward', methods=['POST'])
def claim_streak_reward():
    data = request.json
    email = data.get('email')
    days = data.get('days')

    if not email or days is None:
        return jsonify({"success": False, "message": "Email and days are required"}), 400

    try:
        # 1. Get the user's data (inventory, coins, current_xp) from the database
        user_res = supabase.table('users').select('inventory, coins, current_xp, max_xp, level').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user = user_res.data[0]
        current_inventory = user.get('inventory') or []
        if isinstance(current_inventory, str):
            try:
                current_inventory = json.loads(current_inventory)
            except:
                current_inventory = []

        reward_key = f"streak_{days}_reward"
        if reward_key in current_inventory:
            return jsonify({"success": False, "message": "Reward already claimed."}), 400

        # 2. Determine the reward based on the number of days
        # 1 day = 5 coins, 3 days = 10 coins, 7 days = 20 coins, 14 days = 75 XP, 21 days = 100 XP
        coins_to_add = 0
        xp_to_add = 0

        if days == 1:
            coins_to_add = 5
        elif days == 3:
            coins_to_add = 10
        elif days == 7:
            coins_to_add = 20
        elif days == 14:
            xp_to_add = 75
        elif days == 21:
            xp_to_add = 100

        current_coins = user.get('coins', 100)
        current_xp = user.get('current_xp', 0)

        new_coins = current_coins + coins_to_add
        new_xp = current_xp + xp_to_add

        # Add the reward key to the inventory
        current_inventory.append(reward_key)

        update_payload = {
            "inventory": current_inventory,
            "coins": new_coins,
            "current_xp": new_xp
        }

        # If XP was added, also recalculate the level using the shared level helper
        if xp_to_add > 0:
            new_level, new_max_xp = calculate_level_from_total_xp(new_xp)
            update_payload["level"] = new_level
            update_payload["max_xp"] = new_max_xp

        # 3. Update the Supabase database
        supabase.table('users').update(update_payload).eq('email', email).execute()

        return jsonify({
            "success": True,
            "inventory": current_inventory,
            "coins": new_coins,
            "currentXP": new_xp
        }), 200

    except Exception as e:
        print("Error claiming streak reward:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/get-streak-freezes', methods=['GET'])
def get_streak_freezes():
    email = request.args.get('email')
    if not email:
        return jsonify({'success': False, 'message': 'Email is required.'}), 400
    try:
        user_res = supabase.table('users').select('id').eq('email', email).execute()
        if not user_res.data:
            return jsonify({'success': False, 'message': 'User not found.'}), 404
        user_id = user_res.data[0]['id']

        sf_res = supabase.table('streak_freezes_inventory').select('*').eq('user_id', user_id).execute()
        if not sf_res.data:
            ensure_streak_freeze_row(user_id)  # backfills users who predate this feature
            sf_res = supabase.table('streak_freezes_inventory').select('*').eq('user_id', user_id).execute()

        record = sf_res.data[0]
        return jsonify({
            'success': True,
            'freezesCount': record.get('freezes_count', 0),
            'maxSlots': record.get('max_slots', 2)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# USER TOOLS (saved AI-generated study tools per user)
# =============================================================================

@app.route('/api/save-user-tool', methods=['POST'])
def save_user_tool():
    data = request.json or {}
    email = data.get('email')
    new_tool = data.get('tool')

    if not email or not new_tool:
        return jsonify({"success": False, "message": "Email and tool data required"}), 400

    try:
        user_res = supabase.table('users').select('inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        inventory = parse_json_field(user_res.data[0].get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        tool_id = new_tool.get('id')
        # keep EVERYTHING except an older copy of this same tool:
        # reward strings ("level_5_reward", "streak_3_reward") AND other tools
        kept = [t for t in inventory if not (isinstance(t, dict) and t.get('id') == tool_id)]
        inventory = [new_tool] + kept

        supabase.table('users').update({"inventory": inventory}).eq('email', email).execute()

        # the AI Tools page only wants tool objects
        return jsonify({"success": True, "inventory": [t for t in inventory if isinstance(t, dict)]}), 200

    except Exception as e:
        print("Error saving user tool:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/get-user-tools', methods=['GET'])
def get_user_tools():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        user_res = supabase.table('users').select('inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        inventory = parse_json_field(user_res.data[0].get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        return jsonify({"success": True, "inventory": [t for t in inventory if isinstance(t, dict)]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# FEEDBACK
# =============================================================================

@app.route('/api/send-feedback', methods=['POST'])
def send_feedback():
    data = request.json
    email = data.get('email', 'Anonymous User')
    rating = data.get('rating')
    feedback_text = data.get('feedbackText')

    if not rating or not feedback_text:
        return jsonify({"success": False, "message": "Rating and feedback text are required."}), 400

    try:
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")

        if not sender_email or not sender_password:
            return jsonify({"success": False, "message": "Email credentials are not configured in environment."}), 500

        # Build the email message using MIMEMultipart (same as forgot-password)
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = "supportstudycircle@gmail.com"  # Where feedback will be received
        msg['Subject'] = f"New Feedback Received: {rating} Experience - StudyCircle"

        email_body = f"""
Hello StudyCircle Team,

You have received a new feedback and feature idea from a user:

- User Email: {email}
- Rating: {rating}
- Feedback / Ideas: 
{feedback_text}

- StudyCircle Automated System
        """
        msg.attach(MIMEText(email_body, 'plain'))

        # Send the email via Gmail SMTP (same setup as forgot password)
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, "supportstudycircle@gmail.com", msg.as_string())
        server.quit()

        return jsonify({"success": True, "message": "Feedback sent successfully!"}), 200

    except Exception as e:
        print("Error sending feedback email:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# IT ADMIN MODULE
# =============================================================================

# In-memory presence tracker: { socket_id: {"email": str, "status": "ONLINE" | "STUDYING"} }
online_users = {}

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

@socketio.on('user_connected')
def handle_user_connected(data):
    email = (data.get('email') or '').strip().lower()
    if email:
        online_users[request.sid] = {'email': email, 'status': 'ONLINE'}
        try:
            supabase.table('users').update({'status': 'online'}).eq('email', email).execute()
        except Exception:
            pass
        broadcast_presence_to_admins()

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


# --- Admin authentication (professors / IT staff) ---

@app.route('/api/itadmin/login', methods=['POST'])
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


@app.route('/api/itadmin/change-password', methods=['POST'])
@require_admin(allow_pending=True)
def admin_change_password():
    data = request.get_json() or {}
    old_pw = data.get('old_password') or ''
    new_pw = data.get('new_password') or ''

    if not ADMIN_PASSWORD_REGEX.match(new_pw):
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


@app.route('/api/itadmin/create-admin', methods=['POST'])
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

@app.route('/api/itadmin/users', methods=['GET'])
@require_admin()
def admin_get_users():
    try:
        users_res = supabase.table('users').select('id, username, email, status, created_at').order('created_at', desc=True).execute()
        users = users_res.data or []

        # 1. Total sessions from study_sessions table
        sessions_res = supabase.table('study_sessions').select('email').execute()
        sessions_count_by_email = {}
        for s in (sessions_res.data or []):
            em = s.get('email')
            if em:
                em_lower = em.strip().lower()
                sessions_count_by_email[em_lower] = sessions_count_by_email.get(em_lower, 0) + 1

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
                    suspended_until_str = s.get('suspended_until')
                    if suspended_until_str:
                        try:
                            suspended_until = datetime.fromisoformat(suspended_until_str.replace('Z', '+00:00'))
                            if now >= suspended_until:
                                supabase.table('suspensions').update({'is_active': False}).eq('id', s['id']).execute()
                                continue
                        except Exception:
                            pass
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
                'totalSessions': sessions_count_by_email.get(user_email, 0),
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


@app.route('/api/itadmin/rooms', methods=['GET'])
@require_admin()
def admin_get_rooms():
    """Manage Rooms page: live member counts + Active / Inactive metrics.
    Active   = room currently has at least 1 person inside.
    Inactive = room has nobody inside."""
    try:
        res = supabase.table('rooms').select('*').order('created_at', desc=True).execute()
        rooms = res.data or []

        for r in rooms:
            r['current_members'] = get_live_count(r['name'])
            r['is_active'] = is_room_active(r) and not is_room_closed(r)
            r['status_display'] = 'Suspended' if is_room_closed(r) else ('Active' if r['is_active'] else 'Inactive')

        active = sum(1 for r in rooms if r['is_active'])

        return jsonify({
            'success': True,
            'rooms': rooms,
            'metrics': {
                'totalRooms': len(rooms),
                'activeRooms': active,
                'inactiveRooms': len(rooms) - active
            }
        }), 200
    except Exception as e:
        print("ADMIN GET ROOMS ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500

def _to_pht(iso_str):
    """ISO timestamp (UTC from Supabase) -> timezone-aware datetime in Philippine time."""
    if not iso_str:
        return None
    try:
        dt = datetime.fromisoformat(str(iso_str).replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(PHT)
    except Exception:
        return None


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


@app.route('/api/itadmin/logs', methods=['GET'])
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

@app.route('/api/itadmin/suspend-user', methods=['POST'])
@require_admin()
def admin_suspend_user():
    """Inserts a suspension record into the public.suspensions table."""
    data = request.json or {}
    target_email = data.get('email')
    reason = data.get('reason', 'Community Guidelines Violation')
    duration = data.get('duration', '24 Hours / 1 Day')
    custom_dt = data.get('customDatetime')
    notes = data.get('notes', '')

    if not target_email:
        return jsonify({'success': False, 'message': 'Email required'}), 400

    try:
        user_res = supabase.table('users').select('id').eq('email', target_email).execute()
        if not user_res.data:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user_id = user_res.data[0]['id']
        expiration_iso = apply_user_suspension(
            user_id, target_email, reason, duration, custom_dt, notes,
            request.admin['username']
        )

        return jsonify({
            'success': True,
            'message': f"Suspension logged for {target_email}",
            'suspended_until': expiration_iso
        }), 200

        # 1. Deactivate any prior active suspensions for this user
        supabase.table('suspensions').update({'is_active': False}).eq('user_id', user_id).execute()

        # 2. Insert new record in the dedicated suspensions table
        #    (admin name comes from the login token, not the frontend)
        supabase.table('suspensions').insert({
            'user_id': user_id,
            'email': target_email,
            'reason': reason,
            'duration': duration,
            'internal_notes': notes,
            'suspended_until': expiration_iso,
            'is_active': True,
            'admin_username': request.admin['username']
        }).execute()

        # Keep user status updated
        supabase.table('users').update({
            'status': 'Suspended'
        }).eq('id', user_id).execute()

        return jsonify({
            'success': True,
            'message': f"Suspension logged for {target_email}",
            'suspended_until': expiration_iso
        }), 200
    except Exception as e:
        print("ADMIN SUSPEND ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


# =============================================================================
# APP ENTRY POINT
# =============================================================================

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)