import os
import uuid

from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required

import config
from database.db import get_db_connection
from routes.project_routes import admin_only, iso

gallery_routes = Blueprint("gallery_routes", __name__)

LABELS = dict(config.GALLERY_CATEGORIES)
MAX_BYTES = config.MAX_UPLOAD_MB * 1024 * 1024
os.makedirs(config.UPLOAD_DIR, exist_ok=True)


def image_ext(head):
    """Decide the type from the file's own bytes, never from its name."""
    if head.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"
    return None


def row_to_json(r):
    return {
        "id": r["image_id"],
        "category": r["category"],
        "category_label": LABELS.get(r["category"], r["category"]),
        "caption": r["caption"],
        "file": r["filename"],
        "created_at": iso(r["created_at"]),
    }


# ---- public ---------------------------------------------------------------
@gallery_routes.route("/gallery/categories", methods=["GET"])
def categories():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT category, COUNT(*) AS n FROM gallery_images GROUP BY category")
        counts = {r["category"]: int(r["n"]) for r in cur.fetchall()}
    finally:
        cur.close()
        conn.close()
    return jsonify({
        "categories": [
            {"slug": slug, "label": label, "count": counts.get(slug, 0)}
            for slug, label in config.GALLERY_CATEGORIES
        ],
        "max_upload_mb": config.MAX_UPLOAD_MB,
    })


@gallery_routes.route("/gallery", methods=["GET"])
def list_images():
    category = request.args.get("category")
    sql = "SELECT image_id, category, caption, filename, created_at FROM gallery_images"
    params = ()
    if category:
        sql += " WHERE category = %s"
        params = (category,)
    sql += " ORDER BY created_at DESC, image_id DESC"
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return jsonify([row_to_json(r) for r in cur.fetchall()])
    finally:
        cur.close()
        conn.close()


@gallery_routes.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    # File names are random, so a long cache is safe
    resp = send_from_directory(config.UPLOAD_DIR, filename, max_age=31536000)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp


# ---- admin ----------------------------------------------------------------
@gallery_routes.route("/admin/gallery", methods=["POST"])
@jwt_required()
def upload_images():
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403

    category = request.form.get("category", "")
    caption = request.form.get("caption", "").strip()[:255]
    files = [f for f in request.files.getlist("files") if f and f.filename]
    if category not in LABELS:
        return jsonify({"error": "Choose a service for these photos"}), 400
    if not files:
        return jsonify({"error": "Choose at least one photo"}), 400

    # Check every file first, so a bad one means nothing is saved
    prepared = []
    for f in files:
        data = f.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            return jsonify({"error": f"{f.filename} is larger than {config.MAX_UPLOAD_MB} MB"}), 400
        ext = image_ext(data[:12])
        if not ext:
            return jsonify({"error": f"{f.filename} is not a JPG, PNG or WebP photo"}), 400
        prepared.append((data, ext))

    saved = []
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        for data, ext in prepared:
            name = uuid.uuid4().hex + ext
            with open(os.path.join(config.UPLOAD_DIR, name), "wb") as out:
                out.write(data)
            saved.append(name)
            cur.execute(
                "INSERT INTO gallery_images (category, caption, filename) VALUES (%s, %s, %s)",
                (category, caption, name),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        for name in saved:
            try:
                os.remove(os.path.join(config.UPLOAD_DIR, name))
            except OSError:
                pass
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

    return jsonify({"uploaded": len(saved)}), 201


@gallery_routes.route("/admin/gallery/<int:image_id>", methods=["DELETE"])
@jwt_required()
def delete_image(image_id):
    if not admin_only():
        return jsonify({"error": "Not allowed"}), 403
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT filename FROM gallery_images WHERE image_id = %s", (image_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Photo not found"}), 404
        cur.execute("DELETE FROM gallery_images WHERE image_id = %s", (image_id,))
        conn.commit()
    finally:
        cur.close()
        conn.close()
    try:
        os.remove(os.path.join(config.UPLOAD_DIR, row["filename"]))
    except OSError:
        pass
    return jsonify({"deleted": image_id}), 200
