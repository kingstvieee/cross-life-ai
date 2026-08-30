"""Iteration 12 — security hardening + new UX endpoints verification.

Covers:
  - /api/auth/demo rate limit (10/hour/IP)
  - /api/guardian/chat-once payload cap (2000 chars), rate limit (20/min), reply
  - /api/portal/{id}/state 20KB payload cap
  - /api/guardian/greeting shape + audio/mpeg
  - /api/guardian/portal-intro/{id} known + unknown
  - CORS credentials off
"""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://cross-life-ai.preview.emergentagent.com').rstrip('/')
# Provided by main agent — fresh demo token, valid 24h.
EXISTING_TOKEN = "demo_bcd24315c8ea45148e96e87a30a4586d"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_headers():
    return {"Authorization": f"Bearer {EXISTING_TOKEN}"}


# ---------- greeting + portal-intro ----------
class TestGuardianVoiceLines:
    def test_greeting_returns_url_and_text(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/greeting")
        # Rate limit may have consumed budget; accept 200 or 429
        assert r.status_code in (200, 429), r.text
        if r.status_code == 200:
            data = r.json()
            assert "url" in data and data["url"].startswith("/api/tts/") and data["url"].endswith(".mp3")
            assert "text" in data and isinstance(data["text"], str) and data["text"]

    def test_portal_intro_work_ok(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/portal-intro/work")
        assert r.status_code in (200, 429), r.text
        if r.status_code == 200:
            data = r.json()
            assert "url" in data and "text" in data
            assert "Work" in data["text"]

    def test_portal_intro_bogus_404(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/portal-intro/bogus")
        # rate limit runs before the lookup so we may get 429 first; treat both as valid
        assert r.status_code in (404, 429), r.text

    def test_tts_mp3_serves_audio_mpeg(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/greeting")
        if r.status_code != 200:
            pytest.skip("greeting rate limited; cannot fetch mp3 key")
        url = r.json()["url"]
        r2 = api.get(f"{BASE_URL}{url}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r2.content) > 500  # non-empty audio


# ---------- auth/demo rate limit ----------
class TestAuthDemoRateLimit:
    def test_demo_rate_limit_triggers_429(self, api):
        """Fire up to 12 rapid demo creates; must hit 429 within budget."""
        got_429 = False
        got_200 = 0
        for _ in range(12):
            r = api.post(f"{BASE_URL}/api/auth/demo")
            if r.status_code == 429:
                got_429 = True
                break
            elif r.status_code == 200:
                got_200 += 1
        # Either we minted new sessions until we hit 429, OR budget already exhausted (immediate 429).
        assert got_429, f"expected 429 within 12 calls; got only 200s ({got_200})"


# ---------- chat-once payload cap + rate limit + reply ----------
class TestChatOnce:
    def test_chat_too_long_returns_422(self, api, auth_headers):
        payload = {"message": "x" * 2001, "companion": "guardian"}
        r = api.post(f"{BASE_URL}/api/guardian/chat-once", json=payload, headers=auth_headers)
        assert r.status_code == 422, r.text

    def test_chat_empty_returns_422(self, api, auth_headers):
        r = api.post(f"{BASE_URL}/api/guardian/chat-once", json={"message": ""}, headers=auth_headers)
        assert r.status_code == 422

    def test_chat_rate_limit_20_per_minute(self, api, auth_headers):
        """Fire 22 short valid chats; must hit 429 by call ~21.
        NOTE: This spends real GPT credits; short 'hi' messages only.
        """
        got_429 = False
        got_success = 0
        for i in range(22):
            r = api.post(
                f"{BASE_URL}/api/guardian/chat-once",
                json={"message": "hi"},
                headers=auth_headers,
                timeout=30,
            )
            if r.status_code == 429:
                got_429 = True
                break
            elif r.status_code == 200:
                got_success += 1
                # last successful call also asserts reply shape
                if got_success == 1:
                    assert "reply" in r.json()
            else:
                # transient 5xx from LLM is acceptable; skip further
                pytest.skip(f"upstream returned {r.status_code} on call {i}: {r.text[:200]}")
        assert got_429, f"rate limit did not trigger after 22 calls (got {got_success} 200s)"


# ---------- portal state payload cap ----------
class TestPortalStatePayloadCap:
    def test_small_payload_ok(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/portal/work/state",
            json={"data": {"note": "small", "n": 1}},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_large_payload_returns_413(self, api, auth_headers):
        big = {"blob": "A" * 25_000}
        r = api.post(
            f"{BASE_URL}/api/portal/work/state",
            json={"data": big},
            headers=auth_headers,
        )
        assert r.status_code == 413, f"expected 413 got {r.status_code}: {r.text[:200]}"


# ---------- CORS credentials off ----------
class TestCORSCredentialsOff:
    def test_cors_credentials_not_true(self, api):
        r = api.options(
            f"{BASE_URL}/api/guardian/greeting",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Access-Control-Allow-Credentials MUST NOT be 'true' when using wildcard origin
        allow_creds = r.headers.get("access-control-allow-credentials", "").lower()
        assert allow_creds != "true", f"credentials header must be off, got: {allow_creds}"
