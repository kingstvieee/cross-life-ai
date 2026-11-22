"""Real MongoDB checks for atomic notices, retries, and inbox integrity."""
import asyncio
from datetime import timedelta
import json
import logging
import os
import sys
from types import SimpleNamespace
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import ValidationError
from pymongo.errors import AutoReconnect, OperationFailure
from pymongo.uri_parser import parse_uri
import pytest
import pytest_asyncio

from guardian_mission_engine import MissionStateChanged, now_utc, recover_expired_leases, transition
from guardian_mission_preview import PREVIEW_HANDLER
from guardian_mission_routes import build_guardian_mission_router
from guardian_notice_routes import build_guardian_notice_router
from guardian_notice_relay import configuration as relay_configuration, relay_pending
from guardian_notice_permissions import role_definitions
from guardian_notice_service import configuration, pending_metrics, scan_pending
from guardian_notice_store import (
    NoticeEvent, NoticeIntegrityError, ensure_dispatch_index, ensure_inbox_index, ensure_outbox_index, notice_readiness,
    upsert_dispatch_entry,
    upsert_inbox_entry,
)


def notice_fixture():
    return {"version": 1, "event_id": "event", "mission_id": "m1", "owner_id": "owner",
            "kind": "result_ready", "reason": "independent_verification_passed", "created_at": now_utc()}


def test_notice_contract_and_separate_service_configuration(monkeypatch):
    event = notice_fixture()
    assert NoticeEvent.model_validate(event).model_dump().keys() == event.keys()
    for fields in ({"version": 2}, {"version": True}, {"checkpoint": "private"},
                   {"objective": "private"}, {"credential": "private"}, {"kind": "needs_review"}):
        with pytest.raises(ValidationError):
            NoticeEvent.model_validate({**event, **fields})
    monkeypatch.setenv("GUARDIAN_NOTICE_ENABLED", "true")
    monkeypatch.setenv("DB_NAME", "staging")
    monkeypatch.setenv("MONGO_URL", "mongodb://shared")
    monkeypatch.delenv("GUARDIAN_NOTICE_MONGO_URL", raising=False)
    with pytest.raises(RuntimeError, match="Dedicated"):
        configuration()
    monkeypatch.setenv("GUARDIAN_NOTICE_MONGO_URL", "mongodb://notices")
    assert configuration() == ("mongodb://notices", "staging")
    monkeypatch.delenv("GUARDIAN_NOTICE_RELAY_ENABLED", raising=False)
    with pytest.raises(RuntimeError, match="disabled"):
        relay_configuration()
    monkeypatch.setenv("GUARDIAN_NOTICE_RELAY_ENABLED", "true")
    monkeypatch.delenv("GUARDIAN_NOTICE_RELAY_MONGO_URL", raising=False)
    with pytest.raises(RuntimeError, match="Dedicated relay"):
        relay_configuration()
    monkeypatch.setenv("GUARDIAN_NOTICE_RELAY_MONGO_URL", "mongodb://relay")
    assert relay_configuration() == ("mongodb://relay", "staging")


@pytest_asyncio.fixture
async def database():
    url = os.environ.get("GUARDIAN_TEST_MONGO_URL")
    if not url:
        pytest.skip("Guardian integration MongoDB is unavailable")
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    db = client[f"guardian_notice_test_{uuid4().hex}"]
    try:
        await ensure_outbox_index(db.missions)
        await ensure_inbox_index(db.inbox)
        await ensure_dispatch_index(db.dispatch)
        yield db
    finally:
        try:
            await client.drop_database(db.name)
        finally:
            client.close()


