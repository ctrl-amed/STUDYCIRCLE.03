import os, getpass
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

username = input("Username: ").strip()
full_name = input("Full name: ").strip()
email = input("Email: ").strip().lower()
password = getpass.getpass("Password: ")

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
supabase.table('admins').insert({
    'username': username, 'full_name': full_name, 'email': email,
    'password': hashed, 'role': 'super_admin', 'must_change_password': False,
}).execute()
print("Super admin created.")