from typing import Any

from backend.domain.models import BeamRequest
from backend.logica_singularidad import resolver_viga_backend


class RequestValidationError(ValueError):
    """Error de validación para peticiones del análisis de vigas."""


def _assert_number(value: Any, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise RequestValidationError(f"El campo '{field_name}' debe ser numérico") from exc


def _assert_list(value: Any, field_name: str) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise RequestValidationError(f"El campo '{field_name}' debe ser una lista")
    if not all(isinstance(item, dict) for item in value):
        raise RequestValidationError(f"Todos los elementos de '{field_name}' deben ser objetos")
    return value


def parse_beam_request(payload: dict[str, Any] | None) -> BeamRequest:
    if payload is None:
        raise RequestValidationError("No se recibió un cuerpo JSON válido")

    longitud = _assert_number(payload.get("longitud"), "longitud")
    if longitud <= 0:
        raise RequestValidationError("La longitud debe ser mayor a cero")

    soportes = _assert_list(payload.get("soportes"), "soportes")
    cargas = _assert_list(payload.get("cargas"), "cargas")

    perfil = str(payload.get("perfil", "WF")).strip().upper() or "WF"
    fs = _assert_number(payload.get("fs", 2.0), "fs")
    if fs <= 0:
        raise RequestValidationError("El factor de seguridad 'fs' debe ser mayor a cero")

    return BeamRequest(
        longitud=longitud,
        soportes=soportes,
        cargas=cargas,
        perfil=perfil,
        fs=fs,
    )


def analyze_beam(payload: dict[str, Any] | None) -> dict[str, Any]:
    request = parse_beam_request(payload)
    return resolver_viga_backend(
        request.longitud,
        request.soportes,
        request.cargas,
        request.perfil,
        request.fs,
    )