@pytest.mark.asyncio
async def test_notice_survives_interruption_and_never_duplicates(database):
    missions, inbox = database.missions, database.inbox
    at = now_utc()
    await missions.insert_many([
        {"owner_id": "alice", "mission_id": "m1", "status": "verifying", "attempts": 2,
         "lease_until": at + timedelta(minutes=1), "lease_token": "secret"},
        {"owner_id": "alice", "mission_id": "review", "status": "running", "attempts": 3,
         "lease_until": at - timedelta(seconds=1), "checkpoint": {"private": "secret"}},
        {"owner_id": "alice", "mission_id": "no-notice", "status": "proposed"},
    ])
    args = {"owner_id": "alice", "mission_id": "m1", "expected": "verifying", "target": "completed",
            "evidence": {"verifier": "independent", "passed": True}, "lease_token": "secret"}
    completed = await transition(missions, **args)
    with pytest.raises(MissionStateChanged):
        await transition(missions, **args)
    await transition(missions, owner_id="alice", mission_id="no-notice", expected="proposed", target="cancelled")
    assert (await recover_expired_leases(missions))["quarantined"] == 1
    assert (await recover_expired_leases(missions))["quarantined"] == 0
    assert await missions.count_documents({"notice_outbox.next_attempt_at": {"$exists": True}}) == 2
    assert await inbox.count_documents({}) == 0
    event = NoticeEvent.model_validate(completed["notice_outbox"]["event"])
    assert event.event_id == "5:alice2:m1:result_ready:2"
    assert "secret" not in str(completed["notice_outbox"])
    await asyncio.gather(*(upsert_inbox_entry(inbox, event) for _ in range(5)))
    # A consumer may die after writing the inbox and before completion. A later scan must reuse the entry.
    assert await inbox.count_documents({}) == 1
    assert await relay_pending(missions, database.dispatch) == 2
    assert await relay_pending(missions, database.dispatch) == 0
    assert await scan_pending(database.dispatch, inbox) == 2
    assert await scan_pending(database.dispatch, inbox) == 0
    assert await inbox.count_documents({}) == 2
    entries = await inbox.find().to_list(length=2)
    assert {item["event"]["kind"] for item in entries} == {"result_ready", "needs_review"}
    assert len({item["event_id"] for item in entries}) == 2
    with pytest.raises(NoticeIntegrityError):
        await upsert_inbox_entry(inbox, event.model_copy(update={"mission_id": "forged"}))


@pytest.mark.asyncio
async def test_scan_claims_only_one_limited_batch(database):
    due = now_utc() - timedelta(seconds=1)
    await database.dispatch.insert_many([
        {"event": {**notice_fixture(), "event_id": f"event-{index:03}"},
         "delivery": {"next_attempt_at": due}}
        for index in range(101)
    ])
    assert await scan_pending(database.dispatch, database.inbox) == 100
    assert await database.inbox.count_documents({}) == 100
    assert await scan_pending(database.dispatch, database.inbox) == 1


@pytest.mark.asyncio
async def test_relay_restart_and_concurrent_publish_preserve_delivery_state(database, monkeypatch):
    import guardian_notice_relay as relay

    at = now_utc()
    event = NoticeEvent.model_validate(notice_fixture())
    await database.missions.insert_many([
        {"status": "completed", "owner_id": event.owner_id, "mission_id": event.mission_id,
         "notice_outbox": {"event": event.model_dump(), "next_attempt_at": at}},
        {"status": "blocked", "owner_id": event.owner_id, "mission_id": event.mission_id,
         "notice_outbox": {
            "event": {**event.model_dump(), "version": 2}, "next_attempt_at": at,
        }},
        {"status": "completed", "owner_id": "someone-else", "mission_id": event.mission_id,
         "notice_outbox": {"event": {**event.model_dump(), "event_id": "foreign"}, "next_attempt_at": at}},
    ])

    async def interrupt(dispatch, value):
        await upsert_dispatch_entry(dispatch, value)
        raise AutoReconnect("Relay stopped before recording handoff")

    with monkeypatch.context() as patch:
        patch.setattr(relay, "upsert_dispatch_entry", interrupt)
        with pytest.raises(AutoReconnect):
            await relay_pending(database.missions, database.dispatch)
    assert await database.dispatch.count_documents({}) == 1
    assert await scan_pending(database.dispatch, database.inbox) == 1
    completed = await database.dispatch.find_one({})
    assert sum(await asyncio.gather(*(relay_pending(database.missions, database.dispatch) for _ in range(3)))) == 1
    assert await database.dispatch.find_one({}) == completed
    assert await scan_pending(database.dispatch, database.inbox) == 0
    assert await database.inbox.count_documents({}) == 1
    assert await database.missions.count_documents({"notice_outbox.relayed_at": {"$exists": True}}) == 1
    assert await database.missions.count_documents({"notice_outbox.quarantine_reason": "invalid_notice"}) == 2


