import json
import os

from flask import Blueprint, jsonify
from flask_swagger_ui import get_swaggerui_blueprint

SPEC_PATH = os.path.join(os.path.dirname(__file__), "openapi.json")

spec_bp = Blueprint("openapi_spec", __name__)


@spec_bp.route("/openapi.json")
def spec():
    with open(SPEC_PATH, encoding="utf-8") as f:
        return jsonify(json.load(f))


# Swagger UI at /api/docs, reading the spec from /api/openapi.json
swagger_bp = get_swaggerui_blueprint(
    "/api/docs", "/api/openapi.json", config={"app_name": "Mpala Consultant API"}
)
