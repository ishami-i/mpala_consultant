from collections import Counter
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

import config
from database.db import get_db_connection
from email_notification.mailer import notify_company, thank_client

project_routes = Blueprint("project_routes", __name__)

REQUIRED = ["name", "email", "phone", "UPI", "province", "district", "sector", "service", "projectDetails", "budget"]
LABELS = dict(config.GALLERY_CATEGORIES)
STATUSES = ["new", "reviewing", "contacted", "closed"]


def iso(value):
    """MySQL gives a datetime, SQLite gives 'YYYY-MM-DD HH:MM:SS' (UTC). Return ISO text either way."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value).replace(" ", "T") + "Z"


def to_dt(value):
    """A timezone-aware UTC datetime from either database's value."""
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace("Z", "").replace(" ", "T"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def with_service(row):
    row["service_label"] = LABELS.get(row.get("service"), "")
    row["paid_service"] = row.get("service") in config.PAID_SERVICES
    return row


def admin_only():
    return get_jwt().get("admin") is True


# Public: client submits a project
@project_routes.route("/projects", methods=["POST"])
def submit_project():
    data = request.get_json() or {}
    missing = [f for f in REQUIRED if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400
    if data["service"] not in LABELS:
        return jsonify({"error": "Choose a service"}), 400
    province = str(data["province"]).strip()
    district = str(data["district"]).strip()
    sector = str(data["sector"]).strip()
    if province not in config.PROVINCES:
        return jsonify({"error": "Choose a province"}), 400
    if len(district) > 100 or len(sector) > 100:
        return jsonify({"error": "District or sector is too long"}), 400
    if "@" not in str(data["email"]):
        return jsonify({"error": "Enter a valid email address"}), 400
    try:
        budget = float(data["budget"])
    except ValueError:
        return jsonify({"error": "Budget must be a number"}), 400
    location = f"{sector}, {district}, {province}"

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO projects
               (owner_name, email, phone, upi, location, province, district, sector,
                service, project_details, budget)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (data["name"], data["email"], data["phone"], data["UPI"], location, province,
             district, sector, data["service"], data["projectDetails"], budget),
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
    label = LABELS[data["service"]]
    try:
        notify_company(project_id, data["name"], budget, label)
    except Exception as e:
        print("Email to the company failed:", e)
    try:
        thank_client(data["email"], data["name"], label, data["service"] in config.PAID_SERVICES, location)
    except Exception as e:
        print("Thank-you email failed:", e)

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
            "SELECT project_id, owner_name, location, service, budget, status, created_at "
            "FROM projects ORDER BY created_at DESC, project_id DESC"
        )
        rows = cur.fetchall()
        for r in rows:
            r["budget"] = float(r["budget"])
            r["created_at"] = iso(r["created_at"])
            with_service(r)
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
        return jsonify(with_service(row)), 200
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


# Admin: delete a project for good
@project_routes.route("/admin/projects/<int:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            return jsonify({"error": "Project not found"}), 404
        cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))
        conn.commit()
        return jsonify({"deleted": project_id}), 200
    finally:
        cur.close()
        conn.close()


# Admin: numbers for the overview page
@project_routes.route("/admin/stats", methods=["GET"])
@jwt_required()
def stats():
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT province, service, status, created_at FROM projects")
        rows = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    now = datetime.now(timezone.utc)
    by_status = Counter()
    by_province, by_service, by_month = Counter(), Counter(), Counter()
    last_30 = prev_30 = paid = 0
    for r in rows:
        by_status[r["status"]] += 1
        by_province[r["province"] or ""] += 1
        by_service[r["service"] or ""] += 1
        paid += r["service"] in config.PAID_SERVICES
        dt = to_dt(r["created_at"])
        by_month[(dt.year, dt.month)] += 1
        age = now - dt
        if age <= timedelta(days=30):
            last_30 += 1
        elif age <= timedelta(days=60):
            prev_30 += 1

    # the last 12 months, oldest first, zeros included
    months = []
    for back in range(11, -1, -1):
        idx = now.year * 12 + (now.month - 1) - back
        y, m = divmod(idx, 12)
        months.append({"month": f"{y}-{m + 1:02d}", "year": y, "number": m + 1, "count": by_month.get((y, m + 1), 0)})

    def ranked(entries, counts):
        """entries: (name, key, extra fields). Biggest first; unknown (old) rows go last."""
        items = [{"name": name, "count": counts.get(key, 0), **extra} for name, key, extra in entries]
        items.sort(key=lambda i: -i["count"])
        if counts.get(""):
            items.append({"name": "Not specified", "count": counts[""]})
        return items

    provinces = ranked([(p, p, {}) for p in config.PROVINCES], by_province)
    services = ranked(
        [(label, slug, {"slug": slug, "paid": slug in config.PAID_SERVICES}) for slug, label in config.GALLERY_CATEGORIES],
        by_service,
    )
    this_month = by_month.get((now.year, now.month), 0)
    prev_idx = now.year * 12 + (now.month - 1) - 1
    last_month = by_month.get((prev_idx // 12, prev_idx % 12 + 1), 0)

    return jsonify({
        "total": len(rows),
        "by_status": {s: by_status.get(s, 0) for s in STATUSES},
        "by_province": provinces,
        "by_service": services,
        "by_month": months,
        "paid_services": paid,
        "last_30_days": last_30,
        "previous_30_days": prev_30,
        "growth_percent": round((last_30 - prev_30) * 100 / prev_30) if prev_30 else None,
        "this_month": this_month,
        "last_month": last_month,
    }), 200