@pytest.mark.asyncio
async def test_relay_batch_limit_and_legacy_outbox_cutover(database, monkeypatch):
    import guardian_notice_relay as relay

    now = now_utc().replace(microsecond=0)
    monkeypatch.setattr(relay, "now_utc", lambda: now)
    payload = notice_fixture()
    await database.missions.insert_many([
        {"owner_id": payload["owner_id"], "mission_id": payload["mission_id"],
         "notice_outbox": {"event": {**payload, "event_id": f"event-{i:03}"},
                           "next_attempt_at": now - timedelta(seconds=1)}}
        for i in range(101)
    ])
    await database.missions.insert_many([
        {"owner_id": payload["owner_id"], "mission_id": payload["mission_id"],
         "notice_outbox": {"event": {**payload, "event_id": "old-delivered"}, "processed_at": now}},
        {"owner_id": payload["owner_id"], "mission_id": payload["mission_id"],
         "notice_outbox": {"event": {**payload, "event_id": "old-claimed"},
                           "next_attempt_at": now + timedelta(seconds=60), "claim_token": "legacy"}},
    ])
    assert await relay_pending(database.missions, database.dispatch) == 100
    assert await relay_pending(database.missions, database.dispatch) == 1
    assert await relay_pending(database.missions, database.dispatch) == 0
    assert await database.dispatch.count_documents({"event.event_id": "old-delivered"}) == 0
    now += timedelta(seconds=60)
    assert await relay_pending(database.missions, database.dispatch) == 1
    legacy = await database.missions.find_one({"notice_outbox.event.event_id": "old-claimed"})
    assert "claim_token" not in legacy["notice_outbox"]


@pytest.mark.asyncio
async def test_collection_roles_enforce_notice_boundary(database):
    if os.environ.get("GUARDIAN_TEST_MONGO_AUTH") != "true":
        pytest.skip("Requires a disposable authenticated MongoDB server")
    await database.create_collection("guardian_missions")
    await database.create_collection("guardian_notice_dispatch")
    await database.create_collection("guardian_inbox")
    await database.create_collection("guardian_notice_relay_health")
    await database.create_collection("guardian_notice_consumer_health")
    for role in role_definitions(database.name):
        await database.command(role)
    hosts = parse_uri(os.environ["GUARDIAN_TEST_MONGO_URL"])["nodelist"]
    host = [f"{name}:{port}" for name, port in hosts]
    connections = []

    async def connect(role):
        username, password = uuid4().hex, uuid4().hex
        await database.command("createUser", username, pwd=password, roles=[role])
        client = AsyncIOMotorClient(host, username=username, password=password, authSource=database.name,
                                    serverSelectionTimeoutMS=5000)
        connections.append(client)
        return client[database.name]

    try:
        relay = await connect("guardianNoticeRelay")
        consumer = await connect("guardianNoticeConsumer")
        missions = database.guardian_missions
        await missions.insert_one({"mission_id": "m1", "status": "verifying", "owner_id": "owner",
                                   "lease_token": "private", "lease_until": now_utc() + timedelta(minutes=1)})
        await transition(missions, owner_id="owner", mission_id="m1", expected="verifying", target="completed",
                         lease_token="private", evidence={"verifier": "independent", "passed": True})
        await ensure_outbox_index(relay.guardian_missions)
        await ensure_dispatch_index(relay.guardian_notice_dispatch)
        await ensure_dispatch_index(consumer.guardian_notice_dispatch)
        await ensure_inbox_index(consumer.guardian_inbox)
        assert await relay_pending(relay.guardian_missions, relay.guardian_notice_dispatch) == 1
        assert await scan_pending(consumer.guardian_notice_dispatch, consumer.guardian_inbox) == 1
        await consumer.guardian_notice_consumer_health.update_one(
            {"_id": "notice_consumer"}, {"$set": {"last_poll_at": now_utc()}}, upsert=True)
        await relay.guardian_notice_relay_health.update_one(
            {"_id": "notice_relay"}, {"$set": {"last_poll_at": now_utc()}}, upsert=True)
        assert (await notice_readiness(database.guardian_notice_consumer_health,
                                       database.guardian_notice_relay_health))["ready"]
        with pytest.raises(OperationFailure) as denied:
            await consumer.guardian_missions.update_one({"mission_id": "m1"}, {"$set": {"status": "blocked"}})
        assert denied.value.code == 13
        with pytest.raises(OperationFailure) as denied:
            await consumer.guardian_missions.find_one({"mission_id": "m1"})
        assert denied.value.code == 13
        with pytest.raises(OperationFailure) as denied:
            await consumer.guardian_notice_dispatch.insert_one({"event": notice_fixture()})
        assert denied.value.code == 13
        with pytest.raises(OperationFailure) as denied:
            await relay.guardian_inbox.update_one({}, {"$set": {"read_at": now_utc()}})
        assert denied.value.code == 13
        with pytest.raises(OperationFailure) as denied:
            await consumer.guardian_notice_relay_health.update_one({}, {"$set": {"last_poll_at": now_utc()}})
        assert denied.value.code == 13
        with pytest.raises(OperationFailure) as denied:
            await consumer.guardian_service_health.update_one({}, {"$set": {"last_poll_at": now_utc()}})
        assert denied.value.code == 13
        assert (await missions.find_one({"mission_id": "m1"}))["status"] == "completed"
        assert await database.guardian_inbox.count_documents({}) == 1
    finally:
        for client in connections:
            client.close()


