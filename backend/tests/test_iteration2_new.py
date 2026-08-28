"""
STAAR Hub — Iteration 2 NEW feature tests.
Covers:
- POST /api/demo/scenario (morning + evening switch)
- GET /api/guardian/signals (poor_recovery for morning)
- POST /api/guardian/coordinate-morning (4 actions + state mutations)
- POST /api/guardian/speak + GET /api/tts/{key}.mp3 (fresh + cached + 404)
- Regression: coordinate-evening still returns 6 actions + spoken_summary
- /api/guardian/view includes morning + evening coordinations
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
    tok = r.json()["session_token"]
    return {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}


# --- Morning scenario seeding ---
class TestMorningScenario:
    def test_load_morning_scenario(self, session, auth):
        r = session.post(f"{API}/demo/scenario", headers=auth, json={"scenario": "morning"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["scenario"] == "morning"

    def test_wellbeing_seeded_with_rough_night(self, session, auth):
        r = session.get(f"{API}/portal/wellbeing/state", headers=auth, timeout=15)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data.get("slept_poorly") is True
        assert data.get("sleep_hours") == 4.5

    def test_morning_signals_include_poor_recovery(self, session, auth):
        r = session.get(f"{API}/guardian/signals", headers=auth, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["paused"] is False
        pr = [s for s in body["signals"] if s["type"] == "poor_recovery"]
        assert len(pr) == 1, f"expected poor_recovery, got: {body['signals']}"
        pr = pr[0]
        assert pr["sourcePortal"] == "wellbeing"
        # targets should include work + style
        assert "work" in pr["suggestedTargets"]
        assert "style" in pr["suggestedTargets"]

    def test_switch_back_to_evening(self, session, auth):
        r = session.post(f"{API}/demo/scenario", headers=auth, json={"scenario": "evening"}, timeout=15)
        assert r.status_code == 200
        # verify work is back to overload
        w = session.get(f"{API}/portal/work/state", headers=auth, timeout=15).json()["data"]
        assert w["workload"] == "high"
        # wellbeing no longer slept_poorly
        wb = session.get(f"{API}/portal/wellbeing/state", headers=auth, timeout=15).json()["data"]
        assert wb.get("slept_poorly") is False


# --- Coordinate morning ---
class TestCoordinateMorning:
    def test_coordinate_morning_returns_four_actions_and_mutates(self, session):
        # fresh user
        r = session.post(f"{API}/auth/demo", timeout=30)
        tok = r.json()["session_token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        # load morning
        assert session.post(f"{API}/demo/scenario", headers=h, json={"scenario": "morning"}, timeout=15).status_code == 200
        c = session.post(f"{API}/guardian/coordinate-morning", headers=h, json={"approve": True}, timeout=30)
        assert c.status_code == 200
        body = c.json()
        portals = [a["portal"] for a in body["actions"]]
        for expected in ["wellbeing", "work", "style", "home"]:
            assert expected in portals, f"missing {expected} in {portals}"
        assert len(body["actions"]) == 4
        assert body.get("coordination_id", "").startswith("coord_")

        # State mutations
        wb = session.get(f"{API}/portal/wellbeing/state", headers=h, timeout=15).json()["data"]
        assert wb.get("gentle_start_active") is True
        st = session.get(f"{API}/portal/style/state", headers=h, timeout=15).json()["data"]
        outfit = st.get("planned_outfit")
        assert outfit and outfit.get("name") == "Low-effort confidence"
        hs = session.get(f"{API}/portal/home/state", headers=h, timeout=15).json()["data"]
        assert hs.get("lights") == "sunrise"


# --- Guardian speak (TTS) ---
class TestGuardianSpeak:
    def test_speak_generates_and_caches_audio(self, session):
        # fresh user + evening coord
        r = session.post(f"{API}/auth/demo", timeout=30)
        tok = r.json()["session_token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        c = session.post(f"{API}/guardian/coordinate-evening", headers=h, json={"approve": True}, timeout=30)
        cid = c.json()["coordination_id"]

        # first call — may take 5-15s
        import time
        t0 = time.time()
        s1 = session.post(f"{API}/guardian/speak", headers=h, json={"coordination_id": cid}, timeout=60)
        elapsed1 = time.time() - t0
        assert s1.status_code == 200, f"speak failed: {s1.status_code} {s1.text[:400]}"
        url1 = s1.json()["url"]
        assert url1.startswith("/api/tts/") and url1.endswith(".mp3")

        # Fetch the audio
        audio = session.get(f"{BASE_URL}{url1}", timeout=30)
        assert audio.status_code == 200
        assert audio.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(audio.content) > 5000, f"audio too small: {len(audio.content)} bytes"

        # second call should be cached (fast)
        t1 = time.time()
        s2 = session.post(f"{API}/guardian/speak", headers=h, json={"coordination_id": cid}, timeout=30)
        elapsed2 = time.time() - t1
        assert s2.status_code == 200
        assert s2.json()["url"] == url1
        assert elapsed2 < max(3.0, elapsed1)  # cached call must be faster
        print(f"[speak] first={elapsed1:.2f}s cached={elapsed2:.2f}s size={len(audio.content)}B")

    def test_speak_invalid_coordination_id_returns_404(self, session, auth):
        r = session.post(f"{API}/guardian/speak", headers=auth, json={"coordination_id": "coord_doesnotexist"}, timeout=15)
        assert r.status_code == 404

    def test_get_tts_invalid_key_returns_404(self, session):
        r = session.get(f"{API}/tts/nonexistent_key_zzz.mp3", timeout=15)
        assert r.status_code == 404


# --- Regression: coordinate-evening + guardian-view ---
class TestEveningRegression:
    def test_evening_still_returns_six_actions_with_spoken_summary(self, session):
        r = session.post(f"{API}/auth/demo", timeout=30)
        tok = r.json()["session_token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        c = session.post(f"{API}/guardian/coordinate-evening", headers=h, json={"approve": True}, timeout=30)
        assert c.status_code == 200
        body = c.json()
        assert len(body["actions"]) == 6
        # Confirm guardian_activity persisted with spoken_summary
        v = session.get(f"{API}/guardian/view", headers=h, timeout=15)
        assert v.status_code == 200
        arr = v.json()
        assert len(arr) >= 1
        latest = arr[0]
        assert "spoken_summary" in latest and len(latest["spoken_summary"]) > 30

    def test_guardian_view_includes_morning_and_evening(self, session):
        r = session.post(f"{API}/auth/demo", timeout=30)
        tok = r.json()["session_token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        # Evening first (default scenario)
        session.post(f"{API}/guardian/coordinate-evening", headers=h, json={"approve": True}, timeout=30)
        # Switch to morning
        session.post(f"{API}/demo/scenario", headers=h, json={"scenario": "morning"}, timeout=15)
        session.post(f"{API}/guardian/coordinate-morning", headers=h, json={"approve": True}, timeout=30)

        v = session.get(f"{API}/guardian/view", headers=h, timeout=15).json()
        scenarios = [c.get("scenario") for c in v]
        assert "evening" in scenarios
        assert "morning" in scenarios
