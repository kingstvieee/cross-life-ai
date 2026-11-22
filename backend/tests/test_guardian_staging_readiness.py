from hashlib import sha256

import pytest

from guardian_staging_readiness import readiness
from tests.test_guardian_staging_handoff import NOW, packet, target
from tests.test_guardian_staging_review import create, edit, files


@pytest.mark.parametrize("mutation,expected", [
    ("none", "handoff_verified"),
    ("manifest_missing", "capture_missing"),
    ("manifest_invalid", "capture_invalid"),
    ("wrong_run", "target_mismatch"),
    ("observation_missing", "capture_incomplete"),
    ("fixture", "capture_failed"),
    ("receipt_missing", "review_missing"),
    ("receipt_invalid", "review_invalid"),
    ("revoked", "review_invalid"),
    ("packet_missing", "packet_missing"),
    ("packet_invalid", "packet_invalid"),
    ("other_review", "packet_mismatch"),
    ("hold", "review_hold"),
])
def test_staging_readiness(packet, files, target, mutation, expected):
    for label, path in {**files, "packet": packet}.items():
        if mutation == label + "_missing":
            path.unlink()
        if mutation == label + "_invalid":
            path.write_bytes(b"invalid")
    if mutation == "wrong_run":
        edit(target, run_id="wrong")
    if mutation == "observation_missing":
        (packet.parent / "device.json").unlink()
    if mutation == "fixture":
        edit(files["manifest"], fixture_only=True)
    if mutation == "revoked":
        edit(files["trust"], keys=[{**files["entry"], "revoked": True}])
    if mutation in {"other_review", "hold"}:
        files["receipt"].unlink()
        if mutation == "hold":
            edit(files["decision"], verdict="hold", reason="manual_hold")
        else:
            edit(files["decision"], reviewed_at=NOW)
        create(files)
    result = readiness(target, files["manifest"], files["receipt"], packet, files["trust"], now=NOW)
    assert result["status"] == expected
    assert result["next_action"]
    if mutation == "fixture":
        assert "SH-422" in result["failed_checks"]


def test_readiness_distinguishes_a_wrong_packet_digest(packet, files, target):
    args = (target, files["manifest"], files["receipt"], packet, files["trust"])
    digest = sha256(packet.read_bytes()).hexdigest()
    assert readiness(*args, expected_digest=digest, now=NOW)["status"] == "handoff_verified"
    result = readiness(*args, expected_digest="0" * 64, now=NOW)
    assert result["status"] == "packet_digest_mismatch"
    assert result["next_action"] == "locate_expected_handoff"
    with pytest.raises(ValueError):
        readiness(*args, expected_digest="invalid", now=NOW)
