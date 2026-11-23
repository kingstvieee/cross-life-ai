"""Exercise the staging recorder and artifact sealing without a live deployment."""
import asyncio
from datetime import datetime, timedelta, timezone
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure
from pymongo.uri_parser import parse_uri
from pydantic import ValidationError
import pytest

from guardian_notice_store import record_notice_poll
from guardian_staging_capture import append_frame, assemble_services, load_journal, seal_bundle
from guardian_staging_evidence import review_bundle
from guardian_staging_sampler import (
    HEALTH_COLLECTIONS, ROLES, PollFrame, api_poll, api_probe_url, capture_frame, sampler_role, sampling_config,
)
from tests.test_guardian_staging_evidence import COMMIT, RUN, write_bundle

NOW = datetime(2026, 11, 21, 12, tzinfo=timezone.utc)


def frame(*, timestamp=NOW, run_id=RUN, replacements=None):
    polls = {role: {"instance": role, "state": "ready"} for role in ROLES}
    polls.update(replacements or {})
    return PollFrame.model_validate({"observed_at": timestamp, "run_id": run_id, "polls": polls})


def test_journal_resumes_with_another_instance_and_preserves_the_previous_record(tmp_path):
    journal = tmp_path / "polls.jsonl"
    first = frame()
    append_frame(journal, first)
    second = frame(timestamp=NOW + timedelta(seconds=60),
                   replacements={"worker": {"instance": "worker-restart", "state": "ready"}})
    append_frame(journal, second)
    assert load_journal(journal) == [first, second]
    assert journal.stat().st_mode & 0o777 == 0o600
    original = journal.read_bytes()
    for invalid in [first, second.model_copy(update={"observed_at": NOW + timedelta(seconds=61), "run_id": "foreign"})]:
        with pytest.raises(ValueError):
            append_frame(journal, invalid)
    assert journal.read_bytes() == original