@pytest.mark.asyncio
async def test_owner_inbox_paging_read_and_mission_link(database, caplog):
    app = FastAPI()
    db = SimpleNamespace(guardian_inbox=database.inbox, guardian_missions=database.missions,
                         guardian_notice_consumer_health=database.consumer_health,
                         guardian_notice_relay_health=database.relay_health)
    caplog.set_level(logging.INFO, logger="guardian.notice_receipts")

    async def account(x_owner: str | None = Header(None)):
        if not x_owner:
            raise HTTPException(status_code=401)
        return {"user_id": x_owner}

    app.include_router(build_guardian_notice_router(db=db, require_account_user=account))
    app.include_router(build_guardian_mission_router(db=db, require_account_user=account, preview_enabled=True))
    base = "/guardian/notices"
    alice, bob = {"x-owner": "alice"}, {"x-owner": "bob"}
    fixture = notice_fixture()
    for owner, ids in [("alice", ("a1", "a2", "a3")), ("bob", ("b1",))]:
        for event_id in ids:
            await upsert_inbox_entry(database.inbox, NoticeEvent.model_validate({
                **fixture, "event_id": event_id, "owner_id": owner,
            }))
    await database.missions.insert_one({
        "owner_id": "alice", "mission_id": "m1", "handler": PREVIEW_HANDLER, "status": "completed",
        "evidence": {"passed": True}, "preview_approval": {"approved_at": now_utc()},
    })
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
        assert (await http.get(base)).status_code == 401
        assert (await http.get(base + "/readiness")).status_code == 401
        readiness = (await http.get(base + "/readiness", headers=alice)).json()
        assert readiness == {"ready": False, "last_poll_at": None, "relay_last_poll_at": None}
        page = await http.get(base, params={"limit": 2}, headers=alice)
        assert page.status_code == 200 and "no-store" in page.headers["cache-control"]
        first = page.json()
        second = (await http.get(base, params={"after": first["next_cursor"]}, headers=alice)).json()
        records = first["notices"] + second["notices"]
        assert len(records) == len({x["notice_id"] for x in records}) == 3
        assert all(set(x) == {"notice_id", "kind", "label", "created_at", "read_at"} for x in records)
        assert {x["label"] for x in records} == {"Result ready"}
        assert (await http.get(base, params={"after": first["next_cursor"]}, headers=bob)).status_code == 404
        assert (await http.get(base + "/summary", headers=alice)).json() == {"unread": 3}
        assert (await http.get(base + "/summary", headers=bob)).json() == {"unread": 1}
        path = f"{base}/{records[0]['notice_id']}"
        assert (await http.post(path + "/read", headers=bob)).status_code == 404
        assert not [row for row in caplog.records if row.name == "guardian.notice_receipts"]
        assert (await http.get(path + "/mission", headers=bob)).status_code == 404
        assert (await http.get(path + "/mission", headers=alice)).json() == {"mission_id": "m1"}
        reads = await asyncio.gather(*(http.post(path + "/read", headers=alice) for _ in range(2)))
        assert all(r.status_code == 200 for r in reads) and reads[0].json() == reads[1].json()
        receipts = [row for row in caplog.records if row.name == "guardian.notice_receipts"]
        assert len(receipts) == 1
        assert json.loads(receipts[0].args[0])["read_at"] == reads[0].json()["read_at"]
        saved = await database.inbox.find_one({"notice_id": records[0]["notice_id"]})
        assert saved["expires_at"] - saved["read_at"] == timedelta(days=30)
        assert await database.inbox.count_documents({"read_at": None, "expires_at": {"$exists": True}}) == 0
        indexes = await database.inbox.index_information()
        assert indexes["expires_at_1"]["expireAfterSeconds"] == 0
        assert (await http.get(base + "/summary", headers=alice)).json() == {"unread": 2}
        assert len((await http.get(base, params={"unread": "true"}, headers=alice)).json()["notices"]) == 2
        assert len((await http.get(base, headers=alice)).json()["notices"]) == 3
        assert (await database.missions.find_one({"owner_id": "alice"})).get("preview_acknowledged_at") is None
        assert (await http.post("/guardian/missions/m1/acknowledge-preview", headers=alice)).status_code == 200
        await database.missions.delete_one({"owner_id": "alice"})
        await database.missions.insert_one({"owner_id": "bob", "mission_id": "m1"})
        assert (await http.get(path + "/mission", headers=alice)).json() == {"detail": "notice_mission_unavailable"}


