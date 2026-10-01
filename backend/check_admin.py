import os, getpass
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

email = input("Admin email: ").strip().lower()
rows = sb.table('admins').select('*').eq('email', email).execute().data
print("Rows found:", len(rows))

if rows:
    admin = rows[0]
    print("Stored email:", repr(admin['email']))
    print("is_active:", admin['is_active'])
    print("must_change_password:", admin['must_change_password'])
    print("Hash starts with:", admin['password'][:7])
    pw = getpass.getpass("Password: ")
    print("Password matches:", bcrypt.checkpw(pw.encode(), admin['password'].encode()))