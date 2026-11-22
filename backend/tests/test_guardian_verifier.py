"""Tests for Guardian's independent verification gate."""
import pytest
import guardian_verifier as module


@pytest.mark.asyncio
async def test_rejects_worker_as_verifier():
    mission = {"owner_id": "o", "mission_id": "m", "status": "verifying",
               "lease_token": "t", "worker_id": "worker"}
    async def check(_):
        return True
    gate = module.GuardianVerifier(object(), {"check": check})
    with pytest.raises(module.VerificationRejected):
        await gate.verify(mission=mission, verifier_name="check",
                          verifier_identity="worker")


@pytest.mark.asyncio
async def test_rejects_unregistered_verifier():
    mission = {"owner_id": "o", "mission_id": "m", "status": "verifying",
               "lease_token": "t", "worker_id": "worker"}
    gate = module.GuardianVerifier(object(), {})
    with pytest.raises(module.VerificationRejected):
        await gate.verify(mission=mission, verifier_name="missing",
                          verifier_identity="reviewer")


@pytest.mark.asyncio
async def test_passed_verification_completes(monkeypatch):
    calls = []
    mission = {"owner_id": "o", "mission_id": "m", "status": "verifying",
               "lease_token": "t", "worker_id": "worker",
               "checkpoint": {"result": "done"}}
    async def check(_):
        return True
    async def change(_, **kwargs):
        calls.append(kwargs)
    monkeypatch.setattr(module, "transition", change)
    gate = module.GuardianVerifier(object(), {"check": check})
    evidence = await gate.verify(mission=mission, verifier_name="check",
                                 verifier_identity="reviewer")
    assert evidence["passed"] is True
    assert evidence["result_digest"] == module.canonical_digest(mission["checkpoint"])
    assert calls[0]["target"] == "completed"
    assert calls[0]["evidence"] == evidence


@pytest.mark.asyncio
async def test_failed_verification_blocks(monkeypatch):
    calls = []
    mission = {"owner_id": "o", "mission_id": "m", "status": "verifying",
               "lease_token": "t", "worker_id": "worker"}
    async def check(_):
        return False
    async def change(_, **kwargs):
        calls.append(kwargs)
    monkeypatch.setattr(module, "transition", change)
    gate = module.GuardianVerifier(object(), {"check": check})
    evidence = await gate.verify(mission=mission, verifier_name="check",
                                 verifier_identity="reviewer")
    assert evidence["passed"] is False
    assert calls[0]["target"] == "blocked"


@pytest.mark.asyncio
async def test_rejects_non_boolean_verdict():
    mission = {"owner_id": "o", "mission_id": "m", "status": "verifying",
               "lease_token": "t", "worker_id": "worker"}
    async def check(_):
        return {"passed": True}
    gate = module.GuardianVerifier(object(), {"check": check})
    with pytest.raises(module.VerificationRejected):
        await gate.verify(mission=mission, verifier_name="check",
                          verifier_identity="reviewer")


def test_digest_is_stable_for_key_order():
    assert module.canonical_digest({"a": 1, "b": 2}) == module.canonical_digest({"b": 2, "a": 1})
