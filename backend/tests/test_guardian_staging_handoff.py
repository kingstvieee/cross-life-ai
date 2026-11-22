"""Exercise handoff packaging against signed synthetic staging evidence."""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import subprocess
import sys
from zipfile import BadZipFile, ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo

import pytest

import guardian_staging_handoff as handoff
from cryptography.exceptions import InvalidSignature

from guardian_staging_handoff import (
    ENTRY_LIMITS,
    PACKET_BYTES,
    TARGET_BYTES,
    encode_packet,
    export_packet,
    read_packet,
    verify_packet,
)
from tests.test_guardian_staging_evidence import COMMIT, RUN, write_bundle
from tests.test_guardian_staging_review import NOW, create, edit, files, save

SCRIPT = Path(__file__).resolve().parents[1] / "guardian_staging_handoff.py"


@pytest.fixture
def target(tmp_path):
    return save(tmp_path / "target.json", {
        "version": 1, "run_id": RUN, "build_commit": COMMIT, "device_build": "119",
    })


def export(files, target, output):
    return export_packet(
        files["manifest"], files["receipt"], files["trust"], target, output, now=NOW,
    )


@pytest.fixture
def packet(files, target, tmp_path):
    create(files)
    output = tmp_path / "handoff.zip"
    export(files, target, output)
    return output


def verify(packet, files, target, **kwargs):
    return verify_packet(packet, files["trust"], target, now=NOW, **kwargs)


def rewritten_zip(entries, *, compression=ZIP_STORED, comment=b"", member_info=None):
    payload = BytesIO()
    with ZipFile(payload, "w", compression=compression) as archive:
        for name, value in entries:
            info = member_info or ZipInfo(name)
            if member_info is None:
                info.create_system = 3
                info.external_attr = 0o100600 << 16
            info.compress_type = compression
            archive.writestr(info, value)
            member_info = None
        archive.comment = comment
    return payload.getvalue()


def test_round_trip_matches_exact_source_and_is_independent_of_private_key(packet, files, target):
    raw = packet.read_bytes()
    entries = read_packet(raw)
    assert list(entries) == list(ENTRY_LIMITS)
    for name, value in entries.items():
        assert value == (packet.parent / name).read_bytes()
    for name in entries:
        (packet.parent / name).unlink()
    files["key"].unlink()
    files["decision"].unlink()
    expected = sha256(raw).hexdigest()
    result = verify(packet, files, target, expected_digest=expected)
    assert result == {
        "format_version": 1, "status": "verified_for_handoff",
        "run_id": RUN, "build_commit": COMMIT, "device_build": "119",
        "manifest_sha256": sha256(entries["manifest.json"]).hexdigest(),
        "report_sha256": json.loads(entries["receipt.json"])["record"]["report_sha256"],
        "review_key_id": sha256(bytes.fromhex(files["entry"]["public_key"])).hexdigest(),
        "packet_sha256": expected, "packet_bytes": len(raw),
    }


def test_export_verifies_and_publishes_the_same_source_snapshot(packet, files, target, monkeypatch):
    original = handoff.read_source

    def read_and_replace(manifest_path, receipt_path, expected_target):
        entries = original(manifest_path, receipt_path, expected_target)
        (manifest_path.parent / "device.json").write_bytes(b"changed after snapshot")
        return entries

    monkeypatch.setattr(handoff, "read_source", read_and_replace)
    destination = packet.with_suffix(".snapshot.zip")
    export(files, target, destination)
    assert destination.read_bytes() == packet.read_bytes()
    assert verify(destination, files, target)["status"] == "verified_for_handoff"


def test_same_bytes_produce_same_zip(packet, files, target):
    other = packet.with_suffix(".copy.zip")
    export(files, target, other)
    assert packet.read_bytes() == other.read_bytes()
    with ZipFile(packet) as archive:
        assert all(member.date_time == (1980, 1, 1, 0, 0, 0) for member in archive.infolist())
        assert all(member.external_attr >> 16 == 0o100600 for member in archive.infolist())
        assert all(member.compress_type == ZIP_STORED for member in archive.infolist())


