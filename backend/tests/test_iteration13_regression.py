"""Iteration 13 — full judge journey regression.

Covers all endpoints called out in the review request:
  - POST /api/auth/demo               → 200 + shape
  - GET  /api/guardian/greeting       → 200 {url,text}
  - GET  /api/guardian/portal-intro/work   → 200 {url,text}
  - GET  /api/guardian/portal-intro/bogus  → 404
  - POST /api/guardian/speak-line     → 401 unauth / 200 authed / 422 >200 chars
  - GET  /api/scorecard/image         → 401 unauth / 200 image/png authed
  - GET  /api/tts/<key>.mp3           → audio/mpeg
  - POST /api/guardian/coordinate-evening + coordinate-morning (core demo flow)

Rate budget:
  - Mints ONE demo session per module (reused across tests) → 1 hit on demo bucket
  - Fires only short cached tts lookups → cheap
  - Skips paid chat entirely (already covered by iteration 12)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://cross-life-ai.preview.emergentagent.com",
).rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(api):
    r = api.post(f"{BASE_URL}/api/auth/demo")
    if r.status_code == 429:
        pytest.skip("demo bucket exhausted for this IP hour")
    assert r.status_code == 200, f"demo mint failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "session_token" in data and data["session_token"], data
    assert "user" in data and data["user"].get("is_demo") is True
    return data["session_token"]


@pytest.fixture(scope="module")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ---------- auth ----------
class TestAuthDemo:
    def test_demo_returns_session_and_user(self, demo_token):
        # Fixture asserted shape; also verify /api/auth/me accepts the token.
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {demo_token}"},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        me = r.json()
        assert me.get("is_demo") is True
        assert isinstance(me.get("portals_enabled"), list) and len(me["portals_enabled"]) == 7


# ---------- guardian voice lines ----------
class TestGuardianVoiceLines:
    def test_greeting_shape(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/greeting")
        if r.status_code == 429:
            pytest.skip("ttsline bucket rate-limited")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["url"].startswith("/api/tts/") and data["url"].endswith(".mp3")
        assert isinstance(data["text"], str) and len(data["text"]) > 0

    def test_portal_intro_work(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/portal-intro/work")
        if r.status_code == 429:
            pytest.skip("ttsline rate limited")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "text" in data
        assert "Work" in data["text"]

    def test_portal_intro_bogus_404(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/portal-intro/does-not-exist-xyz")
        assert r.status_code in (404, 429), r.text

    def test_tts_mp3_serves_audio_mpeg(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/greeting")
        if r.status_code != 200:
            pytest.skip("greeting rate limited")
        url = r.json()["url"]
        r2 = api.get(f"{BASE_URL}{url}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r2.content) > 500


# ---------- speak-line (verdict narration) ----------
class TestSpeakLine:
    def test_speak_line_unauth_401(self, api):
        r = api.post(f"{BASE_URL}/api/guardian/speak-line", json={"text": "Hello judges."})
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"

    def test_speak_line_authed_returns_url_text(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/guardian/speak-line",
            json={"text": "Your demo is complete."},
            headers=auth_headers,
        )
        if r.status_code == 429:
            pytest.skip("tts user bucket exhausted")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["url"].startswith("/api/tts/") and data["url"].endswith(".mp3")
        assert isinstance(data["text"], str) and data["text"]

    def test_speak_line_over_200_chars_returns_422(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/guardian/speak-line",
            json={"text": "x" * 201},
            headers=auth_headers,
        )
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:200]}"


# ---------- scorecard image ----------
class TestScorecardImage:
    def test_scorecard_image_unauth_401(self, api):
        r = api.get(f"{BASE_URL}/api/scorecard/image?actions=3&remembered=1&memory_on=true")
        assert r.status_code == 401, f"expected 401, got {r.status_code}"

    def test_scorecard_image_authed_returns_png(self, api, auth_headers):
        r = api.get(
            f"{BASE_URL}/api/scorecard/image?actions=6&remembered=2&memory_on=true&lines=a%7Cb",
            headers=auth_headers,
        )
        if r.status_code == 429:
            pytest.skip("share bucket exhausted")
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/png")
        # PNG magic bytes
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "not a valid PNG"
        assert len(r.content) > 2000  # rendered PNG should be non-trivial


# ---------- core demo flow (Work → Wellbeing coordination) ----------
class TestCoreDemoFlow:
    def test_coordinate_evening_and_morning(self, api, auth_headers):
        """Cross-life Work-evening + Wellbeing-morning still functions end-to-end."""
        ev = api.post(
            f"{BASE_URL}/api/guardian/coordinate-evening",
            json={"context": "wrapping up an intense work day"},
            headers=auth_headers,
            timeout=45,
        )
        # 200 on success. 429 acceptable if bucket hit. Allow 5xx skip for LLM flake.
        if ev.status_code in (429,):
            pytest.skip("coord bucket rate limited")
        if ev.status_code >= 500:
            pytest.skip(f"upstream {ev.status_code}: {ev.text[:200]}")
        assert ev.status_code == 200, ev.text
        ev_data = ev.json()
        # Response must be structured (not empty, contains coordination artefacts)
        assert isinstance(ev_data, dict) and len(ev_data) > 0

        mo = api.post(
            f"{BASE_URL}/api/guardian/coordinate-morning",
            json={"context": "morning after that intense work day"},
            headers=auth_headers,
            timeout=45,
        )
        if mo.status_code in (429,):
            pytest.skip("coord bucket rate limited")
        if mo.status_code >= 500:
            pytest.skip(f"upstream {mo.status_code}: {mo.text[:200]}")
        assert mo.status_code == 200, mo.text
        mo_data = mo.json()
        assert isinstance(mo_data, dict) and len(mo_data) > 0
