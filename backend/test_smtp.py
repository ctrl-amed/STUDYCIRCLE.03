import os, smtplib
from dotenv import load_dotenv

load_dotenv()
user = os.getenv("MAIL_USERNAME")
pw = os.getenv("MAIL_PASSWORD")
print("USER:", user, "| PASSWORD LENGTH:", len(pw) if pw else None)

s = smtplib.SMTP("smtp.gmail.com", 587, timeout=20)
s.set_debuglevel(1)
s.ehlo()
s.starttls()
s.ehlo()
s.login(user, pw)
print("LOGIN OK")
s.quit()