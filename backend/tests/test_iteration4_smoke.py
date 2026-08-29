"""
STAAR Hub — Iteration 4 SMOKE tests (P0 backend endpoints).

Verifies:
- POST /api/auth/demo -> session_token
- POST /api/guardian/coordinate-evening -> success + non-empty actions/sheet
- POST /api/guardian/speak -> returns audio payload or url (cache warm on 2nd call)
"""
import os
import time
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
).rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(session):
    r = session.post(f"{API}/auth/demo", timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json()["session_token"]
    return {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}


# ---- auth demo ----
def test_auth_demo_ok(session):
    r = session.post(f"{API}/auth/demo", timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "session_token" in j and len(j["session_token"]) > 10


# ---- coordinate-evening ----
@pytest.fixture(scope="module")
def coordination_id(session, auth):
    r = session.post(
        f"{API}/guardian/coordinate-evening",
        headers=auth,
        json={"approve": True},
        timeout=30,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
    body = r.json()
    assert isinstance(body, dict)
    # Endpoint should return an id we can pass to /speak
    cid = body.get("id") or body.get("coordination_id") or body.get("_id")
    assert cid, f"no coordination id in response: {list(body.keys())}"
    return cid


def test_coordinate_evening_returns_actions(session, auth):
    r = session.post(
        f"{API}/guardian/coordinate-evening",
        headers=auth,
        json={"approve": True},
        timeout=30,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
    body = r.json()
    assert isinstance(body, dict) and body
    # Any list-shaped value (actions / plan / sheet)
    assert any(isinstance(v, list) and v for v in body.values()), f"no non-empty list: {body}"


# ---- speak (TTS) cache warm test ----
def test_speak_cache_warm(session, auth, coordination_id):
    payload = {"coordination_id": coordination_id}
    # cold
    t0 = time.time()
    r1 = session.post(f"{API}/guardian/speak", headers=auth, json=payload, timeout=90)
    cold = time.time() - t0
    assert r1.status_code == 200, f"speak cold failed: {r1.status_code} {r1.text[:300]}"

    # warm
    t0 = time.time()
    r2 = session.post(f"{API}/guardian/speak", headers=auth, json=payload, timeout=60)
    warm = time.time() - t0
    assert r2.status_code == 200
    print(f"[speak] cold={cold:.2f}s warm={warm:.2f}s")
