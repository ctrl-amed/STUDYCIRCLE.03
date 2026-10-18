"""User reports and the admin side of handling them (dismiss / warn / suspend / close room)."""
import re
import time

from flask import Blueprint, jsonify, request

from extensions import socketio, supabase
from services.rooms_service import suspend_room
from services.suspension import (apply_user_suspension, emit_to_user, find_report_target_user,
                                 get_active_warning_count)
from state import room_members, room_warnings
from utils.decorators import require_admin
from utils.helpers import parse_json_field

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/api/reports', methods=['POST'])
def create_report():
    data = request.json or {}
    try:
        response = supabase.table('reports').insert({
            "reporter_username": data.get('reporter_username'),  # Changed from reporter_email
            "target_type": data.get('target_type'),       # 'room', 'user', or 'message'
            "target_details": data.get('target_details'),  # JSON details object
            "reason": data.get('reason'),
            "additional_notes": data.get('additional_notes', ''),
            "status": "pending"
        }).execute()
        return jsonify({"success": True, "report": response.data[0]}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route('/api/itadmin/reports', methods=['GET'])
@require_admin()
def admin_get_reports():
    try:
        response = supabase.table('reports').select('*').order('created_at', desc=True).execute()
        return jsonify({"success": True, "reports": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route('/api/itadmin/reports/<report_id>', methods=['PATCH'])
@require_admin()
def admin_update_report(report_id):
    data = request.json or {}
    status = data.get('status')  # 'resolved' or 'closed'
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

        details = parse_json_field(rep_row.get('target_details'), {}) or {}
        is_warning_action = bool(action_taken and 'warn' in action_taken.lower())

        # SUSPEND (user / message report)
        if is_suspend_action and is_message_or_user:
            try:
                target = find_report_target_user(details)
                if target:
                    raw_dur = data.get('suspensionDuration') or data.get('duration') or '24 Hours / 1 Day'
                    custom_dt = data.get('customDatetime')
                    duration_label = raw_dur
                    if str(raw_dur).lower().startswith('custom'):
                        duration_label = 'Custom Date/Time'
                        if not custom_dt and ':' in raw_dur:
                            custom_dt = raw_dur.split(':', 1)[1].strip()
                    apply_user_suspension(
                        target['id'], target['email'],
                        reason or 'Community Guidelines Violation',
                        duration_label, custom_dt, notes or '',
                        request.admin['username']
                    )
                else:
                    print(f"[REPORT SUSPEND] Could not find target user for report {report_id}: {details}")
            except Exception as susp_err:
                print(f"[REPORT SUSPEND ERROR] report {report_id}:", susp_err)

        # WARNING: lalabas na modal sa room (room report) o sa user (user/message report)
        if is_warning_action:
            try:
                payload = {
                    'reason': reason or 'Community Guidelines Violation',
                    'notes': notes or '',
                    'targetType': target_type,
                    'reportId': str(report_id),
                }
                if target_type == 'room':
                    room_name = details.get('roomName')
                    if room_name:
                        room_payload = {**payload, 'room': room_name}
                        room_warnings[room_name] = {
                            'payload': room_payload,
                            'ts': time.time(),
                            'seen': {m['username'] for m in room_members.get(room_name, [])},
                        }
                        socketio.emit('room_warning', room_payload, room=room_name)
                else:
                    target = find_report_target_user(details)
                    if target:
                        # the report row is already updated above, so this count includes it
                        payload['warningCount'] = get_active_warning_count(target['username'])
                        emit_to_user(target['email'], 'account_warning', payload, target.get('username'))
                        # offline? No queue needed: get_pending_warnings() reads it from the DB on next connect
                    else:
                        print(f"[REPORT WARNING] target user not found: {details}")
            except Exception as warn_err:
                print(f"[REPORT WARNING ERROR] report {report_id}:", warn_err)

        # CLOSE ROOM
        if target_type == 'room' and action_taken and re.search(r'suspend|close', action_taken, re.I):
            room_name = details.get('roomName')
            if room_name:
                suspend_room(room_name, reason or 'Community Guidelines Violation')

        return jsonify({"success": True, "message": "Report updated successfully", "report": response.data}), 200
    except Exception as e:
        print("ERROR UPDATING REPORT:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500
