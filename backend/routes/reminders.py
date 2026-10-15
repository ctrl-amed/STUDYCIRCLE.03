"""Email reminder settings endpoints (the scheduled sender lives in services/scheduler.py)."""
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

from extensions import supabase
from utils.helpers import parse_json_field, send_plain_email

reminders_bp = Blueprint('reminders', __name__)


@reminders_bp.route('/api/get-reminders', methods=['GET'])
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


@reminders_bp.route('/api/update-reminder', methods=['POST'])
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
                send_plain_email(
                    email,
                    "⏰ StudyCircle Reminder Set Successfully!",
                    f"Hello!\n\nYour daily study reminder has been set to {reminder_time} (Philippine Standard Time).\n\nKeep your focus strong!\n- StudyCircle Team"
                )
            except Exception as mail_err:
                print("[MAIL SEND ERROR]:", mail_err)

        return jsonify({"success": True, "message": "Reminder settings updated successfully!"}), 200
    except Exception as e:
        print("[UPDATE REMINDER ERROR]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@reminders_bp.route('/api/add-manual-reminder', methods=['POST'])
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
            if current_app.config.get('MAIL_USERNAME') and current_app.config.get('MAIL_PASSWORD'):
                send_plain_email(
                    email,
                    "⏰ StudyCircle Custom Reminder Added",
                    f"Hello!\n\nA manual study reminder has been scheduled for {dt_str} (Philippine Standard Time).\n\nKeep up the great work!\n- StudyCircle Team"
                )
                print(f"[MANUAL REMINDER CONFIRMATION SENT] to {email}")
        except Exception as mail_err:
            print("[EMAIL DISPATCH WARNING - check app password / credentials]:", mail_err)

        return jsonify({"success": True, "reminder": reminder_obj}), 200

    except Exception as e:
        print("[ADD MANUAL REMINDER ERROR]:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@reminders_bp.route('/api/remove-manual-reminder', methods=['POST'])
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


@reminders_bp.route('/api/test-email', methods=['POST'])
def test_email():
    data = request.json
    recipient_email = data.get('email')

    if not recipient_email:
        return jsonify({"success": False, "message": "No email provided"}), 400

    try:
        send_plain_email(
            recipient_email,
            "🧪 StudyCircle Test Email",
            "Hello! This is a test email from your StudyCircle app to verify that email reminders are working perfectly."
        )
        return jsonify({"success": True, "message": "Test email sent successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
