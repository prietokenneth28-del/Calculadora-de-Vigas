import os

from flask import Flask
from flask_cors import CORS

from backend.api.routes import beam_api


def create_app() -> Flask:
    app = Flask(__name__)

    allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")
    origins = "*" if allowed_origins == "*" else [o.strip() for o in allowed_origins.split(",") if o.strip()]
    CORS(app, resources={r"/*": {"origins": origins}})

    app.register_blueprint(beam_api)
    return app


app = create_app()


if __name__ == '__main__':
    app.run(
        host=os.getenv("FLASK_RUN_HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
