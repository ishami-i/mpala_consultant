"""Database access for both engines.

DB_ENGINE=sqlite  (default)  local testing, a single file, no server needed
DB_ENGINE=mysql              deployment (uses DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)

The rest of the code writes SQL with %s placeholders and gets dict rows either way.
"""
import os
import sqlite3

import pymysql
from dotenv import load_dotenv

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))


def engine():
    return os.getenv("DB_ENGINE", "sqlite").lower()


def sqlite_path():
    return os.getenv("SQLITE_PATH", os.path.join(HERE, "mpala.sqlite3"))


class _SqliteCursor:
    def __init__(self, cur):
        self._cur = cur

    def execute(self, sql, params=()):
        self._cur.execute(sql.replace("%s", "?"), params)
        return self

    @property
    def lastrowid(self):
        return self._cur.lastrowid

    def fetchone(self):
        row = self._cur.fetchone()
        return dict(row) if row is not None else None

    def fetchall(self):
        return [dict(r) for r in self._cur.fetchall()]

    def close(self):
        self._cur.close()


class _SqliteConnection:
    def __init__(self, path):
        self._conn = sqlite3.connect(path)
        self._conn.row_factory = sqlite3.Row

    def cursor(self):
        return _SqliteCursor(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_db_connection():
    if engine() == "mysql":
        return pymysql.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            cursorclass=pymysql.cursors.DictCursor,
        )
    return _SqliteConnection(sqlite_path())