@pytest.mark.asyncio
async def test_notice_retry_window_metrics_and_invalid_event_isolation(database, monkeypatch):
    import guardian_notice_service as service

    current = now_utc().replace(microsecond=0)
    monkeypatch.setattr(service, "now_utc", lambda: current)
    monkeypatch.setattr(service, "uniform", lambda _low, _high: 0)
    event = {**notice_fixture(), "created_at": current - timedelta(seconds=20)}
    await database.dispatch.insert_many([
        {"event": {**event, "version": 2, "event_id": "bad"},
         "delivery": {"next_attempt_at": current - timedelta(seconds=1)}},
        {"event": event, "delivery": {"next_attempt_at": current}},
    ])
    counts = await pending_metrics(database.dispatch)
    assert counts == {"depth": 2, "oldest_age_seconds": 20}
    calls = 0

    async def fail_twice(inbox, value):
        nonlocal calls
        calls += 1
        if calls <= 2:
            raise AutoReconnect("temporary error")
        await upsert_inbox_entry(inbox, value)

    monkeypatch.setattr(service, "upsert_inbox_entry", fail_twice)
    assert await scan_pending(database.dispatch, database.inbox) == 0
    bad = await database.dispatch.find_one({"event.event_id": "bad"})
    assert bad["delivery"]["quarantine_reason"] == "invalid_notice"
    assert "next_attempt_at" not in bad["delivery"]
    assert await scan_pending(database.dispatch, database.inbox) == 0 and calls == 1
    current += timedelta(seconds=5)
    assert await scan_pending(database.dispatch, database.inbox) == 0 and calls == 2
    current += timedelta(seconds=9)
    assert await scan_pending(database.dispatch, database.inbox) == 0 and calls == 2
    current += timedelta(seconds=1)
    assert await scan_pending(database.dispatch, database.inbox) == 1 and calls == 3
    assert await pending_metrics(database.dispatch) == {"depth": 0, "oldest_age_seconds": 0}
    assert not (await notice_readiness(database.consumer_health, database.relay_health))["ready"]
    await database.consumer_health.insert_one({"_id": "notice_consumer", "last_poll_at": now_utc()})
    assert not (await notice_readiness(database.consumer_health, database.relay_health))["ready"]
    await database.relay_health.insert_one({"_id": "notice_relay", "last_poll_at": now_utc()})
    assert (await notice_readiness(database.consumer_health, database.relay_health))["ready"]
    await database.relay_health.update_one({"_id": "notice_relay"},
                                          {"$set": {"last_poll_at": now_utc() - timedelta(seconds=30)}})
    assert not (await notice_readiness(database.consumer_health, database.relay_health))["ready"]


