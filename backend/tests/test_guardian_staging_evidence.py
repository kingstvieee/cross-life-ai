"""Validate the offline evidence protocol with synthetic bundles only."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys

import pytest

from guardian_staging_evidence import ARTIFACT_BYTES, review_bundle

START = datetime(2026, 1, 10, tzinfo=timezone.utc)
END = START + timedelta(hours=48, minutes=5)
STOP = START + timedelta(hours=12)
COMMIT = "a" * 40
APPROVAL = "b" * 64
RESULT = "c" * 64
NOTICE = sha256(b"stage-event").hexdigest()
CHECKPOINT = "e" * 64
RUN = "evidence-test-only"


def observations():
    services = [{"role": role, "instance": role, "principal": "db-" + role,
                 "commit": COMMIT, "config_version": "v1"}
                for role in ("api", "worker", "verifier", "relay", "consumer")]
    services.append({**services[1], "instance": "worker-replacement"})
    polls = []
    for minute in range(2886):
        at = START + timedelta(minutes=minute)
        for role in ("api", "worker", "verifier", "relay", "consumer"):
            if role == "worker" and at == STOP:
                continue
            instance = "worker-replacement" if role == "worker" and at > STOP else role
            polls.append({"instance": instance, "observed_at": at, "ready": True})
    return {
        "device": {"build": "119", "platform": "ios", "account": "alice", "closed_at": START,
                   "first_return_at": END, "capture_started_at": START - timedelta(minutes=1),
                   "capture_ended_at": END + timedelta(minutes=3), "launches": [END],
                   "account_switch_passed": True, "voiceover_passed": True, "large_text_passed": True},
        "mission": {"mission_id": "m1", "owner": "alice", "handler": "mission_preview",
                    "approval_digest": APPROVAL, "executed_digest": APPROVAL, "result_digest": RESULT,
                    "approver": "alice", "approved_at": START - timedelta(minutes=1),
                    "scheduled_at": END - timedelta(minutes=5), "deadline": END + timedelta(minutes=30),
                    "started_at": END - timedelta(minutes=4), "verified_at": END - timedelta(minutes=3),
                    "worker_instance": "worker-replacement", "verifier_instance": "verifier",
                    "budget_cad_cents": 0, "actual_cad_cents": 0, "state": "completed",
                    "outcome": "passed", "execution_attempts": 1, "verified_result_count": 1},
        "services": {"instances": services, "samples": polls},
        "recovery": {"previous_worker": "worker", "replacement_worker": "worker-replacement",
                     "stopped_at": STOP, "replacement_ready_at": STOP + timedelta(minutes=1),
                     "unstarted_lease_outcome": "requeued", "uncertain_lease_outcome": "quarantined",
                     "unstarted_effect_count": 0, "uncertain_replay_count": 0,
                     "checkpoint_before": CHECKPOINT, "checkpoint_after": CHECKPOINT},
        "authorization": {"relay_principal": "db-relay", "consumer_principal": "db-consumer",
                          "consumer_delivery_succeeded": True, "consumer_mission_read_code": 13,
                          "consumer_mission_write_code": 13, "consumer_dispatch_insert_code": 13,
                          "relay_inbox_write_code": 13, "consumer_foreign_heartbeat_code": 13},
        "inbox": {"owner": "alice", "mission_id": "m1", "event_id": "stage-event", "notice_id": NOTICE,
                  "result_digest": RESULT, "event_kind": "result_ready", "dispatch_count": 1, "notice_count": 1,
                  "delivered_at": END - timedelta(minutes=2), "read_notice_id": NOTICE, "read_by": "alice",
                  "read_at": END + timedelta(minutes=1), "acknowledged_mission_id": "m1",
                  "acknowledged_by": "alice", "acknowledged_at": END + timedelta(minutes=2)},
        "isolation": {"owner": "alice", "other_account": "bob", "mission_id": "m1", "foreign_list_status": 200,
                      "foreign_list_visible_count": 0, "foreign_detail_status": 404, "foreign_read_status": 404,
                      "foreign_ack_status": 403, "owner_receipts_unchanged": True},
    }


def encode(value):
    return json.dumps(value, default=datetime.isoformat, separators=(",", ":")).encode()


def write_bundle(root, *, section=None, field=None, value=None):
    data = observations()
    manifest = {"version": 1, "run_id": RUN, "environment": "staging", "fixture_only": False,
                "build_commit": COMMIT, "device_build": "119", "recorded_at": END + timedelta(minutes=4),
                "artifacts": {}}
    if section == "manifest":
        manifest[field] = value
    elif section is not None:
        data[section][field] = value
    for name, values in data.items():
        raw = encode({"run_id": RUN, **values})
        name_path = f"{name}.json"
        (root / name_path).write_bytes(raw)
        manifest["artifacts"][name] = {"path": name_path, "sha256": sha256(raw).hexdigest()}
    path = root / "manifest.json"
    path.write_bytes(encode(manifest))
    return path


def failed_ids(result):
    return {check["id"] for check in result["checks"] if not check["passed"]}


def test_good_bundle_is_only_ready_for_review(tmp_path):
    result = review_bundle(write_bundle(tmp_path))
    assert result["status"] == "ready_for_review"
    assert [check["id"] for check in result["checks"]] == [f"SH-{i}" for i in range(421, 493)]
    assert not failed_ids(result)


@pytest.mark.parametrize("section,field,value,check", [
    ("manifest", "environment", "local", 421),
    ("manifest", "fixture_only", True, 422),
    ("device", "run_id", "different-run", 429),
    ("manifest", "recorded_at", datetime(2099, 1, 1, tzinfo=timezone.utc), 430),
    ("device", "platform", "web", 431),
    ("device", "build", "120", 432),
    ("device", "account", "someone-else", 433),
    ("device", "closed_at", END, 434),
    ("device", "first_return_at", START + timedelta(hours=47), 435),
    ("device", "capture_started_at", START + timedelta(seconds=1), 436),
    ("device", "capture_ended_at", END - timedelta(seconds=1), 437),
    ("device", "launches", [START + timedelta(hours=24)], 438),
    ("mission", "scheduled_at", START + timedelta(hours=47), 439),
    ("mission", "approved_at", START + timedelta(seconds=1), 440),
    ("mission", "approver", "bob", 441),
    ("mission", "deadline", END - timedelta(minutes=5), 442),
    ("services", "instances", [], 427),
    ("services", "samples", [], 450),
    ("authorization", "relay_principal", "db-worker", 455),
    ("authorization", "consumer_principal", "db-worker", 456),
    ("recovery", "previous_worker", "worker-replacement", 457),
    ("recovery", "replacement_worker", "verifier", 458),
    ("recovery", "stopped_at", START - timedelta(minutes=1), 459),
    ("recovery", "replacement_ready_at", STOP, 460),
    ("mission", "worker_instance", "worker", 461),
    ("recovery", "unstarted_lease_outcome", "lost", 463),
    ("recovery", "unstarted_effect_count", 1, 464),
    ("recovery", "uncertain_lease_outcome", "replayed", 465),
    ("recovery", "uncertain_replay_count", 1, 466),
    ("recovery", "checkpoint_after", RESULT, 467),
    ("mission", "handler", "unknown-handler", 468),
    ("mission", "executed_digest", RESULT, 469),
    ("mission", "budget_cad_cents", 1, 470),
    ("mission", "actual_cad_cents", 1, 471),
    ("mission", "started_at", START, 472),
    ("mission", "verified_at", START, 473),
    ("mission", "verifier_instance", "worker-replacement", 474),
    ("mission", "outcome", "unknown", 475),
    ("mission", "state", "blocked", 476),
    ("mission", "execution_attempts", 2, 477),
    ("mission", "verified_result_count", 0, 478),
    ("inbox", "owner", "bob", 479),
    ("inbox", "mission_id", "m2", 480),
    ("inbox", "event_kind", "needs_review", 481),
    ("inbox", "result_digest", APPROVAL, 482),
    ("inbox", "dispatch_count", 2, 483),
    ("inbox", "notice_count", 2, 484),
    ("inbox", "read_notice_id", RESULT, 485),
    ("inbox", "event_id", "wrong-event", 485),
    ("inbox", "delivered_at", END + timedelta(seconds=1), 486),
    ("inbox", "read_at", END - timedelta(seconds=1), 487),
    ("inbox", "acknowledged_at", END + timedelta(minutes=1), 488),
    ("authorization", "consumer_mission_write_code", 0, 489),
    ("isolation", "foreign_read_status", 200, 490),
    ("isolation", "foreign_list_status", 401, 490),
    ("isolation", "owner_receipts_unchanged", False, 491),
    ("device", "voiceover_passed", False, 492),
])
def test_report_identifies_nonpassing_gate(tmp_path, section, field, value, check):
    result = review_bundle(write_bundle(tmp_path, section=section, field=field, value=value))
    assert result["status"] in {"failed", "incomplete"}
    assert f"SH-{check}" in failed_ids(result)


def test_poll_coverage_requires_intermediate_samples_and_distinct_observation_identity(tmp_path):
    data = observations()
    polls = data["services"]["samples"]
    polls = [poll for poll in polls if not (
        poll["instance"] == "verifier" and START < poll["observed_at"] < START + timedelta(minutes=4))]
    polls.append(polls[-1])
    result = review_bundle(write_bundle(tmp_path, section="services", field="samples", value=polls))
    assert {"SH-448", "SH-451"} <= failed_ids(result)


@pytest.mark.parametrize("edit,check", [
    ("missing_role", 443), ("wrong_build", 444), ("duplicate_instance", 445),
    ("shared_principal", 446), ("unknown_sample", 447), ("out_of_run", 449), ("old_worker_ready", 462),
])
def test_service_registry_and_restart_are_bound_to_observations(tmp_path, edit, check):
    service_data = observations()["services"]
    instances, samples = service_data["instances"], service_data["samples"]
    field = "instances"
    if edit == "missing_role":
        instances.pop(0)
    elif edit == "wrong_build":
        instances[0]["commit"] = "e" * 40
    elif edit == "duplicate_instance":
        instances.append(instances[0])
    elif edit == "shared_principal":
        instances[0]["principal"] = instances[1]["principal"]
    else:
        field = "samples"
        if edit == "unknown_sample":
            samples[0]["instance"] = "unknown"
        elif edit == "out_of_run":
            samples[0]["observed_at"] = START - timedelta(days=1)
        else:
            samples.append({"instance": "worker", "ready": True, "observed_at": STOP})
    path = write_bundle(tmp_path, section="services", field=field, value=service_data[field])
    assert f"SH-{check}" in failed_ids(review_bundle(path))


@pytest.mark.parametrize("mode,check", [
    ("missing", 423), ("duplicate", 424), ("absolute", 425), ("traversal", 425),
    ("escaping_symlink", 425), ("changed", 426), ("malformed", 427), ("large", 428),
])
def test_artifacts_fail_closed(tmp_path, mode, check):
    root = tmp_path / "bundle"
    root.mkdir()
    path = write_bundle(root)
    raw = json.loads(path.read_bytes())
    artifact = raw["artifacts"]["mission"]
    original = root / artifact["path"]
    if mode == "missing":
        del raw["artifacts"]["mission"]
    elif mode == "duplicate":
        raw["artifacts"]["mission"] = raw["artifacts"]["device"]
    elif mode == "absolute":
        artifact["path"] = str(original)
    elif mode == "traversal":
        artifact["path"] = "../mission.json"
    elif mode == "escaping_symlink":
        target = tmp_path / "mission.json"
        original.rename(target)
        original.symlink_to(target)
    elif mode in {"changed", "malformed", "large"}:
        value = b"x" * (ARTIFACT_BYTES + 1) if mode == "large" else b"not json"
        original.write_bytes(value)
        if mode != "changed":
            artifact["sha256"] = sha256(value).hexdigest()
    path.write_bytes(encode(raw))
    result = review_bundle(path)
    assert result["status"] == "incomplete"
    assert f"SH-{check}" in failed_ids(result)
    assert str(tmp_path) not in str(result)


def test_cli_status_codes_and_schema(tmp_path):
    module = [sys.executable, "-m", "guardian_staging_evidence"]
    cwd = Path(__file__).resolve().parents[1]
    schema = subprocess.run([*module, "--schema"], cwd=cwd, check=True, capture_output=True)
    assert len(json.loads(schema.stdout)["observations"]) == 7
    missing = subprocess.run([*module, str(tmp_path / "missing.json")], cwd=cwd, capture_output=True)
    assert missing.returncode == 2 and json.loads(missing.stdout)["status"] == "incomplete"
    path = write_bundle(tmp_path, section="manifest", field="fixture_only", value=True)
    invalid = subprocess.run([*module, str(path)], cwd=cwd, capture_output=True)
    assert invalid.returncode == 1 and json.loads(invalid.stdout)["status"] == "failed"
    path = write_bundle(tmp_path)
    ready = subprocess.run([*module, str(path)], cwd=cwd, capture_output=True)
    assert ready.returncode == 0 and json.loads(ready.stdout)["status"] == "ready_for_review"


def test_manifest_version_is_strict(tmp_path):
    path = write_bundle(tmp_path, section="manifest", field="version", value=True)
    assert review_bundle(path) == {"status": "incomplete", "checks": [],
                                    "issue": "Manifest missing, unreadable or invalid"}
