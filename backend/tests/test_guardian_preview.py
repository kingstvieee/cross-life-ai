"""Checks the local-only Guardian preview contract and supervised service."""
import asyncio
from datetime import datetime, timezone

import pytest

from guardian_mission_engine import MissionConflict
from guardian_mission_preview import execute_preview, preview_digest, verify_preview
from guardian_preview_service import configuration, serve


@pytest.mark.asyncio
async def test_preview_proof_binds_to_saved_proposal():
    mission = {
        "mission_id": "example", "objective": "Preview", "success_criteria": "Read back",
        "expires_at": datetime(2099, 1, 1, tzinfo=timezone.utc),
        "budget_cad": 0, "estimated_cost_cad": 0,
    }
    digest = preview_digest(mission)
    mission["expires_at"] = mission["expires_at"].replace(tzinfo=None)
    assert preview_digest(mission) == digest
    mission["preview_approval"] = {"digest": digest}
    result = await execute_preview(mission)
    mission["checkpoint"] = {"result": result}
    assert await verify_preview(mission) is True
    result["objective"] = "Changed result"
    assert await verify_preview(mission) is False
    mission["objective"] = "Changed proposal"
    with pytest.raises(MissionConflict):
        await execute_preview(mission)


def test_service_is_disabled_by_default_and_bounds_polling(monkeypatch):
    monkeypatch.delenv("GUARDIAN_PREVIEW_ENABLED", raising=False)
    with pytest.raises(RuntimeError, match="disabled"):
        configuration()
    monkeypatch.setenv("GUARDIAN_PREVIEW_ENABLED", "true")
    monkeypatch.delenv("MONGO_URL", raising=False)
    with pytest.raises(RuntimeError, match="required"):
        configuration()
    monkeypatch.setenv("MONGO_URL", "mongodb://localhost")
    monkeypatch.setenv("DB_NAME", "test")
    monkeypatch.setenv("GUARDIAN_PREVIEW_POLL_SECONDS", "nan")
    with pytest.raises(ValueError, match="polling interval"):
        configuration()
    monkeypatch.setenv("GUARDIAN_PREVIEW_POLL_SECONDS", "2")
    assert configuration() == ("mongodb://localhost", "test", 2)


@pytest.mark.asyncio
async def test_supervised_loop_recovers_next_tick_and_stops():
    stop = asyncio.Event()
    attempts = 0

    async def tick():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("temporary")
        stop.set()
        return 1

    await asyncio.wait_for(serve(tick, stop, 0.01), timeout=1)
    assert attempts == 2
