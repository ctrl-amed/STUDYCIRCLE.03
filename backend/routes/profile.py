"""Profile & customization."""
import json

from flask import Blueprint, jsonify, request

from extensions import supabase
from utils.helpers import parse_json_field

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/api/update-profile', methods=['POST'])
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


@profile_bp.route('/api/get-profile', methods=['GET'])
def get_profile():
    """Returns the real database row for the Profile page (avatar, rooms created, best streak, etc.)."""
    email = (request.args.get('email') or '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required.'}), 400
    try:
        res = supabase.table('users').select(
            'username, email, level, current_xp, max_xp, coins, streak, best_streak, rooms_created, avatar_config, room_config, inventory'
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
                'roomConfig': parse_json_field(u.get('room_config')),
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@profile_bp.route('/api/update-customization', methods=['POST'])
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


@profile_bp.route('/api/update-coins', methods=['POST'])
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
