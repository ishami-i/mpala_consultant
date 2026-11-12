import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
MAIL_SERVER = os.getenv("MAIL_SERVER")
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_USE_TLS = os.getenv("MAIL_USE_TLS") == "True"
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

# Who receives the "new project" email, and who may open the dashboard
COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", MAIL_USERNAME)
ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:5173/admin")

# Public sign-up via POST /api/register. Set to false in production (create admins with init_db.py / deploy.sh).
ALLOW_REGISTRATION = os.getenv("ALLOW_REGISTRATION", "true").lower() == "true"
