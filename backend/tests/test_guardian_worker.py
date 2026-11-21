"""Focused tests for the opt-in Guardian worker.

These tests use a fake collection and monkeypatch the mission primitives so
no MongoDB instance, API credentials or external tools are required.
"""
import asyncio
import pytest
import guardian_worker as module


@pytest.mark.asyncio
async def test_no_queued_mission_does_not_run(monkeypatch):
    calls = []
    async def recover(_):
        calls.append("recover")
    async def claim(_, **kwargs):
        calls.append("claim")
        return None
    monkeypatch.setattr(module, "recover_expired_leases", recover)
    monkeypatch.setattr(module, "claim_mission", claim)
    worker = module.GuardianWorker(object(), {}, "worker-test")
    assert await worker.run_once() is False
    assert calls == ["recover", "claim"]


@pytest.mark.asyncio
async def test_unregistered_handler_blocks_without_execution(monkeypatch):
    transitions = []
    mission = {"owner_id": "owner", "mission_id": "m1",
               "lease_token": "token", "handler": "unknown"}
    async def recover(_):
        pass
    async def claim(_, **kwargs):
        return mission
    async def change(_, **kwargs):
        transitions.append((kwargs["expected"], kwargs["target"]))
    monkeypatch.setattr(module, "recover_expired_leases", recover)
    monkeypatch.setattr(module, "claim_mission", claim)
    monkeypatch.setattr(module, "transition", change)
    worker = module.GuardianWorker(object(), {}, "worker-test")
    assert await worker.run_once() is True
    assert transitions == [("leased", "running"), ("running", "blocked")]


@pytest.mark.asyncio
async def test_missing_approval_never_invokes_handler(monkeypatch):
    invoked = []
    transitions = []
    mission = {"owner_id": "owner", "mission_id": "m1",
               "lease_token": "token", "handler": "safe",
               "approved": False, "granted_scopes": ["safe"]}
    async def recover(_):
        pass
    async def claim(_, **kwargs):
        return mission
    async def change(_, **kwargs):
        transitions.append(kwargs["target"])
    async def handler(_):
        invoked.append(True)
    monkeypatch.setattr(module, "recover_expired_leases", recover)
    monkeypatch.setattr(module, "claim_mission", claim)
    monkeypatch.setattr(module, "transition", change)
    worker = module.GuardianWorker(object(), {"safe": handler}, "worker-test")
    assert await worker.run_once() is True
    assert invoked == []
    assert transitions == ["running", "awaiting_approval"]


@pytest.mark.asyncio
@pytest.mark.parametrize("outcome", ["success", "handler_failure", "lease_loss"])
async def test_execution_requires_lease_and_separate_verification(monkeypatch, outcome):
    transitions = []
    executing = asyncio.Event()
    cancelled = asyncio.Event()
    mission = {"owner_id": "owner", "mission_id": "m1",
               "lease_token": "token", "handler": "safe",
               "approved": True, "granted_scopes": ["safe"],
               "estimated_cost_cad": 0, "budget_cad": 0}
    async def recover(_):
        pass
    async def claim(_, **kwargs):
        return mission
    async def change(_, **kwargs):
        transitions.append(kwargs["target"])
    async def handler(_):
        if outcome == "handler_failure":
            raise RuntimeError("provider result unknown")
        if outcome == "lease_loss":
            executing.set()
            try:
                await asyncio.Future()
            finally:
                cancelled.set()
        return {"output": "test"}
    monkeypatch.setattr(module, "recover_expired_leases", recover)
    monkeypatch.setattr(module, "claim_mission", claim)
    monkeypatch.setattr(module, "transition", change)
    worker = module.GuardianWorker(object(), {"safe": handler}, "worker-test")
    if outcome == "lease_loss":
        async def lose_lease(*_):
            await executing.wait()
            raise RuntimeError("lease lost")
        monkeypatch.setattr(worker, "_heartbeat", lose_lease)
        with pytest.raises(RuntimeError, match="lease lost"):
            await worker.run_once()
        assert cancelled.is_set()
        assert transitions == ["running"]
        return
    assert await worker.run_once() is True
    assert transitions == ["running", "verifying" if outcome == "success" else "blocked"]


@pytest.mark.asyncio
async def test_serve_rejects_invalid_poll_interval():
    worker = module.GuardianWorker(object(), {}, "worker-test")
    with pytest.raises(ValueError):
        await worker.serve(asyncio.Event(), poll_seconds=0)
