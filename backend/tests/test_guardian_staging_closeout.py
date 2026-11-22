"""Exercise staging closeout with disposable reviewer keys."""
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys

import pytest

from guardian_staging_closeout import CLOSEOUT_BYTES, closeout
from tests.test_guardian_staging_handoff import NOW, packet, target
from tests.test_guardian_staging_review import edit, files

SCRIPT = Path(__file__).resolve().parents[1] / "guardian_staging_closeout.py"


def test_closeout_round_trip(packet, files, target):
    record = packet.with_suffix(".json")
    args = (packet, files["trust"], target, sha256(packet.read_bytes()).hexdigest(), record)
    result = closeout(*args, now=NOW)
    assert result.outcome == "staging_handoff_verified"
    assert result.packet_bytes == packet.stat().st_size
    assert result.packet_sha256 == args[3]
    assert closeout(*args, check=True, now=NOW) == result
    assert record.stat().st_mode & 0o777 == 0o600
    original = record.read_bytes()
    with pytest.raises(FileExistsError):
        closeout(*args, now=NOW)
    assert record.read_bytes() == original


@pytest.mark.parametrize("mutation", [
    "digest", "malformed_digest", "packet", "run", "trust", "record", "duplicate", "large_record", "missing_record",
])
def test_closeout_recheck_fails_closed(packet, files, target, mutation):
    record = packet.with_suffix(".json")
    digest = sha256(packet.read_bytes()).hexdigest()
    closeout(packet, files["trust"], target, digest, record, now=NOW)
    if mutation == "digest":
        digest = "0" * 64
    elif mutation == "malformed_digest":
        digest = "g" * 64
    elif mutation == "packet":
        packet.write_bytes(packet.read_bytes() + b"x")
    elif mutation == "run":
        edit(target, run_id="different-run")
    elif mutation == "trust":
        edit(files["trust"], keys=[{**files["entry"], "revoked": True}])
    elif mutation == "record":
        edit(record, review_key_id="a" * 64)
    elif mutation == "duplicate":
        record.write_bytes(b'{"version":1,' + record.read_bytes()[1:])
    elif mutation == "large_record":
        record.write_bytes(b"x" * (CLOSEOUT_BYTES + 1))
    else:
        record.unlink()
    with pytest.raises((ValueError, OSError)):
        closeout(packet, files["trust"], target, digest, record, check=True, now=NOW)


def test_cli_requires_independent_digest(packet, files, target):
    def cli(*args):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)

    schema = cli("schema")
    assert schema.returncode == 0
    assert json.loads(schema.stdout)["title"] == "Closeout"
    record = packet.with_suffix(".json")
    common = (record, "--packet", packet, "--trust", files["trust"], "--target", target)
    digest = sha256(packet.read_bytes()).hexdigest()
    assert cli("record", *common).returncode == 2
    assert not record.exists()
    recorded = cli("record", *common, "--sha256", digest)
    assert recorded.returncode == 0
    verified = cli("verify", *common, "--sha256", digest)
    assert verified.returncode == 0
    assert verified.stdout == recorded.stdout
    rejected = cli("verify", *common, "--sha256", "private-input")
    assert rejected.returncode == 2
    assert not rejected.stdout
    assert "private-input" not in rejected.stderr