@pytest.mark.asyncio
async def test_expired_notice_claim_cannot_complete_after_recovery(database, monkeypatch):
    import guardian_notice_service as service

    current = now_utc().replace(microsecond=0)
    monkeypatch.setattr(service, "now_utc", lambda: current)
    event = notice_fixture()
    await database.dispatch.insert_one({"event": event, "delivery": {"next_attempt_at": current}})
    first_write = asyncio.Event()
    finish_first = asyncio.Event()
    first = True

    async def pause_after_inbox_write(inbox, value):
        nonlocal first
        await upsert_inbox_entry(inbox, value)
        if first:
            first = False
            first_write.set()
            await finish_first.wait()

    monkeypatch.setattr(service, "upsert_inbox_entry", pause_after_inbox_write)
    worker = asyncio.create_task(scan_pending(database.dispatch, database.inbox, limit=1))
    try:
        await asyncio.wait_for(first_write.wait(), timeout=2)
        current += timedelta(seconds=61)
        assert await scan_pending(database.dispatch, database.inbox, limit=1) == 1
    finally:
        finish_first.set()
        result = await worker
    assert result == 0
    assert await database.inbox.count_documents({}) == 1
    saved = await database.dispatch.find_one({})
    assert saved["delivery"]["attempts"] == 2


@pytest.mark.asyncio
async def test_real_preview_processes_create_one_notice_after_worker_restart(database):
    env = {**os.environ, "DB_NAME": database.name,
           "MONGO_URL": os.environ["GUARDIAN_TEST_MONGO_URL"],
           "GUARDIAN_NOTICE_MONGO_URL": os.environ["GUARDIAN_TEST_MONGO_URL"],
           "GUARDIAN_NOTICE_RELAY_MONGO_URL": os.environ["GUARDIAN_TEST_MONGO_URL"],
           "GUARDIAN_NOTICE_RELAY_ENABLED": "true",
           "GUARDIAN_PREVIEW_ENABLED": "true", "GUARDIAN_NOTICE_ENABLED": "true",
           "GUARDIAN_PREVIEW_POLL_SECONDS": "0.1"}
    from guardian_mission_engine import submit_mission
    from guardian_mission_preview import preview_digest, queue_preview

    processes = []

    async def start(*module):
        process = await asyncio.create_subprocess_exec(sys.executable, "-m", *module, env=env,
                                                       stdout=asyncio.subprocess.DEVNULL,
                                                       stderr=asyncio.subprocess.DEVNULL)
        processes.append(process)
        return process

    async def observe_process(role):
        async with asyncio.timeout(10):
            while True:
                row = await database.guardian_service_health.find_one({"role": role}, sort=[("last_poll_at", -1)])
                if row is not None:
                    return row
                await asyncio.sleep(0.1)

    try:
        missions = database.guardian_missions
        mission = await submit_mission(missions, owner_id="owner", idempotency_key="stage-probe",
                                       objective="Preview a local result", success_criteria="Digest matches")
        await queue_preview(missions, owner_id="owner", mission_id=mission["mission_id"],
                            digest=preview_digest(mission), run_at=now_utc() + timedelta(seconds=60))
        first_worker = await start("guardian_preview_service", "worker")
        first_health = await observe_process("worker")
        assert first_worker.returncode is None
        first_worker.terminate()
        await asyncio.wait_for(first_worker.wait(), timeout=5)
        await start("guardian_preview_service", "worker")
        await start("guardian_preview_service", "verifier")
        await start("guardian_notice_relay")
        await start("guardian_notice_service")
        await missions.update_one({"mission_id": mission["mission_id"]}, {"$set": {"not_before": now_utc()}})
        async with asyncio.timeout(15):
            while not await database.guardian_inbox.count_documents({"owner_id": "owner"}):
                assert all(p.returncode is None for p in processes[1:])
                await asyncio.sleep(0.1)
        saved = await missions.find_one({"mission_id": mission["mission_id"]})
        assert saved["status"] == "completed"
        assert saved["attempts"] == 1
        assert saved["evidence"]["verifier_identity"].startswith("preview-verifier-")
        current_health = await observe_process("worker")
        assert current_health["_id"] != first_health["_id"]
        assert (await observe_process("verifier"))["_id"] == saved["evidence"]["verifier_identity"]
        assert await database.guardian_inbox.count_documents({"owner_id": "owner"}) == 1
    finally:
        for process in processes:
            if process.returncode is None:
                process.terminate()
        await asyncio.gather(*(asyncio.wait_for(p.wait(), timeout=5) for p in processes))
