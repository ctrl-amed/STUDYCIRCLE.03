"""Authentication: signup (email code), Google signup, login, password reset/change."""
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from flask import Blueprint, jsonify, request

import config
from extensions import bcrypt, limiter, supabase
from services.suspension import get_active_suspension, suspended_response
from state import suspended_emails
from utils.helpers import ensure_streak_freeze_row, parse_json_field, parse_ts, send_plain_email

auth_bp = Blueprint('auth', __name__)


def is_umak_email(email):
    return bool(email) and bool(config.UMAK_EMAIL_REGEX.match(email.strip()))


# ---------- Email verification for sign-up ----------

def _new_code():
    return f"{secrets.randbelow(1000000):06d}"


def _code_hash(email, code):
    return hmac.new(config.SECRET_KEY.encode(), f"{email.lower()}:{code}".encode(), hashlib.sha256).hexdigest()


def _send_signup_code(email, username, code):
    send_plain_email(
        email,
        "StudyCircle: your verification code",
        f"Hi {username},\n\nYour StudyCircle verification code is:\n\n    {code}\n\n"
        f"It expires in {config.SIGNUP_CODE_TTL_MIN} minutes. If you did not try to sign up, ignore this email.\n\n"
        f"- StudyCircle Team"
    )


def _seconds_to_wait(last_sent_at):
    last = parse_ts(last_sent_at)
    if not last:
        return 0
    return max(0, config.SIGNUP_RESEND_SECONDS - (datetime.now(timezone.utc) - last).total_seconds())


