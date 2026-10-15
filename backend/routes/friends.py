"""Friends system (search, requests, accept/reject, list, remove).
The friendships table identifies people by sender_email / receiver_email."""
from flask import Blueprint, jsonify, request

from extensions import limiter, supabase

friends_bp = Blueprint('friends', __name__)


@friends_bp.route('/api/search-users', methods=['GET'])
def search_users():
    query = request.args.get('query', '').strip()
    current_email = request.args.get('email', '').strip()

    if not query:
        return jsonify({"success": True, "users": []}), 200

    try:
        excluded_emails = {current_email}

        if current_email:
            friendships_res = supabase.table('friendships').select('*').or_(
                f"sender_email.eq.{current_email},receiver_email.eq.{current_email}"
            ).execute()
            for item in (friendships_res.data or []):
                if item['status'] in ['accepted', 'pending']:
                    other_email = item['receiver_email'] if item['sender_email'] == current_email else item['sender_email']
                    excluded_emails.add(other_email)

        response = supabase.table('users').select('id, username, email, level, avatar_config').ilike('username', f"%{query}%").execute()
        filtered_users = [u for u in (response.data or []) if u['email'] not in excluded_emails]

        return jsonify({"success": True, "users": filtered_users}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@friends_bp.route('/api/send-friend-request', methods=['POST'])
def send_friend_request():
    data = request.get_json()
    sender_email = (data.get('senderEmail') or '').strip()
    receiver_email = (data.get('receiverEmail') or '').strip()

    if not sender_email or not receiver_email:
        return jsonify({"success": False, "message": "Sender and receiver emails are required."}), 400

    try:
        supabase.table('friendships').insert({
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "status": "pending"
        }).execute()
        return jsonify({"success": True, "message": "Friend request sent successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@friends_bp.route('/api/get-friends-data', methods=['GET'])
@limiter.limit("120 per minute")   # the header polls this every few seconds
def get_friends_data():
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    try:
        response = supabase.table('friendships').select('*').or_(
            f"sender_email.eq.{email},receiver_email.eq.{email}"
        ).execute()
        rows = response.data or []
        if not rows:
            return jsonify({"success": True, "friends": [], "requests": []}), 200

        # work out whose profile we need, then load them all in ONE query
        needed = set()
        for item in rows:
            status = item.get('status')
            sender_email = item.get('sender_email')
            receiver_email = item.get('receiver_email')
            if status == 'accepted':
                needed.add(receiver_email if sender_email == email else sender_email)
            elif status == 'pending' and receiver_email == email:
                needed.add(sender_email)
        needed.discard(None)

        profiles = {}
        if needed:
            u_res = supabase.table('users') \
                .select('username, email, level, avatar_config') \
                .in_('email', list(needed)).execute()
            profiles = {u['email']: u for u in (u_res.data or [])}

        friends = []
        requests_list = []
        for item in rows:
            status = item.get('status')
            sender_email = item.get('sender_email')
            receiver_email = item.get('receiver_email')

            if status == 'accepted':
                friend_email = receiver_email if sender_email == email else sender_email
                if friend_email in profiles:
                    friends.append(profiles[friend_email])
            elif status == 'pending' and receiver_email == email:
                if sender_email in profiles:
                    requests_list.append({"id": item.get('id'), "sender": profiles[sender_email]})

        return jsonify({"success": True, "friends": friends, "requests": requests_list}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@friends_bp.route('/api/handle-friend-request', methods=['POST'])
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


@friends_bp.route('/api/remove-friend', methods=['POST'])
def remove_friend():
    data = request.get_json()
    user_email = (data.get('userEmail') or '').strip()
    friend_email = (data.get('friendEmail') or '').strip()

    if not user_email or not friend_email:
        return jsonify({"success": False, "message": "Both emails are required."}), 400

    try:
        supabase.table('friendships').delete().or_(
            f"and(sender_email.eq.{user_email},receiver_email.eq.{friend_email}),"
            f"and(sender_email.eq.{friend_email},receiver_email.eq.{user_email})"
        ).execute()
        return jsonify({"success": True, "message": "Friend removed successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
