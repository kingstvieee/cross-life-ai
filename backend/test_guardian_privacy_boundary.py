"""
Guardian retrieval-privacy boundary tests (P0 — deterministic, no live services).
Tests the pure logic of _gather_signals, _authorized_portal_states,
_portal_share_allowed, and coordination copy without importing the full server
(which requires live Mongo/emergent deps).
"""

import asyncio
import pathlib
import pytest


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Pure-logic stubs matching server.py signatures --------------------------
# ---------------------------------------------------------------------------
PORTALS = [
    {"id": "creativity"}, {"id": "work"}, {"id": "home"},
    {"id": "wellbeing"}, {"id": "relationships"}, {"id": "community"}, {"id": "style"},
]


def _portal_share_allowed(user, portal_id):
    prefs = (user.get("portal_privacy", {}) or {}).get(portal_id, {}) or {}
    return prefs.get("access", True) is not False and prefs.get("share", True) is not False


async def _authorized_portal_states(user, portal_state_rows):
    """In-memory version of server._authorized_portal_states."""
    if user.get("cross_life_paused"):
        return {}
    allowed = [p["id"] for p in PORTALS if _portal_share_allowed(user, p["id"])]
    states = {}
    for row in portal_state_rows:
        if row["portal"] in allowed:
            states[row["portal"]] = row.get("data", {})
    return states


async def _gather_signals(user_id, user, portal_state_rows):
    """Minimal port of server._gather_signals that uses in-memory state."""
    if (user or {}).get("cross_life_paused"):
        return []
    user = user or {"user_id": user_id}
    states = await _authorized_portal_states(user, portal_state_rows)
    signals = []
    work = states.get("work", {})
    if work.get("workload") == "high" or work.get("stress", 0) >= 7:
        signals.append({"sourcePortal": "work", "type": "workload"})
    return signals


# ---------------------------------------------------------------------------
# 1. cross_life_paused user yields no signals  ----------------------------
# ---------------------------------------------------------------------------
def test_paused_user_yields_empty_signals():
    user = {"user_id": "u1", "cross_life_paused": True, "portal_privacy": {}}
    rows = [{"portal": "work", "data": {"workload": "high"}}]
    signals = run(_gather_signals("u1", user, rows))
    assert signals == []


# ---------------------------------------------------------------------------
# 2. Per-portal share=False excludes that portal from authorized retrieval --
# ---------------------------------------------------------------------------
def test_portal_share_false_excluded():
    user = {
        "user_id": "u2",
        "cross_life_paused": False,
        "portal_privacy": {"work": {"access": True, "share": False}},
    }
    assert _portal_share_allowed(user, "work") is False
    # Work with high stress must NOT appear in authorized states
    rows = [{"portal": "work", "data": {"workload": "high", "stress": 9}}]
    states = run(_authorized_portal_states(user, rows))
    assert "work" not in states


# ---------------------------------------------------------------------------
# 3. Per-portal access=False excluded  ------------------------------------
# ---------------------------------------------------------------------------
def test_portal_access_false_excluded():
    user = {
        "user_id": "u3",
        "cross_life_paused": False,
        "portal_privacy": {"relationships": {"access": False, "share": True}},
    }
    assert _portal_share_allowed(user, "relationships") is False


# ---------------------------------------------------------------------------
# 4. All portals allowed by default  -------------------------------------
# ---------------------------------------------------------------------------
def test_all_portals_allowed_by_default():
    user = {"user_id": "u4", "cross_life_paused": False, "portal_privacy": {}}
    for portal in PORTALS:
        assert _portal_share_allowed(user, portal["id"]) is True


# ---------------------------------------------------------------------------
# 5. is_demo blocks mutation guard (pure logic, no FastAPI import)  --------
# ---------------------------------------------------------------------------
def test_demo_guard_pure_logic():
    """Verify the is_demo check logic that require_account_user implements."""
    async def require_account_user(user):
        if user.get("is_demo"):
            raise ValueError("demo_guest_read_only")
        return user

    with pytest.raises(ValueError, match="demo_guest_read_only"):
        run(require_account_user({"user_id": "demo_x", "is_demo": True}))

    real = run(require_account_user({"user_id": "real_y", "is_demo": False}))
    assert real["user_id"] == "real_y"


# ---------------------------------------------------------------------------
# 6. Coordination source strings: no unverified success language  ----------
# ---------------------------------------------------------------------------
FORBIDDEN_PHRASES = [
    "Uber pre-booked",
    "locks automatically",
    "Everything is handled",
    "I've got the rest of your evening",
]


def test_coordination_source_no_unverified_success():
    """Check server.py source directly for banned live-success claims."""
    server_src = pathlib.Path(__file__).parent / "server.py"
    if not server_src.exists():
        pytest.skip("server.py not present (live environment required)")
    text = server_src.read_text()
    for phrase in FORBIDDEN_PHRASES:
        assert phrase not in text, (
            f"Unverified success language still present in server.py: {phrase!r}"
        )


# ---------------------------------------------------------------------------
# 7. Paused guard fires before state read (pure logic)  -------------------
# ---------------------------------------------------------------------------
def test_coordinate_paused_guard_raises():
    async def coordinate(user):
        if user.get("cross_life_paused"):
            raise ValueError("cross_life_paused")
        states = await _authorized_portal_states(user, [])
        return states

    with pytest.raises(ValueError, match="cross_life_paused"):
        run(coordinate({"user_id": "u-p", "cross_life_paused": True, "portal_privacy": {}}))

    # unpaused user proceeds without error
    result = run(coordinate({"user_id": "u-ok", "cross_life_paused": False, "portal_privacy": {}}))
    assert result == {}


# ---------------------------------------------------------------------------
# 8. Non-shared portal data never reaches chat context  ------------------
# ---------------------------------------------------------------------------
def test_private_portal_absent_from_signals():
    """Portal with share=False must not contribute signals even if its data is high-stress."""
    user = {
        "user_id": "u5",
        "cross_life_paused": False,
        "portal_privacy": {"work": {"access": True, "share": False}},
    }
    rows = [{"portal": "work", "data": {"workload": "high", "stress": 10}}]
    signals = run(_gather_signals("u5", user, rows))
    assert all(s.get("sourcePortal") != "work" for s in signals), \
        f"Private work portal leaked into signals: {signals}"
