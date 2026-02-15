from backend.app import create_app


def test_calcular_returns_validation_error_for_invalid_json():
    app = create_app()
    client = app.test_client()

    response = client.post("/calcular", json={"longitud": 10})

    assert response.status_code == 400
    assert response.json["status"] == "error"


def test_calcular_happy_path():
    app = create_app()
    client = app.test_client()
    payload = {
        "longitud": 4,
        "soportes": [
            {"tipo": "fijo", "posicion": 0},
            {"tipo": "móvil", "posicion": 4},
        ],
        "cargas": [{"tipo": "Puntual", "magnitud": -10, "posicion": 2}],
    }

    response = client.post("/calcular", json=payload)

    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert "data" in response.json
