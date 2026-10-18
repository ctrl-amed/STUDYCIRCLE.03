"""Small shared helpers: JSON/time parsing, levels, email sending, paging and date ranges."""
import json
import os
import re
import ssl
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from extensions import supabase

# Philippine Standard Time definition (UTC+8)
PHT = timezone(timedelta(hours=8))


# ---------------------------------------------------------------------------
# JSON / time
# ---------------------------------------------------------------------------

def parse_json_field(value, default=None):
    """
    jsonb columns can come back as a dict/list OR as a JSON string (because
    update_customization stores them with json.dumps). This handles both.
    """
    if value is None:
        return default
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return default
    return value


def parse_ts(value):
    """Parse a Supabase timestamp safely (any fractional-second length, Z or +00:00).
    Returns a timezone-aware datetime (UTC if the string had no timezone), or None."""
    if not value:
        return None
    s = str(value).strip().replace('Z', '+00:00')
    m = re.match(r'^(.*?)\.(\d+)(.*)$', s)
    if m:  # normalise the fraction to exactly 6 digits for older Python versions
        s = f"{m.group(1)}.{m.group(2)[:6].ljust(6, '0')}{m.group(3)}"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def format_pht(value):
    """Timestamp -> 'September 30, 2026 at 03:15 PM PHT'."""
    try:
        dt = parse_ts(value)
        return dt.astimezone(PHT).strftime('%B %d, %Y at %I:%M %p') + ' PHT'
    except Exception:
        return str(value)


def _to_pht(iso_str):
    """ISO timestamp (UTC from Supabase) -> timezone-aware datetime in Philippine time."""
    if not iso_str:
        return None
    try:
        return parse_ts(iso_str).astimezone(PHT)
    except Exception:
        return None


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_log(user, action):
    """Unique id + real timestamp, so the client can dedupe and show '2 mins ago'."""
    return {'id': f"log_{uuid.uuid4().hex}", 'user': user, 'action': action, 'ts': now_iso()}


# ---------------------------------------------------------------------------
# Levels
# ---------------------------------------------------------------------------

def calculate_level_from_total_xp(total_xp):
    """
    Works out a user's Level (1-50) and the XP needed for their next level.
    Aligned with Table 3.7 and Formula 3.13 & 3.14 from the thesis document.
    """
    # Buuin ang exact thresholds batay sa pattern: XP_L = XP_(L-1) + (25 * L)
    thresholds = [0] * 52 
    thresholds[1] = 0
    for l in range(2, 52):
        thresholds[l] = thresholds[l-1] + (25 * l)
    
    current_level = 1
    # Piliin ang pinakamataas na level kung saan ang total_xp ay sapat (Formula 3.13)
    for l in range(50, 0, -1):
        if total_xp >= thresholds[l]:
            current_level = l
            break
            
    # Kunin ang natitirang XP na kailangan para sa susunod na level (Formula 3.14)
    next_level = current_level + 1 if current_level < 50 else 50
    next_level_xp = thresholds[next_level]
    
    return current_level, next_level_xp


# ---------------------------------------------------------------------------
# Streak freeze
# ---------------------------------------------------------------------------

def ensure_streak_freeze_row(user_id):
    """Ensures every user has exactly one row in streak_freezes_inventory. Called
    right after a new account is created (signup / google-signup)."""
    try:
        existing = supabase.table('streak_freezes_inventory').select('user_id').eq('user_id', user_id).execute()
        if not existing.data:
            supabase.table('streak_freezes_inventory').insert({
                "user_id": user_id,
                "freezes_count": 1,
                "max_slots": 2
            }).execute()
    except Exception as e:
        print("Could not create streak freeze row:", e)


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

def send_plain_email(to_email, subject, body):
    sender = os.getenv("MAIL_USERNAME")
    password = os.getenv("MAIL_PASSWORD")
    if not sender or not password:
        raise RuntimeError("MAIL_USERNAME / MAIL_PASSWORD are not set in .env")

    # Linisin ang spaces sakaling na-copy-paste nang may space ang app password
    sender = sender.strip()
    password = password.replace(" ", "").strip()

    msg = EmailMessage()
    msg['From'] = f"StudyCircle <{sender}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(body)

    context = ssl.create_default_context()

    # Port 465 gamit ang direct SSL
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context, timeout=15) as server:
        server.set_debuglevel(1)  # Ipi-print nito ang buong SMTP logs sa terminal
        server.login(sender, password)
        server.send_message(msg)


# ---------------------------------------------------------------------------
# Supabase paging + date ranges (used by the admin pages and leaderboard)
# ---------------------------------------------------------------------------

def _fetch_all(build, page=1000, cap=20000):
    """Supabase returns at most 1000 rows per request, so page through them."""
    rows, offset = [], 0
    while offset < cap:
        chunk = build().range(offset, offset + page - 1).execute().data or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return rows


def _iso_utc(dt):
    return dt.astimezone(timezone.utc).isoformat()


def _count_between(table, col, start=None, end=None):
    q = supabase.table(table).select('id', count='exact')
    if start is not None:
        q = q.gte(col, _iso_utc(start))
    if end is not None:
        q = q.lt(col, _iso_utc(end))
    return q.limit(1).execute().count or 0


def _pct_change(cur, prev):
    if not prev:
        return None          # nothing to compare against -> frontend shows "—"
    return round((cur - prev) / prev * 100)


def _resolve_range(range_key, start_str, end_str):
    """Returns (start, end) as Philippine-time datetimes. end is exclusive."""
    now = datetime.now(PHT)
    today0 = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if range_key == 'Yesterday':
        return today0 - timedelta(days=1), today0
    if range_key == 'Last 7 days':
        return today0 - timedelta(days=6), today0 + timedelta(days=1)
    if range_key == 'Last 30 days':
        return today0 - timedelta(days=29), today0 + timedelta(days=1)
    if range_key == 'Custom':
        s = datetime.strptime(start_str, '%Y-%m-%d').replace(tzinfo=PHT)
        e = datetime.strptime(end_str, '%Y-%m-%d').replace(tzinfo=PHT) + timedelta(days=1)
        if e <= s:
            raise ValueError('End date must not be before start date.')
        return s, e
    return today0, today0 + timedelta(days=1)      # Today


def _build_buckets(start, end):
    """Chart x-axis: 3-hour slots for one day, daily up to 14 days, else 4 equal slices."""
    total_days = round((end - start).total_seconds() / 86400)
    buckets = []                                    # (bucket_start, label)

    if total_days <= 1:
        for i in range(8):
            s = start + timedelta(hours=3 * i)
            buckets.append((s, s.strftime('%I %p').lstrip('0')))
    elif total_days <= 14:
        fmt = '%a' if total_days <= 7 else '%b %d'
        for i in range(total_days):
            s = start + timedelta(days=i)
            buckets.append((s, s.strftime(fmt)))
    else:
        span = (end - start).total_seconds()
        for i in range(4):
            s = start + timedelta(seconds=span * i / 4)
            buckets.append((s, s.strftime('%b %d')))
    return buckets