import ast
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.cors import CORSMiddleware

SERVER = Path(__file__).with_name("server.py")

def test_source_never_sets_wildcard_cors_when_auth_app_origin_missing():
    text = SERVER.read_text()
    assert 'allow_origins=[app_origin()] if app_origin() else []' in text
    assert 'allow_origins=[app_origin()] if app_origin() else ["*"]' not in text

@pytest.mark.parametrize("approved_origin", [None, "https://staarwardd.example"])
def test_cross_origin_browser_requests_default_deny_and_only_trusted_origin_allowed(approved_origin):
    app = FastAPI()
    @app.get("/api/check")
    def check():
        return {"ok": True}
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=bool(approved_origin),
        allow_origins=[approved_origin] if approved_origin else [],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    client = TestClient(app)
    untrusted=client.options("/api/check", headers={
        "Origin": "https://untrusted.example",
        "Access-Control-Request-Method": "GET",
    })
    assert untrusted.status_code == 400
    assert "access-control-allow-origin" not in untrusted.headers
    trusted=client.options("/api/check", headers={
        "Origin": "https://staarwardd.example",
        "Access-Control-Request-Method": "GET",
    })
    if approved_origin:
        assert trusted.status_code == 200
        assert trusted.headers.get("access-control-allow-origin") == approved_origin
    else:
        assert trusted.status_code == 400
        assert "access-control-allow-origin" not in trusted.headers
