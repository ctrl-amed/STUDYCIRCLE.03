"""Study sessions, XP engine, leaderboard, progress, rewards and streak freezes."""
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

import config
from extensions import supabase
from utils.helpers import (PHT, _fetch_all, _iso_utc, _to_pht, calculate_level_from_total_xp,
                           ensure_streak_freeze_row, parse_json_field)

study_bp = Blueprint('study', __name__)


# =============================================================================
# SESSIONS
# =============================================================================

@study_bp.route('/api/save-session', methods=['POST'])
def save_session():
    data = request.json or {}
    email = data.get('email')
    activity = data.get('activity') or data.get('workType') or 'Focus Session'
    technique = data.get('technique') or data.get('techniqueName') or 'Pomodoro'
    duration = int(data.get('duration') or data.get('focusTime') or data.get('durationMinutes') or 0)
    total_tasks = int(data.get('totalTasks', 0))
    completed_tasks = int(data.get('completedTasks', 0))

    try:
        u_res = supabase.table('users').select('id').eq('email', email).execute()
        if not u_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        supabase.table('study_sessions').insert({
            "user_id": u_res.data[0]['id'],
            "activity_name": activity,
            "technique": technique,
            "duration_minutes": duration,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks
        }).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Productivity Score (Chapter 3, Productivity-Score Design, Formulas 3.8 - 3.10):
#   PS = (0.30 SC + 0.30 FT + 0.25 TC + 0.15 SS) x 100, every term is 0..1.
#   SC = session-completion value (1 if the session was completed, otherwise 0)
#   FT = normalized focus time = min(CFM / PFM, 1) (completed / planned focus minutes)
#   TC = task-completion value = completed tasks / total tasks
#   SS = normalized study streak = min(SD / 7, 1)   (seven-day reference period)
# Document sample: 40 of 50 min, task completed, 5-day streak ->
#   0.30(1) + 0.30(0.8) + 0.25(1) + 0.15(5/7) = 0.8971 -> 89.71
PS_WEIGHTS = {'SC': 0.30, 'FT': 0.30, 'TC': 0.25, 'SS': 0.15}   # sum = 1.00


def productivity_score(sc, ft, tc, ss):
    """Each input is clamped to 0..1. Returns 0..100 with 2 decimals."""
    clamp = lambda v: max(0.0, min(1.0, float(v or 0)))
    total = (PS_WEIGHTS['SC'] * clamp(sc) + PS_WEIGHTS['FT'] * clamp(ft)
             + PS_WEIGHTS['TC'] * clamp(tc) + PS_WEIGHTS['SS'] * clamp(ss))
    return round(total * 100, 2)


def calculate_productivity_score(consumed_ratio, tasks_completed, total_tasks,
                                 streak, session_completed=True):
    ft = max(0.0, min(1.0, consumed_ratio))                      # FT = CFM / PFM
    sc = 1.0 if session_completed else 0.0                       # SC
    tc = (tasks_completed / total_tasks) if total_tasks > 0 else ft   # TC (no tasks: use focus ratio)
    ss = min(streak / 7, 1.0)                                    # SS
    return productivity_score(sc, ft, tc, ss)


# XP and Coin Distribution (Chapter 3, Table 3.7, Formulas 3.13 and 3.14).
# The award depends only on the COMPLETED focus time (CFM, in minutes):
#
#     Completed Focus Time     XP Award     Coin Award
#     Less than 25 minutes     0 XP         0 Coins
#     25 - 49 minutes          25 XP        5 Coins
#     50 - 89 minutes          40 XP        8 Coins
#     90 minutes or more       60 XP        12 Coins
def xp_and_coins_for_focus_time(cfm):
    """Returns (xp, coins) for the completed focus minutes `cfm`, exactly as in Table 3.7."""
    if cfm < config.MIN_SESSION_MINUTES:    # 25 minutes
        return 0, 0
    elif cfm < 50:
        return 25, 5
    elif cfm < 90:
        return 40, 8
    else:
        return 60, 12