@pytest.mark.parametrize("changes", [
    {"run_id": "other-run"}, {"build_commit": "b" * 40}, {"device_build": "120"},
    {"version": 2}, {"version": True}, {"approval": True}, {"build_commit": "a" * 39},
])
def test_target_mismatch_fails_both_commands(packet, files, target, changes):
    edit(target, **changes)
    with pytest.raises(ValueError):
        verify(packet, files, target)
    output = packet.with_suffix(".new.zip")
    with pytest.raises(ValueError):
        export(files, target, output)
    assert not output.exists()


@pytest.mark.parametrize("change", ["duplicate", "oversized", "missing"])
def test_invalid_target_intake(packet, files, target, change):
    if change == "duplicate":
        target.write_bytes(b'{"version":1,' + target.read_bytes().lstrip()[1:])
    elif change == "oversized":
        target.write_bytes(b" " * (TARGET_BYTES + 1))
    else:
        target.unlink()
    with pytest.raises((OSError, ValueError)):
        verify(packet, files, target)


def test_transport_digest_mismatch_is_rejected(packet, files, target):
    with pytest.raises(ValueError, match="expected digest"):
        verify(packet, files, target, expected_digest="0" * 64)


@pytest.mark.parametrize("source", ["device.json", "manifest.json", "receipt.json"])
def test_changed_source_cannot_be_repackaged(packet, files, target, source):
    path = packet.parent / source
    if source == "receipt.json":
        edit(path, signature="0" * 128)
    else:
        path.write_bytes(path.read_bytes() + b"\n")
    output = packet.with_suffix(".new.zip")
    with pytest.raises((ValueError, InvalidSignature)):
        export(files, target, output)
    assert not output.exists()


@pytest.mark.parametrize("observation", ["missing", "oversized", "external"])
def test_source_observation_limits(packet, files, target, observation):
    path = packet.parent / "device.json"
    external = packet.parent.parent / (packet.parent.name + "-outside.json")
    original = path.read_bytes()
    path.unlink()
    if observation == "oversized":
        path.write_bytes(b" " * (ENTRY_LIMITS["device.json"] + 1))
    if observation == "external":
        external.write_bytes(original)
        path.symlink_to(external)
    output = packet.with_suffix(".new.zip")
    with pytest.raises((OSError, ValueError)):
        export(files, target, output)
    assert not output.exists()


@pytest.mark.parametrize("verdict,reason", [("fail", "failed_checks"), ("hold", "manual_hold")])
def test_non_pass_receipts_cannot_be_exported_or_imported(files, target, tmp_path, verdict, reason):
    if verdict == "fail":
        write_bundle(tmp_path, section="device", field="voiceover_passed", value=False)
    edit(
        files["decision"], verdict=verdict, reason=reason,
        manifest_sha256=sha256(files["manifest"].read_bytes()).hexdigest(),
    )
    create(files)
    output = tmp_path / "non-pass.zip"
    with pytest.raises(ValueError, match="Only a verified pass"):
        export(files, target, output)
    assert not output.exists()
    output.write_bytes(encode_packet({name: (tmp_path / name).read_bytes() for name in ENTRY_LIMITS}))
    with pytest.raises(ValueError, match="Only a verified pass"):
        verify(output, files, target)


def test_revocation_blocks_an_existing_packet(packet, files, target):
    edit(files["trust"], keys=[{**files["entry"], "revoked": True}])
    with pytest.raises(ValueError, match="not trusted"):
        verify(packet, files, target)


@pytest.mark.parametrize("source", ["manifest.json", "receipt.json", "device.json"])
def test_rebuilt_archive_does_not_validate_tampering(packet, files, target, source):
    entries = read_packet(packet.read_bytes())
    if source == "receipt.json":
        receipt = json.loads(entries[source])
        receipt["record"]["decision"]["reviewer"] = "other"
        entries[source] = json.dumps(receipt).encode()
    else:
        entries[source] += b"\n"
    packet.write_bytes(encode_packet(entries))
    with pytest.raises((ValueError, InvalidSignature)):
        verify(packet, files, target)


