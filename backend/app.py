from flask import Flask
from flask_cors import CORS

from backend.api.routes import beam_api


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(beam_api)
    return app


app = create_app()


if __name__ == '__main__':
    app.run(debug=True, port=5000)
