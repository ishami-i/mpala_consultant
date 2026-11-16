#!/usr/bin/env bash
#
# deploy.sh - prepare Mpala Consultant for a production server (Linux, MySQL, nginx).
#
# Usage:
#   ./deploy.sh --domain example.com     check settings, set up backend + MySQL tables,
#                                        build the website, write deploy/ config files
#   ./deploy.sh start                    run the API with gunicorn (what systemd runs)
#
# Run it on the server, from the project folder, after creating backend/.env
# (copy backend/.env.example and fill it in). Needs python3, node + npm and a running MySQL.
# Nothing here uses sudo: the commands that do are printed at the end for you to run.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT="$(pwd)"
ENVF="backend/.env"
PY="$ROOT/backend/venv/bin/python"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\nError: %s\n' "$1" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
val() { [[ -f "$ENVF" ]] && { grep -m1 "^$1=" "$ENVF" | cut -d= -f2- || true; } || true; }
set_key() { { grep -v "^$1=" "$ENVF" || true; } > "$ENVF.tmp"; printf '%s=%s\n' "$1" "$2" >> "$ENVF.tmp"; mv "$ENVF.tmp" "$ENVF"; }

# ---------- start (used by systemd) ----------
if [[ "${1:-}" == "start" ]]; then
  [[ -x "$ROOT/backend/venv/bin/gunicorn" ]] || die "gunicorn is missing. Run ./deploy.sh --domain <your-domain> first."
  START_PORT="$(val BACKEND_PORT)"; START_PORT="${START_PORT:-5000}"   # read before leaving the project folder
  cd backend
  # Idempotent: adds any new tables or columns so an update can never leave the API with an old database
  "$ROOT/backend/venv/bin/python" init_db.py >/dev/null || echo "warning: the database setup step failed; run backend/venv/bin/python backend/init_db.py to see why" >&2
  exec "$ROOT/backend/venv/bin/gunicorn" --workers "${WORKERS:-3}" \
       --bind "127.0.0.1:$START_PORT" app:app
fi

# ---------- arguments ----------
DOMAIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    -h|--help) sed -n '3,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown option: $1 (see ./deploy.sh --help)" ;;
  esac
done
[[ -n "$DOMAIN" ]] || die "give your domain:  ./deploy.sh --domain example.com"
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "that does not look like a domain name: $DOMAIN"

have python3 || die "python3 is required"
have node    || die "node is required"
# The website build (Vite) needs Node 20.19+ or 22.12+. Ubuntu's own "nodejs" package is older.
NODE_V="$(node -v | sed 's/^v//')"; NODE_MAJOR="${NODE_V%%.*}"; _r="${NODE_V#*.}"; NODE_MINOR="${_r%%.*}"
if ! { [[ "$NODE_MAJOR" -eq 20 && "$NODE_MINOR" -ge 19 ]] || [[ "$NODE_MAJOR" -eq 22 && "$NODE_MINOR" -ge 12 ]] || [[ "$NODE_MAJOR" -ge 23 ]]; }; then
  die "Node.js $NODE_V is too old for the website build (need 20.19+ or 22.12+). Install Node 22 from NodeSource: see DEPLOYMENT.md, section \"Small servers\"."
fi
have npm     || die "npm is required"
[[ -d backend && -f package.json ]] || die "run this from the project folder"
[[ -f "$ENVF" ]] || die "$ENVF not found. Copy backend/.env.example to backend/.env and fill it in."

# ---------- settings the script can fix itself ----------
say "Checking backend/.env"
[[ -n "$(val ALLOW_REGISTRATION)" ]] || { set_key ALLOW_REGISTRATION false; echo "  set ALLOW_REGISTRATION=false"; }
[[ -n "$(val BACKEND_PORT)" ]] || { set_key BACKEND_PORT 5000; echo "  set BACKEND_PORT=5000"; }
case "$(val DASHBOARD_URL)" in
  ""|*localhost*|*127.0.0.1*) set_key DASHBOARD_URL "https://$DOMAIN/admin"; echo "  set DASHBOARD_URL=https://$DOMAIN/admin" ;;
esac

