"""Exercise the public API, worker, verifier and receipt on real MongoDB."""
import asyncio
from datetime import timedelta
import os
from uuid import uuid4

from fastapi import FastAPI, Header
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
import pytest

from guardian_mission_engine import ensure_indexes, now_utc
from guardian_mission_preview import PREVIEW_HANDLER, execute_preview
from guardian_mission_routes import build_guardian_mission_router
from guardian_preview_service import verify_pending
from guardian_worker import GuardianWorker


@pytest.mark.asyncio
async def test_preview_is_scheduled_verified_and_acknowledged_once():
    url = os.environ.get("GUARDIAN_TEST_MONGO_URL")
    if not url:
        pytest.skip("Guardian integration MongoDB is unavailable")
    name = f"guardian_preview_test_{uuid4().hex}"
    api_client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    worker_client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    verifier_client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    db = api_client[name]
    missions = db.guardian_missions

    async def account(x_owner: str = Header(default="alice")):
        return {"user_id": x_owner}

    app = FastAPI()
    app.include_router(build_guardian_mission_router(
        db=db, require_account_user=account, preview_enabled=True,
    ), prefix="/api")
    base = "/api/guardian/missions"
    try:
        await ensure_indexes(missions)
        await missions.insert_one({
            "mission_id": "other-handler", "owner_id": "alice", "idempotency_key": "other-handler",
            "status": "queued", "created_at": now_utc(), "lease_until": None,
            "handler": "other",
        })
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
            proposed = await http.post(base, json={
                "objective": "Preview objective", "success_criteria": "Verify preview result",
                "idempotency_key": "preview-demo", "budget_cad": 0,
                "expires_at": (now_utc() + timedelta(hours=1)).isoformat(),
            })
            assert proposed.status_code == 201
            path = f"{base}/{proposed.json()['mission_id']}"
            review = (await http.get(path)).json()
            assert "queue-preview" in review["available_actions"]
            digest = review["preview_digest"]
            queue = path + "/queue-preview"
            ack = path + "/acknowledge-preview"
            assert (await http.post(ack)).status_code == 409
            assert (await http.post(queue, json={"proposal_digest": "0" * 64})).status_code == 409
            assert (await http.post(queue, json={"proposal_digest": digest},
                                    headers={"x-owner": "bob"})).status_code == 404
            too_late = await http.post(queue, json={
                "proposal_digest": digest, "run_at": (now_utc() + timedelta(hours=2)).isoformat(),
            })
            assert too_late.status_code == 409
            run_at = (now_utc() + timedelta(minutes=1)).isoformat()
            payload = {"proposal_digest": digest, "run_at": run_at}
            results = await asyncio.gather(*(http.post(queue, json=payload) for _ in range(2)))
            assert [result.status_code for result in results] == [200, 200]
            assert results[0].json() == results[1].json()
            assert (await http.post(queue, json={"proposal_digest": digest})).status_code == 409
            worker = GuardianWorker(worker_client[name].guardian_missions,
                                    {PREVIEW_HANDLER: execute_preview}, "worker", scoped=True)
            assert await worker.run_once() is False
            await missions.update_one({"mission_id": review["mission_id"]},
                                      {"$set": {"not_before": now_utc() - timedelta(seconds=1)}})
            assert await worker.run_once() is True
            awaiting = (await http.get(path)).json()
            assert awaiting["status"] == "verifying"
            assert "checkpoint" not in awaiting
            verifier_missions = verifier_client[name].guardian_missions
            assert await verify_pending(verifier_missions, "verifier") == 1
            assert await verify_pending(verifier_missions, "verifier") == 0
            completed = (await http.get(path)).json()
            assert completed["status"] == "completed"
            assert completed["evidence"]["passed"] is True
            assert completed["attempts"] == 1
            assert "acknowledge-preview" in completed["available_actions"]
            assert (await http.post(ack, headers={"x-owner": "bob"})).status_code == 404
            receipts = await asyncio.gather(*(http.post(ack) for _ in range(2)))
            assert [receipt.status_code for receipt in receipts] == [200, 200]
            assert receipts[0].json() == receipts[1].json()
            assert "acknowledge-preview" not in (await http.get(path)).json()["available_actions"]
            assert (await missions.find_one({"mission_id": "other-handler"}))["status"] == "queued"
    finally:
        worker_client.close()
        verifier_client.close()
        try:
            await api_client.drop_database(name)
        finally:
            api_client.close()
