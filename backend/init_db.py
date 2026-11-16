"""Create the tables (safe to re-run) and optionally seed an admin.

DB_ENGINE=sqlite (default): creates backend/database/mpala.sqlite3 from schema.sqlite.sql
DB_ENGINE=mysql           : creates the database + tables from schema.sql

Prints the number of users as the last line: USERS=<n>
Exit code 2 = cannot connect to MySQL.
Admin seed: set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in the environment.
"""
import os
import re
import sqlite3
import sys
import time

import bcrypt
from dotenv import load_dotenv

load_dotenv()
HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.getenv("DB_ENGINE", "sqlite").lower()
seed_email = os.getenv("ADMIN_SEED_EMAIL")
seed_pw = os.getenv("ADMIN_SEED_PASSWORD")
hashed = bcrypt.hashpw(seed_pw.encode(), bcrypt.gensalt()).decode() if seed_email and seed_pw else None


def split_location(location):
    """Old projects store 'Sector, District, Province' in one text. Return (province, district, sector)."""
    parts = [p.strip() for p in (location or "").split(",")]
    return (parts[2], parts[1], parts[0]) if len(parts) == 3 else ("", "", "")


def statements(path):
    sql = open(path, encoding="utf-8").read()
    sql = re.sub(r"--.*", "", sql)
    return [s.strip() for s in sql.split(";") if s.strip()]


if ENGINE == "sqlite":
    from database.db import sqlite_path

    conn = sqlite3.connect(sqlite_path())
    for stmt in statements(os.path.join(HERE, "database", "schema.sqlite.sql")):
        conn.execute(stmt)
    # existing databases: add the service column
    if "service" not in [r[1] for r in conn.execute("PRAGMA table_info(projects)")]:
        conn.execute("ALTER TABLE projects ADD COLUMN service TEXT NOT NULL DEFAULT ''")
    # existing databases: province, district and sector columns, filled from the old location text
    have = [r[1] for r in conn.execute("PRAGMA table_info(projects)")]
    for col in ("province", "district", "sector"):
        if col not in have:
            conn.execute(f"ALTER TABLE projects ADD COLUMN {col} TEXT NOT NULL DEFAULT ''")
    for pid, loc in conn.execute("SELECT project_id, location FROM projects WHERE province = ''").fetchall():
        prov, dist, sec = split_location(loc)
        if prov:
            conn.execute("UPDATE projects SET province=?, district=?, sector=? WHERE project_id=?", (prov, dist, sec, pid))
    if hashed:
        conn.execute("INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)", (seed_email, hashed))
    conn.commit()
    print(f"USERS={conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]}")
    sys.exit(0)

# ---- mysql ----
import pymysql  # noqa: E402

host = os.getenv("DB_HOST", "127.0.0.1")
user = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "")
name = os.getenv("DB_NAME", "mpala")
wait = int(os.getenv("DB_WAIT_SECONDS", "40"))

conn, last = None, None
deadline = time.time() + wait
while time.time() < deadline:
    try:
        conn = pymysql.connect(host=host, user=user, password=password, autocommit=True)
        break
    except pymysql.err.OperationalError as e:
        last = e
        time.sleep(2)
if conn is None:
    print(f"Cannot connect to MySQL at {host} as {user}: {last}", file=sys.stderr)
    sys.exit(2)

cur = conn.cursor()
cur.execute(f"CREATE DATABASE IF NOT EXISTS `{name}`")
cur.execute(f"USE `{name}`")
for stmt in statements(os.path.join(HERE, "database", "schema.sql")):
    if not re.match(r"(?i)(create database|use)\b", stmt):
        cur.execute(stmt)
# existing databases: add the service column
cur.execute("SHOW COLUMNS FROM projects LIKE 'service'")
if not cur.fetchone():
    cur.execute("ALTER TABLE projects ADD COLUMN service VARCHAR(50) NOT NULL DEFAULT '' AFTER location")
# existing databases: province, district and sector columns, filled from the old location text
for col, width in (("province", 50), ("district", 100), ("sector", 100)):
    cur.execute("SHOW COLUMNS FROM projects LIKE %s", (col,))
    if not cur.fetchone():
        cur.execute(f"ALTER TABLE projects ADD COLUMN {col} VARCHAR({width}) NOT NULL DEFAULT ''")
cur.execute("SELECT project_id, location FROM projects WHERE province = ''")
for pid, loc in cur.fetchall():
    prov, dist, sec = split_location(loc)
    if prov:
        cur.execute("UPDATE projects SET province=%s, district=%s, sector=%s WHERE project_id=%s", (prov, dist, sec, pid))
if hashed:
    cur.execute("INSERT IGNORE INTO users (email, password) VALUES (%s, %s)", (seed_email, hashed))
cur.execute("SELECT COUNT(*) FROM users")
print(f"USERS={cur.fetchone()[0]}")
