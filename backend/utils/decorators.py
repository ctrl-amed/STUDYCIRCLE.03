"""Admin authentication helpers and the require_admin decorator."""
import time
from functools import wraps

from flask import jsonify, request
from itsdangerous import BadSignature, SignatureExpired

import config
from extensions import supabase, token_serializer

# Lock an admin account for 5 min after 5 wrong passwords (in memory)
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
    if rec['count'] >= config.ADMIN_MAX_ATTEMPTS:
        rec['locked_until'] = time.time() + config.ADMIN_LOCK_SECONDS


def require_admin(allow_pending=False, super_only=False):
    """Protects a route. Reads the Bearer token, re-checks the admin in the DB
    (so deactivating a professor takes effect immediately), and sets request.admin."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
            try:
                payload = token_serializer.loads(token, max_age=config.ADMIN_TOKEN_MAX_AGE)
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