@auth_bp.route('/api/signup', methods=['POST'])
@limiter.limit("100 per hour")
def signup():
    """STEP 1: check the form, save a pending signup, email a 6-digit code.
    The account is only created in /api/signup/verify after the code is correct."""
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    student_id = (data.get('student_id') or '').strip()
    password = data.get('password') or ''

    if not username or not email or not password or not student_id:
        return jsonify({'error': 'Please provide all required fields.'}), 400
    if not is_umak_email(email):
        return jsonify({'error': 'You must sign up with a valid @umak.edu.ph email.', 'field': 'email'}), 400
    if not config.STUDENT_ID_REGEX.match(student_id):
        return jsonify({'error': 'Invalid student ID format.', 'field': 'student_id'}), 400

    try:
        if supabase.table('users').select('id').eq('email', email).execute().data:
            return jsonify({'error': 'This email is already registered.', 'field': 'email'}), 400
        if supabase.table('users').select('id').eq('username', username).execute().data:
            return jsonify({'error': 'Username is already taken.', 'field': 'username'}), 400
        if supabase.table('users').select('id').eq('student_id', student_id).execute().data:
            return jsonify({'error': 'This student ID is already registered.', 'field': 'student_id'}), 400

        pend = supabase.table('pending_signups').select('last_sent_at').eq('email', email).execute()
        if pend.data:
            wait = _seconds_to_wait(pend.data[0].get('last_sent_at'))
            if wait > 0:
                return jsonify({
                    'error': f'Please wait {int(wait) + 1} seconds before asking for a new code.',
                    'retryAfter': int(wait) + 1
                }), 429

        code = _new_code()
        now = datetime.now(timezone.utc)
        supabase.table('pending_signups').upsert({
            'email': email,
            'username': username,
            'student_id': student_id,
            'password_hash': bcrypt.generate_password_hash(password).decode('utf-8'),
            'code_hash': _code_hash(email, code),
            'expires_at': (now + timedelta(minutes=config.SIGNUP_CODE_TTL_MIN)).isoformat(),
            'attempts': 0,
            'last_sent_at': now.isoformat(),
        }, on_conflict='email').execute()

        # Attempt to deliver via SMTP; print code to console as a testing fallback
        try:
            _send_signup_code(email, username, code)
            print(f"[SIGNUP CODE SENT] Dispatched to {email}")
        except Exception as mail_err:
            print(f"\n[SIGNUP CODE EMAIL FAILED]: {mail_err}")
            print("=" * 52)
            print(f"DEV VERIFICATION CODE FOR {email}: {code}")
            print("=" * 52 + "\n")

        return jsonify({
            'needs_verification': True,
            'email': email,
            'expiresInMinutes': config.SIGNUP_CODE_TTL_MIN
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/api/signup/resend', methods=['POST'])
@limiter.limit("100 per hour")
def signup_resend():
    """Sends a fresh code for a pending signup."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    try:
        res = supabase.table('pending_signups').select('*').eq('email', email).execute()
        if not res.data:
            return jsonify({'error': 'No pending sign-up for this email. Please sign up again.', 'expired': True}), 404
        p = res.data[0]

        wait = _seconds_to_wait(p.get('last_sent_at'))
        if wait > 0:
            return jsonify({
                'error': f'Please wait {int(wait) + 1} seconds before asking for a new code.',
                'retryAfter': int(wait) + 1
            }), 429

        code = _new_code()
        now = datetime.now(timezone.utc)
        supabase.table('pending_signups').update({
            'code_hash': _code_hash(email, code),
            'expires_at': (now + timedelta(minutes=config.SIGNUP_CODE_TTL_MIN)).isoformat(),
            'attempts': 0,
            'last_sent_at': now.isoformat(),
        }).eq('email', email).execute()

        try:
            _send_signup_code(email, p['username'], code)
            print(f"[SIGNUP CODE RESENT] Dispatched to {email}")
        except Exception as mail_err:
            print(f"\n[SIGNUP CODE EMAIL FAILED]: {mail_err}")
            print("=" * 52)
            print(f"DEV RESEND CODE FOR {email}: {code}")
            print("=" * 52 + "\n")

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/api/signup/verify', methods=['POST'])
@limiter.limit("30 per hour")
def signup_verify():
    """STEP 2: check the code, then create the account."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    code = re.sub(r'\D', '', str(data.get('code') or ''))
    if not email or len(code) != 6:
        return jsonify({'error': 'Enter the 6-digit code from your email.'}), 400

    try:
        res = supabase.table('pending_signups').select('*').eq('email', email).execute()
        if not res.data:
            return jsonify({'error': 'No pending sign-up for this email. Please sign up again.', 'expired': True}), 400
        p = res.data[0]

        expires = parse_ts(p.get('expires_at'))
        if not expires or datetime.now(timezone.utc) >= expires:
            supabase.table('pending_signups').delete().eq('email', email).execute()
            return jsonify({'error': 'This code has expired. Please sign up again.', 'expired': True}), 400

        attempts = int(p.get('attempts') or 0)
        if attempts >= config.SIGNUP_CODE_MAX_ATTEMPTS:
            supabase.table('pending_signups').delete().eq('email', email).execute()
            return jsonify({'error': 'Too many wrong codes. Please sign up again.', 'expired': True}), 400

        if not hmac.compare_digest(p['code_hash'], _code_hash(email, code)):
            supabase.table('pending_signups').update({'attempts': attempts + 1}).eq('email', email).execute()
            left = config.SIGNUP_CODE_MAX_ATTEMPTS - attempts - 1
            return jsonify({'error': f'Wrong code. {left} attempt(s) left.'}), 400

        # Code is correct. Re-check uniqueness in case someone took the name while verifying.
        clash = None
        if supabase.table('users').select('id').eq('email', email).execute().data:
            clash = ('email', 'This email is already registered.')
        elif supabase.table('users').select('id').eq('username', p['username']).execute().data:
            clash = ('username', 'That username was taken while you were verifying. Please sign up again.')
        elif supabase.table('users').select('id').eq('student_id', p['student_id']).execute().data:
            clash = ('student_id', 'This student ID is already registered.')
        if clash:
            supabase.table('pending_signups').delete().eq('email', email).execute()
            return jsonify({'error': clash[1], 'field': clash[0], 'expired': True}), 400

        response = supabase.table('users').insert({
            "username": p['username'],
            "email": email,
            "student_id": p['student_id'],
            "password": p['password_hash'],
            "coins": 100,
            "streak": 0,
            "inventory": [],
            "status": "offline",
            "max_xp": 100,
            "avatar_config": config.DEFAULT_AVATAR_CONFIG,
            "room_config": config.DEFAULT_ROOM_CONFIG,
            "unlocked_items": config.DEFAULT_UNLOCKED_ITEMS,
        }).execute()
        created_user = response.data[0] if response.data else {}
        supabase.table('pending_signups').delete().eq('email', email).execute()

        if created_user.get('id'):
            ensure_streak_freeze_row(created_user['id'])

        inv_data = created_user.get('inventory')
        if isinstance(inv_data, str):
            inv_data = json.loads(inv_data)

        return jsonify({
            'message': 'User created successfully!',
            'user': {
                'username': created_user.get('username', p['username']),
                'email': created_user.get('email', email),
                'studentId': created_user.get('student_id', p['student_id']),
                'coins': created_user.get('coins', 100),
                'streak': created_user.get('streak', 0),
                'bestStreak': created_user.get('best_streak') or 0,
                'roomsCreated': created_user.get('rooms_created') or 0,
                'currentXP': created_user.get('current_xp', 0),
                'maxXP': created_user.get('max_xp', 100),
                'level': created_user.get('level', 1),
                'inventory': inv_data or [],
                'avatarConfig': parse_json_field(created_user.get('avatar_config'), config.DEFAULT_AVATAR_CONFIG),
                'roomConfig': parse_json_field(created_user.get('room_config'), config.DEFAULT_ROOM_CONFIG),
                'unlockedItems': parse_json_field(created_user.get('unlocked_items'), config.DEFAULT_UNLOCKED_ITEMS)
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ---------- Google sign-in verification ----------

def verify_google_token(access_token):
    """Asks Google whether the token is real. Returns the profile dict or None."""
    if not access_token:
        return None
    try:
        r = requests.get('https://oauth2.googleapis.com/tokeninfo',
                         params={'access_token': access_token}, timeout=8)
        if r.status_code != 200:
            return None
        info = r.json()
        if not info.get('email') or str(info.get('email_verified')).lower() != 'true':
            return None
        if config.GOOGLE_CLIENT_ID and info.get('aud') != config.GOOGLE_CLIENT_ID:
            return None
        return info
    except Exception as e:
        print("Google token check failed:", e)
        return None


@auth_bp.route('/api/google-signup', methods=['POST'])
def google_signup():
    data = request.get_json() or {}
    info = verify_google_token(data.get('access_token'))
    if not info:
        return jsonify({'error': 'Google sign-in could not be verified. Please try again.'}), 401

    username = data.get('username')
    student_id = data.get('student_id')
    email = info['email'].strip()
    google_id = info.get('sub')

    if not is_umak_email(email):
        return jsonify({'error': 'You must sign in with a valid @umak.edu.ph email.'}), 400

    try:
        existing_user = supabase.table('users').select('*').eq('email', email).execute()

        if existing_user.data:
            user = existing_user.data[0]

            # --- CHECK ACTIVE SUSPENSION ---
            active_susp = get_active_suspension(user['id'])
            if active_susp:
                return suspended_response(active_susp)
            suspended_emails.discard(user['email'].strip().lower())

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

        if not config.STUDENT_ID_REGEX.match(student_id):
            return jsonify({'error': 'Invalid student ID format.', 'field': 'student_id'}), 400

        existing_student_id = supabase.table('users').select('*').eq('student_id', student_id).execute()
        if existing_student_id.data:
            return jsonify({'error': 'This student ID is already registered.', 'field': 'student_id'}), 400

        dummy_password = bcrypt.generate_password_hash(secrets.token_urlsafe(32)).decode('utf-8')

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
            "avatar_config": config.DEFAULT_AVATAR_CONFIG,
            "room_config": config.DEFAULT_ROOM_CONFIG,
            "unlocked_items": config.DEFAULT_UNLOCKED_ITEMS,
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
                'avatarConfig': parse_json_field(created_user.get('avatar_config'), config.DEFAULT_AVATAR_CONFIG),
                'roomConfig': parse_json_field(created_user.get('room_config'), config.DEFAULT_ROOM_CONFIG),
                'unlockedItems': parse_json_field(created_user.get('unlocked_items'), config.DEFAULT_UNLOCKED_ITEMS)
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
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

        # --- CHECK ACTIVE SUSPENSION ---
        active_susp = get_active_suspension(user['id'])
        if active_susp:
            return suspended_response(active_susp)

        suspended_emails.discard(user['email'].strip().lower())

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


@auth_bp.route('/api/forgot-password', methods=['POST'])
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


@auth_bp.route('/api/change-password', methods=['POST'])
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


@auth_bp.route('/api/change-password-direct', methods=['POST'])
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
