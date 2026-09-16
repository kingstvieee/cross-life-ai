import pytest

from guardian_core import GuardianCore


def test_initial_registry_and_priority():
    core = GuardianCore()
    briefing = core.briefing()
    assert briefing["activeCount"] == 3
    assert briefing["priority"]["id"] == "hub-core-build"
    assert [m["id"] for m in core.list_missions(portal="Style")] == ["rsf-fabric-sourcing"]


def test_completion_requires_verified_evidence():
    core = GuardianCore()
    with pytest.raises(ValueError):
        core.update_mission("hub-core-build", {"status": "completed"}, ledger_state="VERIFIED_COMPLETE")
    completed = core.update_mission("hub-core-build", {"status": "completed"}, ledger_state="VERIFIED_COMPLETE", evidence={"test": "passed"})
    assert completed["status"] == "completed"
    assert completed["lastVerifiedUpdate"]


def test_private_mode_is_audited():
    core = GuardianCore()
    result = core.set_private_mode(True)
    assert result == {"privateMode": True}
    assert core.ledger[-1]["evidence"] == {"setting": "privateMode", "value": True}
