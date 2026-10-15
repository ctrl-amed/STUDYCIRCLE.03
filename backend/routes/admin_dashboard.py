"""IT admin dashboard  ->  GET /api/itadmin/dashboard

Query params:
  range = Today | Yesterday | Last 7 days | Last 30 days | Custom
  start / end = YYYY-MM-DD (only when range=Custom, both inclusive, Philippine time)
"""
from bisect import bisect_right
from datetime import datetime

from flask import Blueprint, jsonify, request

from extensions import supabase
from state import room_members
from utils.decorators import require_admin
from utils.helpers import (PHT, _build_buckets, _count_between, _fetch_all, _iso_utc,
                           _pct_change, _resolve_range, _to_pht, parse_json_field)

admin_dashboard_bp = Blueprint('admin_dashboard', __name__)


def _alert_title(target_type, details):
    if target_type == 'room':
        return details.get('roomName') or details.get('host') or 'Room report'
    return (details.get('username') or details.get('reportedUsername')
            or details.get('sender') or 'User report')


def _live_status(raw):
    s = str(raw or '').lower()
    if 'break' in s:
        return 'Break'
    if 'left' in s:
        return 'Left Room'
    return 'Studying'


@admin_dashboard_bp.route('/api/itadmin/dashboard', methods=['GET'])
@require_admin()
def admin_dashboard():
    try:
        range_key = request.args.get('range', 'Today')
        try:
            start, end = _resolve_range(range_key, request.args.get('start'), request.args.get('end'))
        except (ValueError, TypeError) as ve:
            return jsonify({'success': False, 'error': f'Invalid date range: {ve}'}), 400

        length = end - start
        prev_start, prev_end = start - length, start
        now_pht = datetime.now(PHT)
        includes_now = start <= now_pht < end

        # ---------------- Metric cards ----------------
        users_cur = _count_between('users', 'created_at', end=end)
        users_prev = _count_between('users', 'created_at', end=start)

        # Rooms: created in the period, plus rooms that have people inside right now
        rooms_in_period = supabase.table('rooms').select('name') \
            .gte('created_at', _iso_utc(start)).lt('created_at', _iso_utc(end)).execute().data or []
        room_names = {r['name'] for r in rooms_in_period}
        if includes_now:
            room_names |= {n for n, m in room_members.items() if m}
        rooms_prev = _count_between('rooms', 'created_at', prev_start, prev_end)

        sessions = _fetch_all(lambda: supabase.table('study_sessions')
                              .select('user_id, created_at, task_status')
                              .gte('created_at', _iso_utc(start))
                              .lt('created_at', _iso_utc(end))
                              .order('created_at'))
        sessions_prev = _count_between('study_sessions', 'created_at', prev_start, prev_end)

        reports_cur = _count_between('reports', 'created_at', start, end)
        reports_prev = _count_between('reports', 'created_at', prev_start, prev_end)

        metrics = {
            'totalUsers':         {'value': users_cur,          'changePct': _pct_change(users_cur, users_prev)},
            'activeRooms':        {'value': len(room_names),    'changePct': _pct_change(len(room_names), rooms_prev)},
            'studySessions':      {'value': len(sessions),      'changePct': _pct_change(len(sessions), sessions_prev)},
            'reportedActivities': {'value': reports_cur,        'changePct': _pct_change(reports_cur, reports_prev)},
        }

        # ---------------- Line chart ----------------
        buckets = _build_buckets(start, end)
        starts = [b[0] for b in buckets]
        total = [0] * len(buckets)
        completed = [0] * len(buckets)
        users_seen = [set() for _ in buckets]

        for s in sessions:
            dt = _to_pht(s.get('created_at'))
            if not dt:
                continue
            idx = bisect_right(starts, dt) - 1
            if idx < 0:
                continue
            total[idx] += 1
            if (s.get('task_status') or '').strip().lower() == 'completed':
                completed[idx] += 1
            if s.get('user_id'):
                users_seen[idx].add(s['user_id'])

        chart = {
            'labels': [b[1] for b in buckets],
            'total': total,
            'completed': completed,
            'active': [len(u) for u in users_seen],       # distinct users per slot
        }

        # ---------------- Recent alerts (latest reports) ----------------
        rep_rows = supabase.table('reports') \
            .select('id, ticket_id, target_type, target_details, reason, status, created_at') \
            .order('created_at', desc=True).limit(50).execute().data or []

        alerts = []
        for r in rep_rows:
            details = parse_json_field(r.get('target_details'), {}) or {}
            alerts.append({
                'id': r['id'],
                'ticketId': r.get('ticket_id'),
                'type': r.get('target_type'),                 # 'room' | 'user' | 'message'
                'title': _alert_title(r.get('target_type'), details),
                'reason': r.get('reason') or '',
                'status': r.get('status'),
                'createdAt': r.get('created_at'),
            })

        # ---------------- User activity (live + recent) ----------------
        activity = []

        # Live: people currently inside a study room
        for room_name, members in room_members.items():
            for m in members:
                activity.append({
                    'id': f"live-{room_name}-{m['username']}",
                    'user': m['username'],
                    'room': room_name,
                    'status': _live_status(m.get('status')),
                    'createdAt': None,
                    'live': True,
                })

        # Recent: latest finished sessions
        recent = supabase.table('study_sessions') \
            .select('id, user_id, activity_name, task_status, created_at, room_id') \
            .order('created_at', desc=True).limit(30).execute().data or []

        user_ids = list({s['user_id'] for s in recent if s.get('user_id') is not None})
        room_ids = list({s['room_id'] for s in recent if s.get('room_id') is not None})
        name_by_uid, room_by_id = {}, {}

        if user_ids:
            u = supabase.table('users').select('id, username').in_('id', user_ids).execute().data or []
            name_by_uid = {x['id']: x['username'] for x in u}

        if room_ids:
            rr = supabase.table('rooms').select('id, name').in_('id', room_ids).execute().data or []
            room_by_id = {x['id']: x['name'] for x in rr}

        for s in recent:
            uid = s.get('user_id')
            activity.append({
                'id': f"sess-{s['id']}",
                'user': name_by_uid.get(uid) or 'User',
                'room': room_by_id.get(s.get('room_id')) or s.get('activity_name') or 'Focus Session',
                'status': s.get('task_status') or 'Completed',
                'createdAt': s.get('created_at'),
                'live': False,
            })

        return jsonify({
            'success': True,
            'range': range_key,
            'metrics': metrics,
            'chart': chart,
            'alerts': alerts,
            'activity': activity,
        }), 200

    except Exception as e:
        print("ADMIN DASHBOARD ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500
