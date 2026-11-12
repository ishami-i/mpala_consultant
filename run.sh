#!/usr/bin/env bash
#
# run.sh - one command to start everything: database, backend, Swagger UI, frontend.
#
# Usage:
#   ./run.sh           set up (first time) and start everything; Ctrl+C stops it
#   ./run.sh stop      stop the Docker MySQL container this script may have started
#
# Needs: python3 and node + npm.
# Database: SQLite by default (a local file, nothing to install). For deployment set
# DB_ENGINE=mysql in backend/.env; if MySQL is not running locally and Docker is installed,
# this script starts a MySQL container for you.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT="$(pwd)"
ENVF="backend/.env"
CONTAINER="mpala-mysql"

if [[ "${1:-}" == "stop" ]]; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 && echo "Stopped $CONTAINER" || echo "No $CONTAINER container running"
  exit 0
fi

say()  { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die()  { printf '\nError: %s\n' "$1" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
# Check IPv4 and "localhost" (on macOS, localhost can be IPv6 only)
port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null || (exec 3<>"/dev/tcp/localhost/$1") 2>/dev/null; }
# wait_port <port> [seconds]   (the first Vite start can take 20s or more)
wait_port() { local i; for ((i = 0; i < ${2:-30} * 2; i++)); do port_open "$1" && return 0; sleep 0.5; done; return 1; }

have python3 || die "python3 is required"
have node    || die "node is required"
have npm     || die "npm is required"
[[ -d backend && -f package.json ]] || die "run this from the project folder (needs backend/ and package.json)"

# ---------- backend/.env ----------
say "Checking backend/.env"
touch "$ENVF"
val()     { grep -m1 "^$1=" "$ENVF" | cut -d= -f2- || true; }
set_key() { { grep -v "^$1=" "$ENVF" || true; } > "$ENVF.tmp"; printf '%s=%s\n' "$1" "$2" >> "$ENVF.tmp"; mv "$ENVF.tmp" "$ENVF"; }
add_key() { if [[ -z "$(val "$1")" ]]; then set_key "$1" "$2"; echo "  added $1"; fi; }
rand()    { python3 -c 'import secrets; print(secrets.token_hex(16))'; }

add_key DB_ENGINE sqlite
DB_ENGINE="$(val DB_ENGINE)"
if [[ "$DB_ENGINE" == "mysql" ]]; then
  add_key DB_HOST 127.0.0.1
  add_key DB_USER root
  add_key DB_PASSWORD "$(rand)"
  add_key DB_NAME mpala
fi
add_key JWT_SECRET_KEY "$(rand)$(rand)"
add_key COMPANY_EMAIL "CHANGE_ME@example.com"
add_key DASHBOARD_URL "http://localhost:5173/admin"
add_key BACKEND_PORT 5000
BACKEND_PORT="$(val BACKEND_PORT)"
printf 'VITE_API_URL=http://localhost:%s/api\n' "$BACKEND_PORT" > .env.local

# ---------- backend packages ----------
say "Backend packages"
PY="$ROOT/backend/venv/bin/python"
if [[ ! -x "$PY" ]]; then
  python3 -m venv backend/venv
fi
REQ_HASH="$(python3 -c 'import hashlib,sys; print(hashlib.md5(open("backend/requirements.txt","rb").read()).hexdigest())')"
if [[ "$(cat backend/venv/.req_hash 2>/dev/null || true)" != "$REQ_HASH" ]]; then
  "$PY" -m pip install -q -r backend/requirements.txt
  echo "$REQ_HASH" > backend/venv/.req_hash
else
  echo "  up to date"
fi

# ---------- frontend packages ----------
say "Frontend packages"
if [[ ! -d node_modules/react-router-dom || ! -d node_modules/@tailwindcss/vite ]]; then
  npm install --no-audit --no-fund
  [[ -d node_modules/react-router-dom ]] || npm install --no-audit --no-fund react-router-dom
  npm install --no-audit --no-fund "tailwindcss@^4" >/dev/null
else
  echo "  up to date"
fi

# ---------- database ----------
say "Database"
DB_HOST="$(val DB_HOST)"
if [[ "$DB_ENGINE" == "sqlite" ]]; then
  echo "  using SQLite (backend/database/mpala.sqlite3)"
elif ! port_open 3306 && [[ "$DB_HOST" == "127.0.0.1" || "$DB_HOST" == "localhost" ]]; then
  if have docker && docker info >/dev/null 2>&1; then
    echo "  MySQL is not running. Starting a Docker container ($CONTAINER)..."
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --name "$CONTAINER" -p 3306:3306 \
      -e MYSQL_ROOT_PASSWORD="$(val DB_PASSWORD)" -e MYSQL_DATABASE="$(val DB_NAME)" \
      -v mpala-mysql-data:/var/lib/mysql mysql:8 >/dev/null
  else
    die "MySQL is not running on port 3306 and Docker is not available.
Start your MySQL, then put its login in backend/.env (DB_USER, DB_PASSWORD) and run ./run.sh again."
  fi
fi

if ! OUT="$("$PY" backend/init_db.py 2>&1 | tail -3)"; then :; fi
case "$OUT" in
  *USERS=*) echo "  database ready" ;;
  *) die "Could not set up the database:
