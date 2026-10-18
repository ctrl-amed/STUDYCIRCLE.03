"""
Create (or reset) a professor / IT admin account for StudyCircle.

Run from your backend folder, with your virtual environment active:
    python add_admin.py

.env needs:
    SUPABASE_URL=...
    SUPABASE_SERVICE_KEY=...   <- the service_role / secret key (recommended for this script)
    (if SUPABASE_SERVICE_KEY is missing it falls back to SUPABASE_KEY)

Never put the service key in the frontend or commit it to GitHub.
"""
import base64
import json
import os
import secrets
from pathlib import Path

try:
    import bcrypt
    from dotenv import load_dotenv
    from supabase import create_client
except ImportError as e:
    raise SystemExit(
        f"Missing package: {e.name}\n"
        "Activate your virtual environment first, then run:\n"
        "    pip install bcrypt python-dotenv supabase"
    )

# Load .env from this script's folder first, then from the current folder
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()

URL = (os.getenv("SUPABASE_URL") or "").strip()
KEY = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or "").strip()
USING_SERVICE_VAR = bool(os.getenv("SUPABASE_SERVICE_KEY"))


def key_role(key):
    """Tells whether the key is an 'anon' / publishable key or a 'service_role' / secret key."""
    if key.startswith("sb_secret_"):
        return "service_role"
    if key.startswith("sb_publishable_"):
        return "anon"
    try:
        payload = key.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload)).get("role")
    except Exception:
        return None


def explain(err):
    """Turns a raw Supabase error into plain advice."""
    text = str(err)
    low = text.lower()
    if "42501" in text or "row-level security" in low:
        return ("Row Level Security is blocking the insert. The key in your .env is the public (anon) key.\n"
                "  Fix: add the service_role / secret key to .env as SUPABASE_SERVICE_KEY=... and run again,\n"
                "  or use the SQL method in the instructions (the SQL editor ignores RLS).")
    if "23505" in text or "duplicate key" in low:
        return "That username or email already exists in the admins table."
    if "pgrst205" in low or "could not find the table" in low:
        return "The 'admins' table was not found. Check the table name and that the schema cache is reloaded (notify pgrst, 'reload schema';)."
    if "invalid api key" in low or "jwt" in low or "apikey" in low:
        return "Supabase rejected the key. Copy a fresh key from Project Settings > API into .env."
    if "getaddrinfo" in low or "connecterror" in low or "timed out" in low or "name or service not known" in low:
        return "Cannot reach Supabase. Check SUPABASE_URL and your internet connection."
    return None


def fail(prefix, err):
    print(f"\n{prefix}: {err}")
    hint = explain(err)
    if hint:
        print(f"\nWhat this probably means:\n  {hint}")
    raise SystemExit(1)


# ---------- 1. check the setup ----------
if not URL or not KEY:
    raise SystemExit(
        "SUPABASE_URL or the key is missing.\n"
        f"  .env searched in: {Path(__file__).resolve().parent} and {Path.cwd()}\n"
        "  Make sure .env has SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY)."
    )

role = key_role(KEY)
print(f"Connecting to {URL}")
print(f"Key in use: {'SUPABASE_SERVICE_KEY' if USING_SERVICE_VAR else 'SUPABASE_KEY'} (role: {role or 'unknown'})")
if role == "anon":
    print("Note: this is a public (anon) key. If Row Level Security is on for 'admins', the insert will be blocked.")

try:
    supabase = create_client(URL, KEY)
    supabase.table("admins").select("id").limit(1).execute()
except Exception as e:
    fail("Could not read the admins table", e)

# ---------- 2. ask for the details ----------
username = input("Username: ").strip()
full_name = input("Full name: ").strip()
email = input("Email: ").strip().lower()

if not username or not full_name or not email:
    raise SystemExit("Username, full name and email are all required.")

temp_password = secrets.token_urlsafe(9) + "A1!"
hashed = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()

# ---------- 3. does this admin already exist? ----------
try:
    existing = supabase.table("admins").select("id, username, email").or_(
        f"email.eq.{email},username.eq.{username}"
    ).execute().data or []
except Exception as e:
    fail("Could not check for an existing admin", e)

try:
    if existing:
        row = existing[0]
        print(f"\nAn admin already exists: username '{row['username']}', email '{row['email']}'.")
        if input("Reset this admin's password instead? (y/n): ").strip().lower() != "y":
            raise SystemExit("Nothing changed.")
        res = supabase.table("admins").update({
            "password": hashed,
            "must_change_password": True,
            "is_active": True,
        }).eq("id", row["id"]).execute()
        email = row["email"]
        action = "Password reset."
    else:
        res = supabase.table("admins").insert({
            "username": username,
            "full_name": full_name,
            "email": email,
            "password": hashed,
            "role": "professor",
            "must_change_password": True,
        }).execute()
        action = "Admin created."
except SystemExit:
    raise
except Exception as e:
    fail("Could not save the admin", e)

# With Row Level Security, a blocked write can return no rows without raising an error.
if not res.data:
    raise SystemExit(
        "\nThe database accepted the request but changed no rows.\n"
        "This usually means Row Level Security is blocking writes for this key.\n"
        "Use the service_role key (SUPABASE_SERVICE_KEY in .env) or the SQL method."
    )

print()
print(action)
print("Email:              ", email)
print("Temporary password: ", temp_password)
print("Give this to the professor privately. They must set a new password on first login.")