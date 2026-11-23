"""Exercise signed evidence review using disposable keys and synthetic bundles."""
from datetime import timedelta
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys

import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat

from guardian_staging_review import REVIEW_BYTES, create_receipt, verify_receipt
from tests.test_guardian_staging_evidence import COMMIT, END, RUN, encode, write_bundle

REVIEWED = END + timedelta(minutes=5)
NOW = REVIEWED + timedelta(minutes=1)
SCRIPT = Path(__file__).resolve().parents[1] / "guardian_staging_review.py"


def save(path, values):
    path.write_bytes(encode(values))
    return path


def edit(path, **values):
    return save(path, {**json.loads(path.read_bytes()), **values})


def save_key(path, key):
    path.write_bytes(key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()))
    return path


@pytest.fixture
def files(tmp_path):
    manifest = write_bundle(tmp_path)
    key = Ed25519PrivateKey.generate()
    entry = {
        "reviewer": "release-reviewer",
        "public_key": key.public_key().public_bytes_raw().hex(),
        "valid_from": REVIEWED - timedelta(days=1),
        "valid_until": NOW + timedelta(days=1),
        "revoked": False,
    }
    return {
        "manifest": manifest,
        "decision": save(tmp_path / "decision.json", {
            "version": 1, "run_id": RUN, "manifest_sha256": sha256(manifest.read_bytes()).hexdigest(),
            "preparer": "capture-operator", "reviewer": entry["reviewer"], "reviewed_at": REVIEWED,
            "verdict": "pass", "reason": "accepted",
        }),
        "trust": save(tmp_path / "trust.json", {"version": 1, "keys": [entry]}),
        "key": save_key(tmp_path / "reviewer.pem", key),
        "receipt": tmp_path / "receipt.json",
        "entry": entry,
    }


def create(files):
    return create_receipt(
        files["manifest"], files["decision"], files["trust"], files["key"], files["receipt"], now=NOW,
    )


def verify(files, *, now=NOW):
    return verify_receipt(files["manifest"], files["receipt"], files["trust"], now=now)


def test_round_trip_and_verification_needs_no_private_key(files):
    receipt = create(files)
    assert receipt.record.decision.run_id == RUN
    assert receipt.record.build_commit == COMMIT
    assert receipt.record.device_build == "119"
    assert receipt.record.validator_status == "ready_for_review"
    assert receipt.record.failed_checks == []
    assert bytes.fromhex(receipt.signature)
    assert sha256(bytes.fromhex(files["entry"]["public_key"])).hexdigest() == receipt.record.key_id
    files["key"].unlink()
    files["decision"].unlink()
    assert verify(files) == receipt
    assert verify(files, now=NOW + timedelta(days=7)) == receipt


@pytest.mark.parametrize("changes", [
    {"version": 2},
    {"version": True},
    {"run_id": "another-run"},
    {"manifest_sha256": "7" * 64},
    {"reviewer": "CAPTURE-OPERATOR"},
    {"reviewer": "unrelated-reviewer"},
    {"reviewed_at": REVIEWED.replace(tzinfo=None)},
    {"reviewed_at": REVIEWED - timedelta(minutes=2)},
    {"reviewed_at": NOW + timedelta(seconds=1)},
    {"verdict": "fail"},
    {"reason": "manual_hold"},
    {"private_notes": "sensitive-input"},
])
def test_invalid_decisions_do_not_create_receipts(files, changes):
    edit(files["decision"], **changes)
    with pytest.raises(ValueError):
        create(files)
    assert not files["receipt"].exists()


@pytest.mark.parametrize("changes", [
    {"revoked": True},
    {"reviewer": "someone-else"},
    {"valid_from": REVIEWED + timedelta(seconds=1)},
    {"valid_until": REVIEWED},
    {"valid_until": REVIEWED - timedelta(days=2)},
    {"public_key": "ab"},
])
def test_untrusted_key_blocks_both_operations(files, changes):
    create(files)
    edit(files["trust"], keys=[{**files["entry"], **changes}])
    with pytest.raises(ValueError):
        verify(files)
    with pytest.raises(ValueError):
        create(files)


def test_key_rotation_accepts_a_second_distinct_key(files):
    replacement = Ed25519PrivateKey.generate()
    entry = {**files["entry"], "public_key": replacement.public_key().public_bytes_raw().hex()}
    edit(files["trust"], keys=[files["entry"], entry])
    save_key(files["key"], replacement)
    created = create(files)
    assert verify(files) == created
    assert created.record.key_id == sha256(bytes.fromhex(entry["public_key"])).hexdigest()


def test_duplicate_key_has_no_reviewer_alias(files):
    edit(files["trust"], keys=[files["entry"], {**files["entry"], "reviewer": "alias"}])
    with pytest.raises(ValueError, match="single trust entry"):
        create(files)


@pytest.mark.parametrize("wrong_key", [X25519PrivateKey, Ed25519PrivateKey])
def test_wrong_key_type_or_unknown_key(files, wrong_key):
    save_key(files["key"], wrong_key.generate())
    with pytest.raises(ValueError):
        create(files)