$OUT
Check the database settings in backend/.env (DB_ENGINE, and DB_HOST / DB_USER / DB_PASSWORD for mysql)." ;;
esac
USERS="$(printf '%s\n' "$OUT" | grep USERS= | tail -1 | cut -d= -f2)"

# ---------- admin account ----------
ADMINS="$(val ADMIN_EMAILS)"
if [[ "$USERS" == "0" ]]; then
  if [[ -t 0 ]]; then
    say "Create your admin login for the dashboard"
    DEFAULT_EMAIL="${ADMINS%%,*}"
    [[ "$DEFAULT_EMAIL" == CHANGE_ME* ]] && DEFAULT_EMAIL=""
    read -r -p "  Admin email${DEFAULT_EMAIL:+ [$DEFAULT_EMAIL]}: " AEMAIL
    AEMAIL="${AEMAIL:-$DEFAULT_EMAIL}"
    [[ -n "$AEMAIL" ]] || die "an admin email is required"
    read -r -s -p "  Admin password: " APASS; echo
    [[ -n "$APASS" ]] || die "a password is required"
    ADMIN_SEED_EMAIL="$AEMAIL" ADMIN_SEED_PASSWORD="$APASS" "$PY" backend/init_db.py >/dev/null
    case ",$ADMINS," in *",$AEMAIL,"*) ;; *) set_key ADMIN_EMAILS "$AEMAIL"; ADMINS="$AEMAIL";; esac
    echo "  admin created: $AEMAIL"
  else
    echo "  No users yet. Run ./run.sh in a terminal to create the admin login."
  fi
fi
[[ -n "$ADMINS" ]] || { set_key ADMIN_EMAILS "CHANGE_ME@example.com"; }

# ---------- start ----------
say "Starting"
port_open "$BACKEND_PORT" && die "port $BACKEND_PORT is already in use. Set BACKEND_PORT=<free port> in backend/.env"
port_open 5173 && die "port 5173 is already in use. Stop the other dev server first."

mkdir -p .run
BACK="" FRONT=""
stop_all() {
  trap - INT TERM EXIT
  echo; echo "Stopping..."
  [[ -n "$BACK" ]] && kill "$BACK" 2>/dev/null || true
  [[ -n "$FRONT" ]] && kill "$FRONT" 2>/dev/null || true
  wait "$BACK" "$FRONT" 2>/dev/null || true
}
trap stop_all INT TERM EXIT

(cd backend && NO_RELOAD=1 exec "$PY" app.py > "$ROOT/.run/backend.log" 2>&1) & BACK=$!  # exec: $BACK is the python process itself
./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort > .run/frontend.log 2>&1 & FRONT=$!

wait_port "$BACKEND_PORT" || { tail -20 .run/backend.log; die "backend did not start (see .run/backend.log)"; }
wait_port 5173 120       || { tail -20 .run/frontend.log; die "frontend did not start (see .run/frontend.log)"; }

cat <<MSG

  Everything is running

    Website      http://localhost:5173
    Dashboard    http://localhost:5173/admin
    API          http://localhost:$BACKEND_PORT/api
    Swagger UI   http://localhost:$BACKEND_PORT/api/docs

  Logs: .run/backend.log  .run/frontend.log
  Press Ctrl+C to stop.
MSG
if [[ "$DB_ENGINE" == "mysql" ]] && have docker; then
  echo "  A Docker MySQL container may still be running; stop it with ./run.sh stop"
fi
if [[ "$(val COMPANY_EMAIL)" == CHANGE_ME* || -z "$(val MAIL_USERNAME)" ]]; then
  echo
  echo "  Note: emails will not be sent until COMPANY_EMAIL and the MAIL_* values in backend/.env are set."
  echo "        Projects are still saved and show in the dashboard."
fi

wait "$BACK" "$FRONT"