@pytest.mark.parametrize("mutation", [
    "missing", "extra", "duplicate", "reordered", "absolute", "traversal", "separator",
    "compressed", "comment", "trailing", "prepended", "truncated", "crc", "symlink", "oversized_member",
])
def test_noncanonical_archive_is_rejected(packet, files, target, mutation):
    raw = packet.read_bytes()
    entries = list(read_packet(raw).items())
    name, value = entries[0]
    kwargs = {}
    if mutation == "missing":
        entries.pop()
    elif mutation == "extra":
        entries.append(("unexpected.json", b"{}"))
    elif mutation == "duplicate":
        entries[-1] = entries[0]
    elif mutation == "reordered":
        entries.reverse()
    elif mutation in {"absolute", "traversal", "separator"}:
        entries[0] = ({"absolute": "/", "traversal": "../", "separator": "a\\"}[mutation] + name, value)
    elif mutation == "compressed":
        kwargs["compression"] = ZIP_DEFLATED
    elif mutation == "comment":
        kwargs["comment"] = b"extra metadata"
    elif mutation == "symlink":
        kwargs["member_info"] = ZipInfo(name)
        kwargs["member_info"].external_attr = 0o120777 << 16
    elif mutation == "oversized_member":
        entries[0] = (name, b"x" * (ENTRY_LIMITS[name] + 1))
    if mutation == "duplicate":
        with pytest.warns(UserWarning, match="Duplicate name"):
            modified = rewritten_zip(entries)
    elif mutation == "trailing":
        modified = raw + b"x"
    elif mutation == "prepended":
        modified = b"x" + raw
    elif mutation == "truncated":
        modified = raw[:-1]
    elif mutation == "crc":
        first_body_offset = 30 + len(name)
        modified = raw[:first_body_offset] + b"x" + raw[first_body_offset + 1:]
    else:
        modified = rewritten_zip(entries, **kwargs)
    packet.write_bytes(modified)
    with pytest.raises((ValueError, BadZipFile)):
        verify(packet, files, target)
    assert not (packet.parent.parent / name).exists()


def test_packet_size_limit_is_checked_before_parsing(packet, files, target):
    with packet.open("wb") as stream:
        stream.truncate(PACKET_BYTES + 1)
    with pytest.raises(ValueError, match="size limit"):
        verify(packet, files, target)


def test_publish_is_no_clobber_and_uses_private_permissions(packet, files, target):
    original = packet.read_bytes()
    assert packet.stat().st_mode & 0o777 == 0o600
    with pytest.raises(FileExistsError):
        export(files, target, packet)
    symlink = packet.with_suffix(".link")
    symlink.symlink_to(packet)
    with pytest.raises(FileExistsError):
        export(files, target, symlink)
    assert packet.read_bytes() == original


def test_cli_offline_transport(packet, files, target):
    def cli(*args):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)

    result = cli("schema")
    assert result.returncode == 0
    assert json.loads(result.stdout)["title"] == "ReleaseTarget"
    new = packet.with_suffix(".new.zip")
    options = ("--trust", files["trust"], "--target", target)
    result = cli("export", new, "--manifest", files["manifest"], "--receipt", files["receipt"], *options)
    assert result.returncode == 0
    exported = json.loads(result.stdout)
    assert exported["status"] == "verified_for_handoff"
    result = cli("verify", new, *options, "--sha256", exported["packet_sha256"])
    assert result.returncode == 0
    assert json.loads(result.stdout) == exported
    result = cli("verify", new, *options, "--sha256", "untrusted-private-input")
    assert result.returncode == 2
    assert not result.stdout
    assert "untrusted-private-input" not in result.stderr


def test_wrong_target_is_rejected_before_opening_evidence(packet, files, target):
    edit(target, run_id="different-run")
    files["receipt"].unlink()
    (packet.parent / "device.json").unlink()
    output = packet.with_suffix(".wrong.zip")
    with pytest.raises(ValueError, match="requested run and build"):
        export(files, target, output)
    assert not output.exists()
