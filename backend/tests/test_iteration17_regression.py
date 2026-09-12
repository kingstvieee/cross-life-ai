"""Iteration 17 — Backend smoke for STAARWAARDD after cinematic/audio changes.
Endpoints under test:
- POST /api/auth/demo         (demo session mint used by AuthProvider on fresh load)
- GET  /api/guardian/judge-demo/1  (scene 1 payload for the Judge Demo)
- POST /api/guardian/speak-line    (Guardian TTS line used by the arrival + demo narration)
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(api):
    r = api.post(f"{BASE_URL}/api/auth/demo", json={})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "session_token" in body and body["session_token"].startswith("demo_")
    return body["session_token"]


# --- Auth demo -----------------------------------------------------------
class TestAuthDemo:
    def test_demo_session_mint(self, api):
        r = api.post(f"{BASE_URL}/api/auth/demo", json={})
        assert r.status_code == 200
        body = r.json()
        assert body.get("session_token", "").startswith("demo_")
        user = body.get("user") or {}
        assert user.get("companion") == "guardian"
        assert set(user.get("portals_enabled") or []) >= {
            "creativity", "work", "home", "wellbeing", "relationships", "community", "style"
        }


# --- Judge demo scene ----------------------------------------------------
class TestJudgeDemoScene:
    def test_scene_1_returns_payload(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/judge-demo/1")
        assert r.status_code == 200
        body = r.json()
        # scene payload contains narration text and a cached TTS url
        assert body.get("text"), "scene 1 must include narration text"
        assert body.get("url", "").endswith(".mp3"), "scene 1 must return TTS url"

    def test_scene_url_streams(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/judge-demo/1")
        url = r.json()["url"]
        # backend only supports GET on TTS route; use a small ranged GET
        got = requests.get(
            f"{BASE_URL}{url}",
            headers={"Range": "bytes=0-2047"},
            allow_redirects=True,
            timeout=15,
        )
        assert got.status_code in (200, 206), f"expected 200/206, got {got.status_code}"
        assert len(got.content) > 0


# --- Speak line ----------------------------------------------------------
class TestSpeakLine:
    def test_speak_line_returns_audio(self, api, demo_token):
        r = api.post(
            f"{BASE_URL}/api/guardian/speak-line",
            headers={"Authorization": f"Bearer {demo_token}"},
            json={"text": "Judges, this is a smoke test.", "voice": "guardian"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("url", "").endswith(".mp3")
        assert "smoke test" in (body.get("text") or "").lower()

    def test_speak_line_audio_file_reachable(self, api, demo_token):
        r = api.post(
            f"{BASE_URL}/api/guardian/speak-line",
            headers={"Authorization": f"Bearer {demo_token}"},
            json={"text": "Hello judges", "voice": "guardian"},
        )
        assert r.status_code == 200
        url = r.json()["url"]
        got = requests.get(
            f"{BASE_URL}{url}",
            headers={"Range": "bytes=0-2047"},
            allow_redirects=True,
            timeout=15,
        )
        assert got.status_code in (200, 206)
        assert len(got.content) > 0
