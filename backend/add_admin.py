import os, secrets
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

username = input("Username: ").strip()
full_name = input("Full name: ").strip()
email = input("Email: ").strip().lower()

if not username or not full_name or not email:
    raise SystemExit("Username, full name and email are all required.")

temp_password = secrets.token_urlsafe(9) + "A1!"
hashed = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()

try:
    supabase.table("admins").insert({
        "username": username,
        "full_name": full_name,
        "email": email,
        "password": hashed,
        "role": "professor",
        "must_change_password": True,
    }).execute()
except Exception as e:
    raise SystemExit(f"Could not create admin (duplicate username or email?): {e}")

print()
print("Admin created.")
print("Email:              ", email)
print("Temporary password: ", temp_password)
print("Give this to the professor privately. They must set a new password on first login.")
