import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
MAIL_SERVER = os.getenv("MAIL_SERVER")
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_USE_TLS = os.getenv("MAIL_USE_TLS") == "True"   # port 587 (STARTTLS), e.g. Gmail
MAIL_USE_SSL = os.getenv("MAIL_USE_SSL") == "True"   # port 465 (implicit TLS), e.g. Cloudflare
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
# Address shown in the From line. Defaults to MAIL_USERNAME, which works when the SMTP login is
# an email address (Gmail). Set it when the login is not one (Cloudflare's login is "api_token").
MAIL_FROM = os.getenv("MAIL_FROM") or MAIL_USERNAME
MAIL_DEFAULT_SENDER = MAIL_FROM

# Who receives the "new project" email, and who may open the dashboard
COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", MAIL_USERNAME)
ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:5173/admin")

# --- Emails sent to clients ---------------------------------------------------
from urllib.parse import urlparse  # noqa: E402

# Public address of the website, used for the links in emails (default: the dashboard address minus /admin)
SITE_URL = (os.getenv("SITE_URL") or DASHBOARD_URL.split("/admin")[0]).rstrip("/")
_host = (urlparse(SITE_URL).hostname or "").removeprefix("www.")
# The address clients see and reply to. Default: info@<your domain> in production, COMPANY_EMAIL locally.
PUBLIC_EMAIL = os.getenv("PUBLIC_EMAIL") or (
    f"info@{_host}" if _host and _host not in ("localhost", "127.0.0.1") else COMPANY_EMAIL
)
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Mpala Consultant")
COMPANY_NAME = "Mpala Consultant"
COMPANY_ADDRESS = "Gisozi, Gasabo, Kigali, Rwanda"
COMPANY_TIN = "156496048"

# The five provinces of Rwanda, as used in src/data/location.json
PROVINCES = ["Kigali City", "Northern", "Southern", "Eastern", "Western"]

# Public sign-up via POST /api/register. Set to false in production (create admins with init_db.py / deploy.sh).
ALLOW_REGISTRATION = os.getenv("ALLOW_REGISTRATION", "true").lower() == "true"

# --- Gallery ---------------------------------------------------------------
# Photos uploaded from the dashboard are saved in this folder and shown on /gallery.
UPLOAD_DIR = os.getenv("UPLOAD_DIR") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "uploads", "gallery"
)
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", 8))      # per photo
MAX_CONTENT_LENGTH = 40 * 1024 * 1024                    # whole upload request

# slug, label. These are also the services a client can choose in the project form.
# One gallery per service; architectural study and construction come first (our main business).
# To add a gallery for another service, add a line here and (optionally) a slug in services.jsx.
GALLERY_CATEGORIES = [
    ("architecture", "Architectural study"),
    ("construction", "Construction of infrastructure"),
    ("consultancy", "General consultancy"),
    ("supply", "General supply"),
    ("land", "Land services"),
    ("topography", "Topography and land survey"),
    ("brokerage", "Land sale and purchase brokerage"),
]

# Services the client pays for. Payment is arranged directly with the team, not on the website.
PAID_SERVICES = {"topography", "brokerage"}
