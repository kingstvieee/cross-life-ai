"""Iteration 14 — Guardian-led judge demo backend regression.

Covers the new public cached GET /api/guardian/judge-demo/{scene} (scenes 1–7),
error cases for scenes 0 and 8, and the MP3 fetch mime for one narration.
Also confirms basic auth/demo still works so front-end can log in.
"""

import os
import re
import pytest
import requests

def _load_backend_url() -> str:
    v = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if v:
        return v.rstrip("/")
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for ln in f:
                if ln.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    return ln.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL missing")


BASE_URL = _load_backend_url()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- /api/auth/demo sanity (frontend auto-mints demo sessions) ----
class TestAuthDemo:
    def test_demo_login_ok(self, api):
        r = api.post(f"{BASE_URL}/api/auth/demo", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_token" in data
        assert data.get("user", {}).get("is_demo") is True


# ---- /api/guardian/judge-demo/{scene} ----
class TestJudgeDemo:
    @pytest.mark.parametrize("scene", [1, 2, 3, 4, 5, 6, 7])
    def test_scene_200(self, api, scene):
        r = api.get(f"{BASE_URL}/api/guardian/judge-demo/{scene}")
        assert r.status_code == 200, f"scene={scene} status={r.status_code} body={r.text}"
        data = r.json()
        assert "url" in data and "text" in data
        assert isinstance(data["url"], str) and data["url"].startswith("/api/tts/")
        assert isinstance(data["text"], str) and len(data["text"]) > 40

    def test_scene_0_404(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/judge-demo/0")
        assert r.status_code == 404

    def test_scene_8_404(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/judge-demo/8")
        assert r.status_code == 404

    # Narration content checks per user's acceptance criteria (#3)
    def test_scene1_mentions_executive_product_review(self, api):
        text = api.get(f"{BASE_URL}/api/guardian/judge-demo/1").json()["text"]
        assert "executive product review" in text.lower() or "product review" in text.lower()

    def test_scene2_mentions_metric_conflict(self, api):
        text = api.get(f"{BASE_URL}/api/guardian/judge-demo/2").json()["text"]
        # scene 2 speaks to the audience metric conflict (18,000 vs 11,400)
        assert "eleven thousand" in text.lower() or "11,400" in text or "eighteen thousand" in text.lower()

    def test_scene6_new_signal(self, api):
        text = api.get(f"{BASE_URL}/api/guardian/judge-demo/6").json()["text"]
        assert "new signal" in text.lower()

    def test_tts_mp3_from_scene1(self, api):
        j = api.get(f"{BASE_URL}/api/guardian/judge-demo/1").json()
        url = j["url"]
        assert re.match(r"^/api/tts/[a-f0-9]+\.mp3$", url), url
        r = api.get(f"{BASE_URL}{url}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 500

    def test_public_no_auth_needed(self, api):
        # No Authorization header — must still return 200
        bare = requests.Session()
        r = bare.get(f"{BASE_URL}/api/guardian/judge-demo/1")
        assert r.status_code == 200


# ---- Regression: greeting + portal-intro still work (from prior iterations) ----
class TestRegression:
    def test_greeting(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/greeting")
        assert r.status_code == 200
        assert "url" in r.json() and "text" in r.json()

    def test_portal_intro_work(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/portal-intro/work")
        assert r.status_code == 200
        assert "Work" in r.json()["text"]

    def test_portal_intro_unknown_404(self, api):
        r = api.get(f"{BASE_URL}/api/guardian/portal-intro/nope")
        assert r.status_code == 404
