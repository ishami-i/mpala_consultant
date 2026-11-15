"""Create an admin login, or reset its password. Run from the backend folder:

    venv/bin/python create_admin.py                 (asks for the email)
    venv/bin/python create_admin.py you@example.com

The email must also be listed in ADMIN_EMAILS in backend/.env to open the dashboard.
"""
import getpass
import sys

import bcrypt

import config
from database.db import get_db_connection

email = (sys.argv[1] if len(sys.argv) > 1 else input("Admin email: ")).strip().lower()
if "@" not in email:
    sys.exit("That does not look like an email address.")

password = getpass.getpass("Password (8+ characters): ")
if len(password) < 8:
    sys.exit("Use at least 8 characters.")
if password != getpass.getpass("Repeat password: "):
    sys.exit("The passwords do not match.")

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

conn = get_db_connection()
cur = conn.cursor()
try:
    cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        cur.execute("UPDATE users SET password = %s WHERE email = %s", (hashed, email))
        action = "Password updated for"
    else:
        cur.execute("INSERT INTO users (email, password) VALUES (%s, %s)", (email, hashed))
        action = "Admin created:"
    conn.commit()
finally:
    cur.close()
    conn.close()

print(f"{action} {email}")
if email not in config.ADMIN_EMAILS:
    print(f"\nNote: {email} is not in ADMIN_EMAILS in backend/.env, so it cannot open the dashboard yet.")
    print("Add it there (comma-separated), then restart the app.")
else:
    print("Sign in at /admin with this email and password.")
