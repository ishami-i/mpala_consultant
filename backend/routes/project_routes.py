from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from database.db import get_db_connection
from email_notification.mailer import notify_company, thank_client

project_routes = Blueprint("project_routes", __name__)

REQUIRED = ["name", "email", "phone", "UPI", "location", "projectDetails", "budget"]
STATUSES = {"new", "reviewing", "contacted", "closed"}


def iso(value):
    """MySQL gives a datetime, SQLite gives 'YYYY-MM-DD HH:MM:SS' (UTC). Return ISO text either way."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value).replace(" ", "T") + "Z"


def admin_only():
    return get_jwt().get("admin") is True


# Public: client submits a project
@project_routes.route("/projects", methods=["POST"])
def submit_project():
    data = request.get_json() or {}
    missing = [f for f in REQUIRED if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400
    try:
        budget = float(data["budget"])
    except ValueError:
        return jsonify({"error": "Budget must be a number"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO projects
               (owner_name, email, phone, upi, location, project_details, budget)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (data["name"], data["email"], data["phone"], data["UPI"],
             data["location"], data["projectDetails"], budget),
        )
        conn.commit()
        project_id = cur.lastrowid
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

    # Project is saved; a mail failure must not lose it
    try:
        notify_company(project_id, data["name"], budget)
        thank_client(data["email"], data["name"])
    except Exception as e:
        print("Email failed:", e)

    return jsonify({"message": "Project received", "project_id": project_id}), 201


# Admin: list (summary only)
@project_routes.route("/admin/projects", methods=["GET"])
@jwt_required()
def list_projects():
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT project_id, owner_name, location, budget, status, created_at "
            "FROM projects ORDER BY created_at DESC, project_id DESC"
        )
        rows = cur.fetchall()
        for r in rows:
            r["budget"] = float(r["budget"])
            r["created_at"] = iso(r["created_at"])
        return jsonify(rows), 200
    finally:
        cur.close()
        conn.close()


# Admin: everything about one project
@project_routes.route("/admin/projects/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project(project_id):
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM projects WHERE project_id = %s", (project_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Project not found"}), 404
        row["budget"] = float(row["budget"])
        row["created_at"] = iso(row["created_at"])
        return jsonify(row), 200
    finally:
        cur.close()
        conn.close()


# Admin: change status
@project_routes.route("/admin/projects/<int:project_id>/status", methods=["PATCH"])
@jwt_required()
def set_status(project_id):
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403
    status = (request.get_json() or {}).get("status")
    if status not in STATUSES:
        return jsonify({"error": "Invalid status"}), 400
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE projects SET status=%s WHERE project_id=%s", (status, project_id))
        conn.commit()
        return jsonify({"status": status}), 200
    finally:
        cur.close()
        conn.close()
