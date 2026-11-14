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

# --- Gallery ---------------------------------------------------------------
# Photos uploaded from the dashboard are saved in this folder and shown on /gallery.
UPLOAD_DIR = os.getenv("UPLOAD_DIR") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "uploads", "gallery"
)
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", 8))      # per photo
MAX_CONTENT_LENGTH = 40 * 1024 * 1024                    # whole upload request

# slug, label. One gallery per service; the first two are shown first.
# To add a gallery for another service, add a line here and (optionally) a slug in services.jsx.
GALLERY_CATEGORIES = [
    ("construction", "Construction of infrastructure"),
    ("architecture", "Architectural study"),
    ("consultancy", "General consultancy"),
    ("supply", "General supply"),
    ("land", "Land services"),
    ("topography", "Topography"),
    ("brokerage", "Land sale and purchase"),
]