def test_journal_rejects_interrupted_writes_and_concurrent_locks(tmp_path):
    journal = tmp_path / "polls.jsonl"
    append_frame(journal, frame())
    with journal.open("rb") as locked:
        fcntl.flock(locked, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with pytest.raises(BlockingIOError):
            append_frame(journal, frame(timestamp=NOW + timedelta(seconds=60)))
    with journal.open("ab") as partial:
        partial.write(b'{"unfinished"')
    with pytest.raises(ValueError, match="interrupted"):
        append_frame(journal, frame(timestamp=NOW + timedelta(seconds=60)))
    with pytest.raises(ValueError, match="interrupted"):
        load_journal(journal)
    link = tmp_path / "link.jsonl"
    link.symlink_to(journal)
    with pytest.raises(OSError):
        append_frame(link, frame())
    with pytest.raises(ValidationError):
        frame(replacements={"relay": {"instance": None, "state": "ready"}})


def test_service_evidence_retains_known_failures_and_rejects_unknown_roles(tmp_path):
    journal, registry, output = (tmp_path / name for name in ("polls.jsonl", "registry.json", "services.json"))
    append_frame(journal, frame(replacements={"relay": {"instance": None, "state": "missing"},
                                             "verifier": {"instance": "verifier", "state": "unavailable"}}))
    rows = [{"role": role, "instance": role, "principal": f"principal-{role}",
             "commit": COMMIT, "config_version": "r1"} for role in ROLES]
    registry.write_text(json.dumps({"run_id": RUN, "instances": rows}))
    assemble_services(registry, journal, output)
    exported = json.loads(output.read_bytes())
    assert exported["run_id"] == RUN
    assert {row["instance"]: row["ready"] for row in exported["samples"]} == {
        "api": True, "worker": True, "verifier": False, "consumer": True,
    }
    with pytest.raises(FileExistsError):
        assemble_services(registry, journal, output)
    rows[0]["role"] = "worker"
    registry.write_text(json.dumps({"run_id": RUN, "instances": rows}))
    with pytest.raises(ValueError, match="different role"):
        assemble_services(registry, journal, tmp_path / "wrong.json")


def test_sealer_output_works_with_existing_validator_and_refuses_to_overwrite(tmp_path):
    existing = write_bundle(tmp_path)
    output = tmp_path / "sealed.json"
    metadata = {"run_id": RUN, "environment": "staging", "fixture_only": False,
                "build_commit": COMMIT, "device_build": "119"}
    seal_bundle(output, **metadata)
    assert review_bundle(output)["status"] == "ready_for_review"
    original = output.read_bytes()
    with pytest.raises(FileExistsError):
        seal_bundle(output, **metadata)
    assert output.read_bytes() == original and existing.exists()
    with pytest.raises(ValueError, match="Fixture"):
        seal_bundle(tmp_path / "fixture.json", **{**metadata, "fixture_only": True})
    with pytest.raises(ValueError, match="share the manifest run"):
        seal_bundle(tmp_path / "foreign.json", **{**metadata, "run_id": "foreign"})
    missing = tmp_path / "inbox.json"
    missing.unlink()
    with pytest.raises(OSError):
        seal_bundle(tmp_path / "incomplete.json", **metadata)
    assert not (tmp_path / "incomplete.json").exists()


def test_journal_size_and_export_frame_bounds(tmp_path, monkeypatch):
    import guardian_staging_capture as capture

    journal = tmp_path / "polls.jsonl"
    append_frame(journal, frame())
    original = journal.read_bytes()
    with monkeypatch.context() as patch:
        patch.setattr(capture, "MAX_JOURNAL_BYTES", len(original))
        with pytest.raises(ValueError, match="size limit"):
            append_frame(journal, frame(timestamp=NOW + timedelta(seconds=60)))
    assert journal.read_bytes() == original
    append_frame(journal, frame(timestamp=NOW + timedelta(seconds=60)))
    monkeypatch.setattr(capture, "MAX_JOURNAL_FRAMES", 1)
    with pytest.raises(ValueError, match="record limit"):
        load_journal(journal)


def test_local_seal_is_marked_fixture_and_confined(tmp_path):
    directory = tmp_path / "bundle"
    directory.mkdir()
    write_bundle(directory)
    manifest = directory / "fixture.json"
    metadata = {"run_id": RUN, "environment": "local", "fixture_only": True,
                "build_commit": COMMIT, "device_build": "119"}
    seal_bundle(manifest, **metadata)
    assert json.loads(manifest.read_bytes())["fixture_only"] is True
    assert review_bundle(manifest)["status"] == "failed"
    source = directory / "device.json"
    target = tmp_path / "device.json"
    source.rename(target)
    source.symlink_to(target)
    with pytest.raises(ValueError, match="leaves the bundle"):
        seal_bundle(directory / "escaped.json", **metadata)
    assert not (directory / "escaped.json").exists()


@pytest.mark.parametrize("origin", [
    "http://staging.example", "https://user:pass@staging.example", "https://stage.test/another",
    "https://stage.test?key=one", "https://stage.test#anchor", "ftp://stage.test", "https://stage\n.test",
])
def test_sampler_rejects_unsafe_probe_origins(origin):
    with pytest.raises(ValueError):
        api_probe_url(origin)


def test_sampler_configuration_has_no_general_database_fallback(monkeypatch):
    monkeypatch.delenv("GUARDIAN_STAGING_SAMPLE_ENABLED", raising=False)
    with pytest.raises(ValueError, match="disabled"):
        sampling_config()
    monkeypatch.setenv("GUARDIAN_STAGING_SAMPLE_ENABLED", "true")
    monkeypatch.setenv("MONGO_URL", "mongodb://another-db")
    monkeypatch.delenv("GUARDIAN_STAGING_SAMPLE_MONGO_URL", raising=False)
    with pytest.raises(ValueError, match="dedicated"):
        sampling_config()
    monkeypatch.setenv("GUARDIAN_STAGING_SAMPLE_MONGO_URL", "mongodb://readonly")
    monkeypatch.setenv("GUARDIAN_STAGING_SAMPLE_DB", "staging")
    monkeypatch.setenv("GUARDIAN_STAGING_API_ORIGIN", "https://stage.test/")
    assert sampling_config() == ("mongodb://readonly", "staging", "https://stage.test/api/")
    assert api_probe_url("http://127.0.0.1:1234") == "http://127.0.0.1:1234/api/"


@pytest.mark.asyncio
@pytest.mark.parametrize("status,body,expected", [
    (200, {"app": "STAAR Hub", "status": "online"}, "ready"),
    (200, {"app": "Other app", "status": "online"}, "unavailable"),
    (302, None, "unavailable"),
    (401, None, "unavailable"),
    (200, {"oversized": "x" * 5000}, "unavailable"),
])
async def test_probe_requires_expected_response_without_redirects(status, body, expected):
    calls = []

    def setup(request):
        calls.append(request)
        return httpx.Response(status, json=body, headers={"Location": "/unrelated"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(setup), follow_redirects=True) as client:
        poll = await api_poll(client, "https://stage.test/api/", "api-build")
        assert poll.state == expected
    assert len(calls) == 1 and calls[0].method == "GET"
    assert "authorization" not in calls[0].headers


@pytest.mark.asyncio
async def test_sampler_distinguishes_missing_stale_and_fresh_role_instances():
    now = datetime.now(timezone.utc)
    preview = SimpleNamespace(find_one=AsyncMock(side_effect=[
        {"_id": "worker-current", "last_poll_at": now},
        {"_id": "verifier-old", "last_poll_at": now - timedelta(seconds=31)},
    ]))
    relay = SimpleNamespace(find_one=AsyncMock(return_value={"instance": "relay-current", "last_poll_at": now}))
    consumer = SimpleNamespace(find_one=AsyncMock(return_value=None))
    db = SimpleNamespace(guardian_service_health=preview, guardian_notice_relay_health=relay,
                         guardian_notice_consumer_health=consumer)
    async with httpx.AsyncClient(transport=httpx.MockTransport(
        lambda _: httpx.Response(200, json={"app": "STAAR Hub", "status": "online"})
    )) as client:
        result = await capture_frame(db, client, run_id=RUN, api_url="https://stage.test/api/", api_instance="api-live")
    assert {role: poll.state for role, poll in result.polls.items()} == {
        "api": "ready", "worker": "ready", "verifier": "stale", "relay": "ready", "consumer": "missing",
    }
    assert result.polls["worker"].instance == "worker-current"
    assert set(preview.find_one.await_args_list[0].args[1]) == {"_id", "last_poll_at"}


@pytest.mark.asyncio
async def test_authenticated_sampler_reads_only_health_and_observes_monotonic_identity(tmp_path):
    url = os.environ.get("GUARDIAN_TEST_MONGO_URL")
    if not url or os.environ.get("GUARDIAN_TEST_MONGO_AUTH") != "true":
        pytest.skip("Requires a disposable authenticated MongoDB server")
    admin = AsyncIOMotorClient(url, tz_aware=True, serverSelectionTimeoutMS=5000)
    database = admin[f"guardian_capture_test_{uuid4().hex}"]
    username, password = uuid4().hex, uuid4().hex
    reader = None
    try:
        await database.command(sampler_role(database.name))
        await database.command("createUser", username, pwd=password, roles=["guardianStagingSampler"])
        hosts = parse_uri(url)["nodelist"]
        reader = AsyncIOMotorClient([f"{host}:{port}" for host, port in hosts], username=username,
                                    password=password, authSource=database.name, tz_aware=True,
                                    serverSelectionTimeoutMS=5000)
        view = reader[database.name]
        now = datetime.now(timezone.utc)
        await database.guardian_service_health.insert_many([
            {"_id": "old-worker", "role": "worker", "last_poll_at": now - timedelta(seconds=1)},
            {"_id": "new-worker", "role": "worker", "last_poll_at": now},
        ])
        await record_notice_poll(database.guardian_notice_relay_health, key="notice_relay", instance="relay-new", at=now)
        await record_notice_poll(database.guardian_notice_relay_health, key="notice_relay", instance="relay-old",
                                 at=now - timedelta(seconds=1))
        async with httpx.AsyncClient(transport=httpx.MockTransport(
            lambda _: httpx.Response(200, json={"app": "STAAR Hub", "status": "online"})
        )) as client:
            result = await capture_frame(view, client, run_id=RUN, api_url="https://stage.test/api/", api_instance="api")
        assert result.polls["worker"].instance == "new-worker"
        assert result.polls["relay"].instance == "relay-new"
        assert result.polls["relay"].state == "ready"
        for collection, operation in [
            ("guardian_missions", "read"), ("guardian_inbox", "read"),
            (HEALTH_COLLECTIONS[0], "write"), (HEALTH_COLLECTIONS[1], "write"),
        ]:
            with pytest.raises(OperationFailure) as rejected:
                table = view[collection]
                if operation == "read":
                    await table.find_one({})
                else:
                    await table.update_one({}, {"$set": {"last_poll_at": now}}, upsert=True)
            assert rejected.value.code == 13

        async def local_api(stream, writer):
            request = await stream.readuntil(b"\r\n\r\n")
            content = b'{"app":"STAAR Hub","status":"online"}' if request.startswith(b"GET /api/ ") else b"{}"
            writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n"
                         + f"Content-Length: {len(content)}\r\n\r\n".encode() + content)
            await writer.drain()
            writer.close()
            await writer.wait_closed()

        server = await asyncio.start_server(local_api, "127.0.0.1", 0)
        async with server:
            port = server.sockets[0].getsockname()[1]
            journal = tmp_path / "polls.jsonl"
            env = {**os.environ, "GUARDIAN_STAGING_SAMPLE_ENABLED": "true",
                   "GUARDIAN_STAGING_SAMPLE_DB": database.name,
                   "GUARDIAN_STAGING_SAMPLE_MONGO_URL":
                       f"mongodb://{username}:{password}@{','.join(f'{host}:{port}' for host, port in hosts)}"
                       f"/?authSource={database.name}",
                   "GUARDIAN_STAGING_API_ORIGIN": f"http://127.0.0.1:{port}"}
            process = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "guardian_staging_capture", "sample", str(journal),
                "--run-id", RUN, "--api-instance", "local-api", env=env,
                cwd=Path(__file__).resolve().parents[1], stderr=asyncio.subprocess.PIPE,
            )
            try:
                _, error = await asyncio.wait_for(process.communicate(), timeout=10)
            finally:
                if process.returncode is None:
                    process.kill()
                    await process.wait()
            assert process.returncode == 0, error.decode()
        saved, = load_journal(journal)
        assert saved.polls["api"].state == "ready"
        assert saved.polls["worker"].instance == "new-worker"
    finally:
        if reader is not None:
            reader.close()
        try:
            await admin.drop_database(database.name)
        finally:
            admin.close()


def test_cli_prints_scoped_role_without_connecting_and_fails_cleanly(tmp_path):
    command = [sys.executable, "-m", "guardian_staging_capture"]
    cwd = Path(__file__).resolve().parents[1]
    role = subprocess.run([*command, "sampler-role", "staging"], check=True, capture_output=True, cwd=cwd)
    assert json.loads(role.stdout) == sampler_role("staging")
    bad = subprocess.run([*command, "assemble-services", str(tmp_path / "missing"), "polls", "services.json"],
                         capture_output=True, cwd=cwd)
    assert bad.returncode == 2 and str(tmp_path).encode() not in bad.stderr
