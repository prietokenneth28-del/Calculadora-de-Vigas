from flask import Blueprint, jsonify, request

from services.beam_analysis_service import RequestValidationError, analyze_beam


beam_api = Blueprint("beam_api", __name__)


@beam_api.route("/calcular", methods=["POST"])
def calcular() -> tuple[dict, int] | tuple[object, int] | object:
    try:
        resultado = analyze_beam(request.get_json(silent=True))
        return jsonify({"status": "success", "data": resultado}), 200
    except RequestValidationError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
