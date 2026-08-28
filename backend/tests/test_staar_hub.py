"""
STAAR Hub — Backend regression tests.
Covers: demo auth, portal state, guardian signals, coordinate-evening,
guardian-view, community events, chat-once (GPT-5.4), user profile & privacy.
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://cross-life-ai.preview.emergentagent.com"
).rstrip("/")

API = f"{BASE_URL}/api"


# --------- Fixtures ---------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_auth(client):
    """Create a demo session used across tests."""
    r = client.post(f"{API}/auth/demo", timeout=30)
    assert r.status_code == 200, f"demo auth failed: {r.status_code} {r.text}"
    data = r.json()
    assert "session_token" in data and "user" in data
    return {
        "token": data["session_token"],
        "user": data["user"],
        "headers": {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {data['session_token']}",
        },
    }


# --------- Health ---------
def test_root_alive(client):
    r = client.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("app") == "STAAR Hub"


# --------- Auth ---------
class TestAuth:
    def test_demo_creates_user_and_session(self, demo_auth):
        u = demo_auth["user"]
        assert u["is_demo"] is True
        assert u["onboarding_complete"] is True
        assert u["companion"] == "guardian"
        assert len(u["portals_enabled"]) == 7

    def test_auth_me_with_token(self, client, demo_auth):
        r = client.get(f"{API}/auth/me", headers=demo_auth["headers"], timeout=15)
        assert r.status_code == 200
        me = r.json()
        assert me["user_id"] == demo_auth["user"]["user_id"]

    def test_auth_me_without_token(self, client):
        r = client.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_auth_me_invalid_token(self, client):
        r = client.get(
            f"{API}/auth/me",
            headers={"Authorization": "Bearer bogus_token_xyz"},
            timeout=15,
        )
        assert r.status_code == 401


# --------- Portal state ---------
class TestPortalState:
    def test_work_seeded_with_high_workload_and_six_tasks(self, client, demo_auth):
        r = client.get(f"{API}/portal/work/state", headers=demo_auth["headers"], timeout=15)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["workload"] == "high"
        assert data["stress"] >= 7
        assert len(data["tasks"]) == 6

    @pytest.mark.parametrize("portal", ["wellbeing", "home", "relationships", "community", "style", "creativity"])
    def test_other_portals_have_seeded_state(self, client, demo_auth, portal):
        r = client.get(f"{API}/portal/{portal}/state", headers=demo_auth["headers"], timeout=15)
        assert r.status_code == 200
        assert "data" in r.json()

    def test_task_toggle_persists(self, client, demo_auth):
        # Fetch current work state
        r = client.get(f"{API}/portal/work/state", headers=demo_auth["headers"], timeout=15)
        data = r.json()["data"]
        # Toggle t1 done
        for t in data["tasks"]:
            if t["id"] == "t1":
                t["done"] = True
        w = client.post(
            f"{API}/portal/work/state",
            headers=demo_auth["headers"],
            json={"data": data},
            timeout=15,
        )
        assert w.status_code == 200
        # Verify persistence
        r2 = client.get(f"{API}/portal/work/state", headers=demo_auth["headers"], timeout=15)
        t1 = next(t for t in r2.json()["data"]["tasks"] if t["id"] == "t1")
        assert t1["done"] is True


# --------- Guardian signals ---------
class TestGuardianSignals:
    def test_signals_contain_work_event_stress(self, client, demo_auth):
        r = client.get(f"{API}/guardian/signals", headers=demo_auth["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["paused"] is False
        types = {s["type"] for s in body["signals"]}
        assert "workload" in types
        assert "upcoming_event" in types
        assert "elevated_stress" in types

    def test_signals_paused_when_cross_life_paused(self, client, demo_auth):
        # Create a fresh demo user to avoid clashing state
        r = client.post(f"{API}/auth/demo", timeout=30)
        tok = r.json()["session_token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        p = client.post(f"{API}/user/privacy", headers=h, json={"cross_life_paused": True}, timeout=15)
        assert p.status_code == 200
        assert p.json()["cross_life_paused"] is True
        s = client.get(f"{API}/guardian/signals", headers=h, timeout=15)
        body = s.json()
        assert body["paused"] is True
        assert body["signals"] == []
        # Toggle back
        p2 = client.post(f"{API}/user/privacy", headers=h, json={"cross_life_paused": False}, timeout=15)
        assert p2.json()["cross_life_paused"] is False


# --------- Coordinate evening ---------
class TestCoordinateEvening:
    def test_coordination_produces_six_actions_and_mutates_state(self, client):
        # Fresh demo user so tests are deterministic
        r = client.post(f"{API}/auth/demo", timeout=30)
        tok = r.json()["session_token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        c = client.post(f"{API}/guardian/coordinate-evening", headers=h, json={"approve": True}, timeout=30)
        assert c.status_code == 200
        body = c.json()
        portals = [a["portal"] for a in body["actions"]]
        # Full evening scenario: 6 actions
        for expected in ["work", "wellbeing", "home", "relationships", "style", "community"]:
            assert expected in portals, f"missing action for {expected}: {portals}"
        assert len(body["actions"]) == 6

        # Wellbeing decompression_active
        w = client.get(f"{API}/portal/wellbeing/state", headers=h, timeout=15).json()["data"]
        assert w.get("decompression_active") is True
        # Home routine_started
        hs = client.get(f"{API}/portal/home/state", headers=h, timeout=15).json()["data"]
        assert hs.get("routine_started") is True
        # Style planned_outfit
        st = client.get(f"{API}/portal/style/state", headers=h, timeout=15).json()["data"]
        assert st.get("planned_outfit") is not None

        # Guardian-view returns coordination
        v = client.get(f"{API}/guardian/view", headers=h, timeout=15)
        assert v.status_code == 200
        arr = v.json()
        assert isinstance(arr, list) and len(arr) >= 1
        assert arr[0]["approved"] is True


# --------- Community events ---------
def test_community_events_returns_four(client):
    r = client.get(f"{API}/community/events", timeout=15)
    assert r.status_code == 200
    events = r.json()
    assert isinstance(events, list) and len(events) == 4


# --------- Demo reseed ---------
def test_demo_reseed(client, demo_auth):
    r = client.post(f"{API}/demo/reseed", headers=demo_auth["headers"], timeout=15)
    assert r.status_code == 200
    # after reseed, work should reset to high with 6 tasks (t1 no longer done)
    w = client.get(f"{API}/portal/work/state", headers=demo_auth["headers"], timeout=15).json()["data"]
    assert w["workload"] == "high"
    assert len(w["tasks"]) == 6
    t1 = next(t for t in w["tasks"] if t["id"] == "t1")
    assert t1["done"] is False


# --------- User profile ---------
def test_update_profile(client, demo_auth):
    r = client.post(
        f"{API}/user/profile",
        headers=demo_auth["headers"],
        json={"companion": "kaia", "autonomy": "proactive", "onboarding_complete": True},
        timeout=15,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["companion"] == "kaia"
    assert body["autonomy"] == "proactive"
    assert body["onboarding_complete"] is True
    # revert
    client.post(
        f"{API}/user/profile",
        headers=demo_auth["headers"],
        json={"companion": "guardian", "autonomy": "assist"},
        timeout=15,
    )


# --------- Guardian chat-once (GPT-5.4) ---------
def test_guardian_chat_once_returns_nonempty(client, demo_auth):
    r = client.post(
        f"{API}/guardian/chat-once",
        headers=demo_auth["headers"],
        json={"message": "Give me a one-line calm reset before my 8pm plan.", "portal": "hub", "companion": "guardian"},
        timeout=90,
    )
    assert r.status_code == 200, f"chat-once failed: {r.status_code} {r.text[:400]}"
    reply = r.json().get("reply", "")
    assert isinstance(reply, str) and len(reply.strip()) > 5, f"empty reply: '{reply}'"


# --------- Logout ---------
def test_logout_invalidates_session(client):
    r = client.post(f"{API}/auth/demo", timeout=30)
    tok = r.json()["session_token"]
    h = {"Authorization": f"Bearer {tok}"}
    lo = client.post(f"{API}/auth/logout", headers=h, timeout=15)
    assert lo.status_code == 200
    me = client.get(f"{API}/auth/me", headers=h, timeout=15)
    assert me.status_code == 401
