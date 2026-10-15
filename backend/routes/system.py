"""Health check, account status, global request guards and error handlers."""
from flask import Blueprint, jsonify, request

from extensions import supabase
from services.rooms_service import ensure_room_lifecycle_worker
from services.suspension import get_active_suspension, is_email_suspended
from utils.helpers import format_pht

system_bp = Blueprint('system', __name__)

# Blocks API calls from suspended users (rewards, session save, chat, etc.)
GUARD_SKIP = ('/api/login', '/api/signup', '/api/google-signup', '/api/forgot-password',
              '/api/change-password', '/api/itadmin', '/api/account-status')


@system_bp.route('/')
def home():
    return jsonify({"status": "success", "message": "StudyCircle Backend is live and running!"}), 200


# --- Return JSON when a user hits the rate limit ---
@system_bp.app_errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "success": False,
        "error": f"You are doing that too fast. {e.description}"
    }), 429


@system_bp.route('/api/account-status', methods=['GET'])
def account_status():
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({'suspended': False}), 200
    try:
        res = supabase.table('users').select('id').eq('email', email).execute()
        if res.data:
            susp = get_active_suspension(res.data[0]['id'])
            if susp:
                lift = format_pht(susp['suspended_until']) if susp.get('suspended_until') \
                    else 'Permanent, until reviewed by IT administration'
                return jsonify({'suspended': True, 'reason': susp.get('reason'), 'liftUntil': lift}), 200
    except Exception as e:
        print("account-status error:", e)
    return jsonify({'suspended': False}), 200


@system_bp.before_app_request
def _start_workers_on_request():
    ensure_room_lifecycle_worker()


@system_bp.before_app_request
def block_suspended_users():
    if request.method == 'OPTIONS' or not request.path.startswith('/api/') or request.path.startswith(GUARD_SKIP):
        return
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}
    email = (request.args.get('email') or body.get('email') or body.get('senderEmail')
             or body.get('userEmail') or body.get('sender_email') or '')
    if email and is_email_suspended(str(email)):
        return jsonify({'suspended': True, 'error': 'ACCOUNT SUSPENDED'}), 403
