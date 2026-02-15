import pytest

from backend.services.beam_analysis_service import RequestValidationError, parse_beam_request


def test_parse_beam_request_defaults():
    payload = {"longitud": 5, "soportes": [], "cargas": []}

    req = parse_beam_request(payload)

    assert req.longitud == 5.0
    assert req.perfil == "WF"
    assert req.fs == 2.0


def test_parse_beam_request_invalid_longitud():
    payload = {"longitud": 0, "soportes": [], "cargas": []}

    with pytest.raises(RequestValidationError):
        parse_beam_request(payload)


def test_parse_beam_request_invalid_list_structure():
    payload = {"longitud": 10, "soportes": "fijo", "cargas": []}

    with pytest.raises(RequestValidationError):
        parse_beam_request(payload)