@pytest.mark.parametrize("field,value", [("environment", "local"), ("fixture_only", True)])
def test_fixture_and_local_evidence_cannot_pass(files, field, value):
    edit(files["manifest"], **{field: value})
    edit(files["decision"], manifest_sha256=sha256(files["manifest"].read_bytes()).hexdigest())
    with pytest.raises(ValueError, match="Verdict conflicts"):
        create(files)


def test_failed_review_names_failed_checks(files):
    write_bundle(files["manifest"].parent, section="device", field="voiceover_passed", value=False)
    edit(
        files["decision"], verdict="fail", reason="failed_checks",
        manifest_sha256=sha256(files["manifest"].read_bytes()).hexdigest(),
    )
    assert create(files).record.failed_checks == ["SH-492"]
    assert verify(files).record.validator_status == "failed"


def test_incomplete_capture_can_be_held(files):
    (files["manifest"].parent / "device.json").unlink()
    edit(files["decision"], verdict="hold", reason="incomplete_capture")
    receipt = create(files)
    assert receipt.record.validator_status == "incomplete"
    assert receipt.record.failed_checks == ["SH-427"]
    assert verify(files) == receipt


@pytest.mark.parametrize("verdict,reason", [
    ("pass", "accepted"), ("fail", "failed_checks"),
])
def test_incomplete_capture_cannot_be_passed_or_failed(files, verdict, reason):
    (files["manifest"].parent / "device.json").unlink()
    edit(files["decision"], verdict=verdict, reason=reason)
    with pytest.raises(ValueError, match="Verdict conflicts"):
        create(files)


def test_reviewer_can_hold_a_passing_bundle(files):
    edit(files["decision"], verdict="hold", reason="manual_hold")
    assert create(files).record.validator_status == "ready_for_review"
    assert verify(files).record.decision.verdict == "hold"


@pytest.mark.parametrize("verdict,reason", [("fail", "failed_checks"), ("hold", "incomplete_capture")])
def test_unfounded_machine_reasons_conflict_with_passing_evidence(files, verdict, reason):
    edit(files["decision"], verdict=verdict, reason=reason)
    with pytest.raises(ValueError, match="Verdict conflicts"):
        create(files)


@pytest.mark.parametrize("target", ["manifest", "observation", "record", "signature"])
def test_tamper_invalidates_pass(files, target):
    create(files)
    if target == "manifest":
        files["manifest"].write_bytes(files["manifest"].read_bytes() + b"\n")
    elif target == "observation":
        device = files["manifest"].parent / "device.json"
        device.write_bytes(device.read_bytes() + b"\n")
    elif target == "record":
        receipt = json.loads(files["receipt"].read_bytes())
        edit(files["receipt"], record={**receipt["record"], "device_build": "120"})
    else:
        edit(files["receipt"], signature="0" * 128)
    with pytest.raises((ValueError, InvalidSignature)):
        verify(files)


def test_resealed_manifest_invalidates_the_previous_receipt(files):
    create(files)
    write_bundle(files["manifest"].parent, section="device", field="voiceover_passed", value=False)
    with pytest.raises(ValueError, match="different evidence"):
        verify(files)


@pytest.mark.parametrize("target", ["decision", "trust", "manifest", "receipt"])
def test_duplicate_json_names_are_rejected(files, target):
    create(files)
    path = files[target]
    path.write_bytes(b'{"version":1,' + path.read_bytes().lstrip()[1:])
    with pytest.raises(ValueError, match="duplicate fields"):
        verify(files) if target == "receipt" else create(files)


@pytest.mark.parametrize("target", ["manifest", "decision", "trust", "key", "receipt"])
def test_large_inputs_are_rejected(files, target):
    create(files)
    files[target].write_bytes(b"x" * (REVIEW_BYTES + 1))
    with pytest.raises(ValueError, match="size limit"):
        verify(files) if target == "receipt" else create(files)


def test_receipt_cannot_be_overwritten(files):
    create(files)
    original = files["receipt"].read_bytes()
    with pytest.raises(FileExistsError):
        create(files)
    assert files["receipt"].read_bytes() == original
    assert files["receipt"].stat().st_mode & 0o777 == 0o600


def test_symlink_output_does_not_replace_target(files):
    files["receipt"].symlink_to(files["decision"])
    original = files["decision"].read_bytes()
    with pytest.raises(FileExistsError):
        create(files)
    assert files["decision"].read_bytes() == original


def cli(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)


def test_public_cli(files):
    schema = cli("schema")
    assert schema.returncode == 0
    assert set(json.loads(schema.stdout)) == {"Decision", "Receipt", "TrustRegistry"}
    args = (files["manifest"], files["receipt"], "--trust", files["trust"])
    signed = cli("sign", *args, "--decision", files["decision"], "--key", files["key"])
    assert signed.returncode == 0
    assert json.loads(signed.stdout)["verdict"] == "pass"
    assert cli("verify", *args).returncode == 0
    edit(files["receipt"], signature="private-do-not-echo-this")
    failed = cli("verify", *args)
    assert failed.returncode == 2
    assert not failed.stdout
    assert "private-do-not-echo-this" not in failed.stderr