# ---------- settings only you can provide ----------
problems=()
need() { local v; v="$(val "$1")"; if [[ -z "$v" || "$v" == CHANGE_ME* || "$v" == change-* || "$v" == you@* || "$v" == your-* || "$v" == *yourcompany* || "$v" == *apppassword* || "$v" == *app-password* ]]; then problems+=("$1 is not set"); fi; }
[[ "$(val DB_ENGINE)" == "mysql" ]] || problems+=("DB_ENGINE must be mysql for deployment")
for k in DB_HOST DB_USER DB_PASSWORD DB_NAME COMPANY_EMAIL ADMIN_EMAILS MAIL_SERVER MAIL_USERNAME MAIL_PASSWORD; do need "$k"; done
if [[ "$(val MAIL_USERNAME)" != *@* && -z "$(val MAIL_FROM)" ]]; then problems+=("MAIL_FROM is not set (needed when the SMTP login is not an email address, e.g. Cloudflare's api_token)"); fi
if [[ "$(val MAIL_USE_SSL)" == "True" && "$(val MAIL_USE_TLS)" == "True" ]]; then problems+=("set only one of MAIL_USE_SSL (port 465) and MAIL_USE_TLS (port 587)"); fi
JWT="$(val JWT_SECRET_KEY)"
if [[ "${#JWT}" -lt 32 || "$JWT" == "change-me" ]]; then problems+=("JWT_SECRET_KEY must be a long random value (32+ characters)"); fi
if [[ "$(val ALLOW_REGISTRATION)" != "false" ]]; then problems+=("ALLOW_REGISTRATION must be false in production"); fi
# A key that appears twice is ambiguous: this script reads the first, the app reads the last
for k in $(grep -oE '^[A-Za-z_]+=' "$ENVF" | tr -d '=' | sort | uniq -d); do problems+=("$k appears more than once in $ENVF: keep only one line"); done
if [[ ${#problems[@]} -gt 0 ]]; then
  printf '\nFix these in %s, then run again:\n' "$ENVF" >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi
echo "  settings look good"
# Small servers: MySQL and the website build can be killed when memory runs out
MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"
SWAP_MB="$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"
if [[ "$MEM_MB" -gt 0 && "$MEM_MB" -lt 900 && "$SWAP_MB" -lt 1000 ]]; then
  echo "  warning: this server has ${MEM_MB} MB RAM and ${SWAP_MB} MB swap. MySQL and the build may be killed."
  echo "           Add swap first: see DEPLOYMENT.md, section \"Small servers\"."
fi
PORT="$(val BACKEND_PORT)"

# ---------- backend ----------
say "Backend packages"
[[ -x "$PY" ]] || python3 -m venv backend/venv
"$PY" -m pip install -q --upgrade pip
"$PY" -m pip install -q -r backend/requirements.txt gunicorn
echo "  installed"

say "Database (MySQL)"
if ! OUT="$("$PY" backend/init_db.py 2>&1 | tail -3)"; then :; fi
case "$OUT" in
  *USERS=*) echo "  tables ready" ;;
  *) die "Could not set up MySQL:
$OUT" ;;
esac
USERS="$(printf '%s\n' "$OUT" | grep USERS= | tail -1 | cut -d= -f2)"

if [[ "$USERS" == "0" ]]; then
  say "Create your admin login (registration is closed, so this is the only way in)"
  DEFAULT_EMAIL="$(val ADMIN_EMAILS)"; DEFAULT_EMAIL="${DEFAULT_EMAIL%%,*}"
  AEMAIL="${ADMIN_SEED_EMAIL:-}"; APASS="${ADMIN_SEED_PASSWORD:-}"
  if [[ -z "$APASS" && -t 0 ]]; then
    read -r -p "  Admin email [$DEFAULT_EMAIL]: " AEMAIL; AEMAIL="${AEMAIL:-$DEFAULT_EMAIL}"
    read -r -s -p "  Admin password: " APASS; echo
  fi
  [[ -n "$AEMAIL" && -n "$APASS" ]] || die "no admin exists yet. Run this in a terminal, or set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD for one run."
  ADMIN_SEED_EMAIL="$AEMAIL" ADMIN_SEED_PASSWORD="$APASS" "$PY" backend/init_db.py >/dev/null
  case ",$(val ADMIN_EMAILS)," in *",$AEMAIL,"*) ;; *) echo "  note: $AEMAIL is not in ADMIN_EMAILS, so it cannot open the dashboard. Add it to backend/.env." ;; esac
  echo "  admin created: $AEMAIL"
fi

# ---------- frontend ----------
say "Building the website"
if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
[[ -d node_modules/react-router-dom && -d node_modules/@tailwindcss/vite ]] || npm install --no-audit --no-fund react-router-dom "tailwindcss@^4"
VITE_API_URL="https://$DOMAIN/api" npm run build
echo "  built into dist/"

# ---------- server config files ----------
say "Writing deploy/ files"
mkdir -p deploy
RUN_USER="$(id -un)"
cat > deploy/mpala-api.service <<'UNIT'
[Unit]
Description=Mpala Consultant API
After=network.target mysql.service mariadb.service

[Service]
User=__USER__
WorkingDirectory=__ROOT__/backend
ExecStart=__ROOT__/deploy.sh start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
cat > deploy/nginx-mpala.conf <<'NGINX'
server {
    listen 80;
    server_name __DOMAIN__ www.__DOMAIN__;

    root /var/www/mpala;
    index index.html;

    # Gallery uploads from the dashboard (the API accepts up to 40 MB per upload)
    client_max_body_size 40m;

    location /api/ {
        proxy_pass http://127.0.0.1:__PORT__;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }
}
NGINX
sed -i.bak "s|__USER__|$RUN_USER|g; s|__ROOT__|$ROOT|g; s|__DOMAIN__|$DOMAIN|g; s|__PORT__|$PORT|g" deploy/mpala-api.service deploy/nginx-mpala.conf
rm -f deploy/*.bak
echo "  deploy/mpala-api.service"
echo "  deploy/nginx-mpala.conf"

cat <<MSG

Done. To go live, run these on the server (they need sudo):

  # 1. publish the website files
  sudo mkdir -p /var/www/mpala && sudo rsync -a --delete dist/ /var/www/mpala/

  # 2. run the API as a service
  sudo cp deploy/mpala-api.service /etc/systemd/system/
  sudo systemctl daemon-reload && sudo systemctl enable --now mpala-api

  # 3. web server
  sudo cp deploy/nginx-mpala.conf /etc/nginx/sites-available/mpala
  sudo ln -sf /etc/nginx/sites-available/mpala /etc/nginx/sites-enabled/mpala
  sudo nginx -t && sudo systemctl reload nginx

  # 4. HTTPS (the website and dashboard should only be used over HTTPS)
  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

DNS records needed at your DNS provider (Cloudflare: DNS only, grey cloud):
  A      @     <this server's IP>
  CNAME  www   $DOMAIN

Then open https://$DOMAIN and https://$DOMAIN/admin.
No admin login yet?  cd backend && venv/bin/python create_admin.py
To publish a new version later: git pull, ./deploy.sh --domain $DOMAIN, repeat step 1, then sudo systemctl restart mpala-api.
MSG
