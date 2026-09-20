import base64
import os

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from style_swap_routes import build_style_swap_router


PNG_1PX = base64.b64encode(
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
).decode("ascii")
DATA_URL = f"data:image/png;base64,{PNG_1PX}"


async def fake_current_user(authorization=None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer")
    if authorization != "Bearer test-token":
        raise HTTPException(status_code=401, detail="invalid_session")
    return {"user_id": "test-user"}


def fake_rate_limit(*args, **kwargs):
    return None


app = FastAPI()
app.include_router(
    build_style_swap_router(
        get_current_user=fake_current_user,
        rate_limit=fake_rate_limit,
    ),
    prefix="/api",
)
client = TestClient(app)


def test_status_requires_auth(monkeypatch):
    monkeypatch.setenv("STYLE_SWAP_PROVIDER", "openai")
    response = client.get("/api/style-swap/status")
    assert response.status_code == 401


def test_status_reports_provider_configuration_without_secret(monkeypatch):
    monkeypatch.setenv("STYLE_SWAP_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-secret")
    response = client.get(
        "/api/style-swap/status",
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert payload["provider"] == "openai"
    assert "openai" in payload["configuredProviders"]
    assert "test-secret" not in response.text


def test_rejects_non_data_url_before_provider_call(monkeypatch):
    monkeypatch.setenv("STYLE_SWAP_PROVIDER", "openai")
    response = client.post(
        "/api/style-swap",
        headers={"Authorization": "Bearer test-token"},
        json={
            "imageBase64": "x" * 40,
            "maskBase64": "x" * 40,
            "prompt": "change shirt",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "image_must_be_base64_data_url"


def test_valid_payload_requires_configured_provider(monkeypatch):
    monkeypatch.setenv("STYLE_SWAP_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/api/style-swap",
        headers={"Authorization": "Bearer test-token"},
        json={
            "imageBase64": DATA_URL,
            "maskBase64": DATA_URL,
            "prompt": "replace only the masked shirt",
        },
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "style_swap_openai_not_configured"


def test_invalid_provider_fails_closed(monkeypatch):
    monkeypatch.setenv("STYLE_SWAP_PROVIDER", "unknown")
    response = client.post(
        "/api/style-swap",
        headers={"Authorization": "Bearer test-token"},
        json={
            "imageBase64": DATA_URL,
            "maskBase64": DATA_URL,
            "prompt": "replace only the masked shirt",
        },
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "style_swap_provider_invalid"