@study_bp.route('/api/v1/sessions/complete', methods=['POST'])
def complete_focus_session():
    """Saves a finished focus session and awards XP / coins according to Table 3.7."""
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
    room_size = int(data.get('roomSize', 1))

    nudge_pauses = max(0, int(data.get('nudgePauses', 0) or 0))
    paused_seconds = max(0, int(data.get('pausedSeconds', 0) or 0))

    # Which room this session happened in (multiplayer only), saved to study_sessions.room_id
    try:
        room_id = int(data.get('roomId')) if (is_multiplayer and data.get('roomId') is not None) else None
    except (TypeError, ValueError):
        room_id = None

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
        current_xp = int(user.get('current_xp') or 0)
        current_coins = int(user.get('coins') or 0)
        current_level = int(user.get('level') or 1)
        current_streak = int(user.get('streak') or 0)

        # Completed focus time (CFM): planned minutes minus the time the timer was stopped
        total_focus_seconds = max(1, int(data.get('totalFocusSeconds') or duration_minutes * 60))
        consumed_ratio = max(0.0, 1.0 - (paused_seconds / total_focus_seconds))
        completed_focus_minutes = duration_minutes * consumed_ratio

        # Constants aligned with thesis parameters
        MIN_SESSION_MINUTES = 25
        SUCCESS_STATUSES = {"completed", "early", "on-time", "on time"}

        # XP and coins: fixed tiers from Table 3.7 (no multipliers)
        xp_gained = 0
        coins_gained = 0
        
        if completed_focus_minutes >= 90:
            xp_gained, coins_gained = 60, 12
        elif completed_focus_minutes >= 50:
            xp_gained, coins_gained = 40, 8
        elif completed_focus_minutes >= MIN_SESSION_MINUTES:
            xp_gained, coins_gained = 25, 5

        # Sessions under the 25-minute minimum are still saved but earn no XP/Coins
        below_minimum = completed_focus_minutes < MIN_SESSION_MINUTES

        # Look at this user's session history for the streak check below.
        today = datetime.now(PHT).date()
        yesterday = today - timedelta(days=1)

        history_res = supabase.table('study_sessions').select('created_at, duration_minutes, task_status').eq('user_id', user_id).execute()

        studied_today_qualifying = False
        studied_yesterday_qualifying = False
        
        for s in (history_res.data or []):
            dt = _to_pht(s.get('created_at'))
            if not dt:
                continue
                
            s_dur = int(s.get('duration_minutes') or 0)
            s_status = str(s.get('task_status') or '').strip().lower()
            
            # Check if it was a qualifying session (>= 25 mins and task completed)
            if s_dur >= MIN_SESSION_MINUTES and s_status in SUCCESS_STATUSES:
                if dt.date() == today:
                    studied_today_qualifying = True
                elif dt.date() == yesterday:
                    studied_yesterday_qualifying = True

        # Cumulative totals
        new_xp = current_xp + xp_gained
        new_coins = current_coins + coins_gained

        # Level calculation
        new_level, new_max_xp = calculate_level_from_total_xp(new_xp)

        # --- STUDY STREAK LOGIC (Aligned with Document) ---
        is_current_qualifying = (not below_minimum) and (task_status.strip().lower() in SUCCESS_STATUSES)
        
        freeze_used = False
        new_streak = current_streak

        # Update streak ONLY if current session is qualifying (Formula 3.15)
        if is_current_qualifying:
            if studied_today_qualifying:
                # Already logged a qualifying session today — keep the streak where it is
                new_streak = current_streak if current_streak > 0 else 1
            elif studied_yesterday_qualifying or current_streak == 0:
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

        productivity_score = calculate_productivity_score(
            consumed_ratio, tasks_completed, total_tasks, new_streak,
            session_completed=(task_status.strip().lower() in SUCCESS_STATUSES)
        )

        # 1. Update the users table (streak included)
        supabase.table('users').update({
            "current_xp": new_xp,
            "coins": new_coins,
            "level": new_level,
            "max_xp": new_max_xp,
            "streak": new_streak,
            "best_streak": new_best_streak
        }).eq('id', user_id).execute()

        # 2. Insert into study_sessions table, including feedback fields
        supabase.table('study_sessions').insert({
            "user_id": user_id,
            "activity_name": activity_name,
            "technique": technique,
            "duration_minutes": duration_minutes,
            "total_tasks": total_tasks,
            "completed_tasks": tasks_completed,
            "tasks_list": tasks_list,
            "task_status": task_status,
            "productivity_level": productivity_level,
            "accomplished_text": accomplished_text,
            "exp_gained": xp_gained,
            "coins_gained": coins_gained,
            "nudge_pauses": nudge_pauses,
            "paused_seconds": paused_seconds,
            "room_id": room_id,
        }).execute()

        print(f"[XP SUCCESS] {user['email']}: +{xp_gained} XP, +{coins_gained} Coins "
              f"(CFM {completed_focus_minutes:.1f} min), Level: {new_level}, Streak: {new_streak}")

        return jsonify({
            "success": True,
            "expGained": xp_gained,
            "coinsGained": coins_gained,
            "currentXP": new_xp,
            "totalExp": new_xp,
            "coins": new_coins,
            "level": new_level,
            "maxXP": new_max_xp,
            "streak": new_streak,
            "bestStreak": new_best_streak,
            "streakFreezeUsed": freeze_used,
            "didLevelUp": new_level > current_level,
            "nudgePauses": nudge_pauses,
            "consumedRatio": round(consumed_ratio, 3),
            "completedFocusMinutes": round(completed_focus_minutes, 1),
            "productivityScore": productivity_score,
            "belowMinimum": below_minimum,
            "minSessionMinutes": MIN_SESSION_MINUTES,
        }), 200

    except Exception as e:
        print("[XP ERROR]:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@study_bp.route('/api/get-all-sessions', methods=['GET'])
def get_all_sessions():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
    try:
        u_res = supabase.table('users').select('id').eq('email', email).execute()
        if not u_res.data:
            return jsonify({"success": True, "sessions": []}), 200

        response = supabase.table('study_sessions').select('*').eq('user_id', u_res.data[0]['id']).order('created_at', desc=True).execute()
        return jsonify({"success": True, "sessions": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# LEADERBOARD
# =============================================================================

def _focus_minutes_by_user(since=None):
    """Total focus minutes per user id (optionally only sessions created since `since`)."""
    def build():
        q = supabase.table('study_sessions').select('user_id, duration_minutes')
        q = q.gte('duration_minutes', config.MIN_SESSION_MINUTES)   # only qualifying sessions count
        if since is not None:
            q = q.gte('created_at', _iso_utc(since))
        return q.order('id')

    totals = {}
    for s in _fetch_all(build):
        uid = s.get('user_id')
        if uid is not None:
            totals[uid] = totals.get(uid, 0) + int(s.get('duration_minutes') or 0)
    return totals


@study_bp.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Leaderboard ranked by TOTAL FOCUS TIME (ties broken by XP).
    'this-month' only counts sessions since the 1st of the month, Philippine time."""
    try:
        users = supabase.table('users') \
            .select('id, username, avatar_url, avatar_config, current_xp, streak') \
            .execute().data or []

        def avatar(u):
            return u.get('avatar_url') or \
                f"https://api.dicebear.com/7.x/pixel-art/svg?seed={u.get('username')}"

        def by_focus(totals):
            rows = [u for u in users if totals.get(u['id'], 0) > 0]
            rows.sort(key=lambda u: (-totals[u['id']], -(u.get('current_xp') or 0)))
            out = []
            for i, u in enumerate(rows[:10]):
                m = totals[u['id']]
                out.append({
                    "rank": i + 1,
                    "username": u['username'],
                    "pfp": avatar(u),
                    "avatar_config": u.get('avatar_config'),
                    "score": f"{m // 60}h {m % 60:02d}m"
                })
            return out

        now = datetime.now(PHT)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        streak_rows = sorted(users, key=lambda u: -(u.get('streak') or 0))[:10]
        streaks = [{
            "rank": i + 1,
            "username": u['username'],
            "pfp": avatar(u),
            "avatar_config": u.get('avatar_config'),
            "streak": f"{u.get('streak') or 0} d"
        } for i, u in enumerate(streak_rows)]

        return jsonify({
            "success": True,
            "leaderboard": {
                "all-time": by_focus(_focus_minutes_by_user()),
                "this-month": by_focus(_focus_minutes_by_user(month_start)),
                "streaks": streaks
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# PROGRESS, LEVELS & REWARDS
# =============================================================================

@study_bp.route('/api/update-progress', methods=['POST'])
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


@study_bp.route('/api/claim-reward', methods=['POST'])
def claim_reward():
    data = request.json or {}
    email = (data.get('email') or '').strip()
    try:
        level = int(data.get('level'))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "A valid level is required"}), 400

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
    if level not in config.LEVEL_REWARD_TIERS:
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


@study_bp.route('/api/claim-streak-reward', methods=['POST'])
def claim_streak_reward():
    data = request.json or {}
    email = (data.get('email') or '').strip()

    try:
        days = int(data.get('days'))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "A valid streak day is required"}), 400

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    reward = config.STREAK_REWARDS.get(days)
    if not reward:
        return jsonify({"success": False, "message": "Unknown streak reward."}), 400

    try:
        user_res = supabase.table('users') \
            .select('inventory, coins, current_xp, level, streak').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user = user_res.data[0]

        # the server decides whether the streak really reached this tier
        if int(user.get('streak') or 0) < days:
            return jsonify({"success": False, "message": f"Reach a {days}-day streak first."}), 403

        inventory = parse_json_field(user.get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        reward_key = f"streak_{days}_reward"
        if reward_key in inventory:
            return jsonify({"success": False, "message": "Reward already claimed."}), 400

        new_coins = int(user.get('coins') or 0) + reward["coins"]
        new_xp = int(user.get('current_xp') or 0) + reward["xp"]
        inventory.append(reward_key)

        update_payload = {
            "inventory": inventory,
            "coins": new_coins,
            "current_xp": new_xp,
        }

        if reward["xp"] > 0:
            new_level, new_max_xp = calculate_level_from_total_xp(new_xp)
            update_payload["level"] = new_level
            update_payload["max_xp"] = new_max_xp

        res = supabase.table('users').update(update_payload).eq('email', email).execute()
        if not res.data:
            print("[STREAK REWARD] update returned no rows (RLS or wrong email?)")
            return jsonify({"success": False, "message": "Could not save reward."}), 500

        saved = res.data[0]
        return jsonify({
            "success": True,
            "inventory": parse_json_field(saved.get('inventory'), inventory),
            "coins": saved.get('coins'),
            "currentXP": saved.get('current_xp'),
            "level": saved.get('level'),
            "maxXP": saved.get('max_xp'),
        }), 200

    except Exception as e:
        print("Error claiming streak reward:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@study_bp.route('/api/get-streak-freezes', methods=['GET'])
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