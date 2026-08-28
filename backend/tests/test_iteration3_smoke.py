"""
STAAR Hub — Iteration 3 SMOKE tests.
Verifies:
- POST /api/auth/demo works
- GET /api/guardian/signals returns valid payload
- POST /api/guardian/chat-once returns non-empty reply (now GPT-5.6-terra)
"""
import os
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
    assert r.status_code == 200
    body = r.json()
    assert "session_token" in body
    tok = body["session_token"]
    return {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}


def test_auth_demo_ok(session):
    r = session.post(f"{API}/auth/demo", timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "session_token" in j and len(j["session_token"]) > 10


def test_signals_ok(session, auth):
    r = session.get(f"{API}/guardian/signals", headers=auth, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "signals" in body
    assert "paused" in body
    assert isinstance(body["signals"], list)


def test_chat_once_returns_nonempty_reply(session, auth):
    payload = {"message": "In one short sentence, greet me warmly."}
    r = session.post(f"{API}/guardian/chat-once", headers=auth, json=payload, timeout=90)
    assert r.status_code == 200, f"chat-once failed: {r.status_code} {r.text[:400]}"
    body = r.json()
    assert "reply" in body, f"missing reply key: {body}"
    reply = body["reply"]
    assert isinstance(reply, str) and len(reply.strip()) > 5, f"empty reply: {reply!r}"
    print(f"[chat-once] reply len={len(reply)} preview={reply[:120]!r}")
