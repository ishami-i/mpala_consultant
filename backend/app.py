import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

import config
from docs import spec_bp, swagger_bp
from email_notification.mailer import mail
from routes.auth_routes import auth_routes
from routes.gallery_routes import gallery_routes
from routes.project_routes import project_routes

app = Flask(__name__)
app.config.from_object(config)

CORS(app)
JWTManager(app)
mail.init_app(app)

app.register_blueprint(auth_routes, url_prefix="/api")
app.register_blueprint(project_routes, url_prefix="/api")
app.register_blueprint(gallery_routes, url_prefix="/api")
app.register_blueprint(spec_bp, url_prefix="/api")
app.register_blueprint(swagger_bp)  # already prefixed with /api/docs

@app.errorhandler(413)
def too_large(_e):
    return jsonify({"error": "That upload is too large. Send fewer photos at once."}), 413


if __name__ == "__main__":
    app.run(
        debug=True,
        use_reloader=os.getenv("NO_RELOAD") != "1",
        port=int(os.getenv("BACKEND_PORT", 5000)),
    )
