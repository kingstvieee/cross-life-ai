"""Regression tests for STAAR Hub Guardian greeting + TTS endpoints (iteration 11).

Covers:
- GET /api/guardian/greeting -> 200 {url}
- GET /api/tts/<key>.mp3    -> 200 audio/mpeg (from URL returned above)
"""

import os
import re

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    s.close()


class TestGuardianGreeting:
    """Guardian greeting endpoint returns a stable /api/tts/<key>.mp3 URL."""

    def test_greeting_returns_tts_url(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/guardian/greeting", timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body, body
        assert re.match(r"^/api/tts/[0-9a-f]{32}\.mp3$", body["url"]), body["url"]

    def test_greeting_is_deterministic(self, api_client):
        r1 = api_client.get(f"{BASE_URL}/api/guardian/greeting", timeout=60)
        r2 = api_client.get(f"{BASE_URL}/api/guardian/greeting", timeout=60)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["url"] == r2.json()["url"]


class TestTTSAudio:
    """Fetching the URL returned by /guardian/greeting streams mp3 audio."""

    def test_tts_mp3_returns_audio(self, api_client):
        g = api_client.get(f"{BASE_URL}/api/guardian/greeting", timeout=60)
        assert g.status_code == 200
        url = g.json()["url"]
        r = api_client.get(f"{BASE_URL}{url}", timeout=60)
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("audio/mpeg"), r.headers
        # audio payload should be non-trivial (>1 KB)
        assert len(r.content) > 1024, len(r.content)

    def test_tts_missing_key_returns_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/tts/deadbeefdeadbeefdeadbeefdeadbeef.mp3", timeout=30)
        assert r.status_code == 404
