"""Chat / messaging. The messages table identifies people by sender_email / receiver_email."""
from flask import Blueprint, jsonify, request

from extensions import limiter, supabase

messages_bp = Blueprint('messages', __name__)


@messages_bp.route('/api/messages', methods=['GET'])
@limiter.limit("60 per minute")
def get_messages():
    user1 = (request.args.get('user1') or '').strip()
    user2 = (request.args.get('user2') or '').strip()

    if not user1 or not user2:
        return jsonify({"success": False, "message": "Missing user emails"}), 400

    try:
        response = supabase.table('messages').select('*').or_(
            f"and(sender_email.eq.{user1},receiver_email.eq.{user2}),"
            f"and(sender_email.eq.{user2},receiver_email.eq.{user1})"
        ).order('created_at').execute()

        return jsonify({"success": True, "messages": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@messages_bp.route('/api/latest-messages', methods=['GET'])
@limiter.limit("120 per minute")   # the header polls this every few seconds
def latest_messages():
    """Newest message each person sent TO this user: { friendEmail: {message, created_at} }.
    The header compares these times with when the user last opened each chat to show the unread dot."""
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    try:
        res = supabase.table('messages') \
            .select('sender_email, message, created_at') \
            .eq('receiver_email', email) \
            .order('created_at', desc=True) \
            .limit(500).execute()

        latest = {}
        for m in (res.data or []):
            sender = m.get('sender_email')
            if sender and sender not in latest:        # rows are newest-first
                latest[sender] = {'message': m.get('message'), 'created_at': m.get('created_at')}

        return jsonify({"success": True, "latest": latest}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@messages_bp.route('/api/send-message', methods=['POST'])
@limiter.limit("30 per minute")
def send_message():
    data = request.json
    sender = (data.get('sender_email') or '').strip()
    receiver = (data.get('receiver_email') or '').strip()
    message = data.get('message')

    if not sender or not receiver or not message:
        return jsonify({"success": False, "message": "Incomplete data"}), 400

    try:
        supabase.table('messages').insert({
            "sender_email": sender,
            "receiver_email": receiver,
            "message": message
        }).execute()

        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
