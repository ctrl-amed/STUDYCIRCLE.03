"""Background jobs: study reminders, expired-suspension lifting, pending-signup purge."""
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from extensions import supabase
from services.suspension import lift_expired_suspensions
from utils.helpers import parse_json_field, send_plain_email

# Same env var used by auth.py. Set FRONTEND_URL in .env / Render when you deploy.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')


def send_study_reminder(app):
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

                # One user's failure must not stop everyone else's reminder
                try:
                    u_res = supabase.table('users').select('email, username').eq('id', item['user_id']).execute()
                    if not u_res.data:
                        continue

                    user = u_res.data[0]
                    target_email = user['email']
                    username = user['username']

                    send_plain_email(
                        target_email,
                        "⏰ StudyCircle Daily Reminder: Time to Focus!",
                        f"Hi {username},\n\nThis is your daily study reminder! Log in to StudyCircle and keep your streak going! 🔥\n\n"
                        f"Open StudyCircle: {FRONTEND_URL}\n\n- StudyCircle Team"
                    )

                    # Only marked as sent after the email really went out
                    supabase.table('study_reminders').update({
                        'last_sent_date': today_date_str
                    }).eq('user_id', item['user_id']).execute()

                    print(f"[DAILY REMINDER SENT] to {target_email} at {current_time_str} PHT")
                except Exception as user_err:
                    print(f"[DAILY REMINDER FAILED for user_id {item.get('user_id')}]:", user_err)
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
                            title = item.get('title') or 'Study Time'

                            try:
                                send_plain_email(
                                    target_email,
                                    "⏰ StudyCircle Scheduled Reminder: Study Time!",
                                    f"Hi {username},\n\nThis is your scheduled study reminder: {title} ({rem_dt}).\n\n"
                                    f"Open StudyCircle now and jump into a focus session: {FRONTEND_URL}\n\n- StudyCircle Team"
                                )
                                item['sent'] = True
                                modified = True
                                print(f"[MANUAL REMINDER SENT] to {target_email} for {rem_dt}")
                            except Exception as m_err:
                                print(f"[MANUAL REMINDER SEND FAILED for {target_email}]:", m_err)

                if modified:
                    try:
                        supabase.table('users').update({'inventory': inv}).eq('id', u['id']).execute()
                    except Exception as save_err:
                        print(f"[MANUAL REMINDER SAVE FAILED for user {u.get('id')}]:", save_err)

        except Exception as e:
            print("[MANUAL REMINDER WORKER ERROR]:", e)


def purge_pending_signups():
    """Deletes sign-ups whose verification code has expired."""
    try:
        supabase.table('pending_signups').delete() \
            .lt('expires_at', datetime.now(timezone.utc).isoformat()).execute()
    except Exception as e:
        print("[PENDING SIGNUP PURGE ERROR]:", e)


def start_scheduler(app):
    """Checks every minute for scheduled reminders and expired suspensions."""
    scheduler = BackgroundScheduler()
    # max_instances=1 + coalesce: if a run is slow (e.g. SMTP timeout), don't pile up overlapping runs
    scheduler.add_job(func=send_study_reminder, args=[app], trigger="interval", minutes=1,
                      id="study_reminders", replace_existing=True, max_instances=1, coalesce=True)
    scheduler.add_job(func=lift_expired_suspensions, trigger="interval", minutes=1,
                      id="lift_suspensions", replace_existing=True, max_instances=1, coalesce=True)
    scheduler.add_job(func=purge_pending_signups, trigger="interval", minutes=10,
                      id="purge_pending", replace_existing=True)

    # Pinipigilan ang pagtakbo sa reloader process para hindi mag-conflict ang sockets sa Windows
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        scheduler.start()
    return scheduler