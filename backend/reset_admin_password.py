import os, json, urllib.request, urllib.error
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

email = input("Admin email: ").strip().lower()
password = input("New password (visible, for local testing only): ")

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
res = sb.table('admins').update({'password': hashed}).eq('email', email).execute()
if not res.data:
    raise SystemExit("No admin found with that email. Nothing was changed.")

row = sb.table('admins').select('password, is_active, role').eq('email', email).execute().data[0]
print("Role:", row['role'], "| is_active:", row['is_active'])
print("Hash matches typed password:", bcrypt.checkpw(password.encode(), row['password'].encode()))

# Test the real backend login (backend must be running)
req = urllib.request.Request(
    "http://localhost:5000/api/itadmin/login",
    data=json.dumps({"email": email, "password": password}).encode(),
    headers={"Content-Type": "application/json"},
)
try:
    with urllib.request.urlopen(req) as r:
        body = json.loads(r.read())
        print("API login:", r.status, "| success:", body.get("success"), "| mustChangePassword:", body.get("mustChangePassword"))
except urllib.error.HTTPError as e:
    print("API login FAILED:", e.code, e.read().decode())
except Exception as e:
    print("Backend not reachable:", e)
    