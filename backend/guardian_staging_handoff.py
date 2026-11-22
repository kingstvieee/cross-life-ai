"""Export and verify a portable Guardian staging packet for an explicit build."""
import argparse
from hashlib import sha256
from hmac import compare_digest
from io import BytesIO
import json
from pathlib import Path
from struct import Struct
from tempfile import TemporaryDirectory
from zipfile import BadZipFile, ZIP_STORED, ZipFile, ZipInfo

from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm
from pydantic import TypeAdapter

from guardian_staging_capture import write_new_bytes
from guardian_staging_evidence import ARTIFACT_BYTES, MANIFEST_BYTES, bounded_read, resolve_artifact
from guardian_staging_manifest import ARTIFACT_MODELS, Commit, Digest, EvidenceModel, Manifest, Token
from guardian_staging_review import REVIEW_BYTES, Version, parse_json, verify_receipt

MANIFEST_NAME = "manifest.json"
RECEIPT_NAME = "receipt.json"
OBSERVATION_NAMES = tuple(sorted(f"{name}.json" for name in ARTIFACT_MODELS))
ENTRY_LIMITS = {
    MANIFEST_NAME: MANIFEST_BYTES,
    RECEIPT_NAME: REVIEW_BYTES,
    **dict.fromkeys(OBSERVATION_NAMES, ARTIFACT_BYTES),
}
TARGET_BYTES = 4096
PACKET_DIGEST = TypeAdapter(Digest)
MAX_ZIP_OVERHEAD = 4096
PACKET_BYTES = sum(ENTRY_LIMITS.values()) + MAX_ZIP_OVERHEAD
# A v1 packet always ends in the classic, comment-free single-disk record.
ZIP_END = Struct("<4s4H2LH")


class PacketDigestMismatch(ValueError):
    """The packet differs from an independently supplied digest."""


class ReleaseTarget(EvidenceModel):
    version: Version
    run_id: Token
    build_commit: Commit
    device_build: Token


def check_manifest_layout(manifest):
    if set(manifest.artifacts) != set(ARTIFACT_MODELS):
        raise ValueError("Handoff requires every observation")
    if any(item.path != f"{name}.json" for name, item in manifest.artifacts.items()):
        raise ValueError("Handoff requires the canonical sealed layout")


def check_target(manifest, target):
    if (manifest.run_id, manifest.build_commit, manifest.device_build) != (
        target.run_id, target.build_commit, target.device_build,
    ):
        raise ValueError("Packet does not match the requested run and build")


def read_source(manifest_path, receipt_path, target):
    manifest_bytes = bounded_read(manifest_path, MANIFEST_BYTES)
    manifest = parse_json(Manifest, manifest_bytes)
    check_target(manifest, target)
    check_manifest_layout(manifest)
    root = manifest_path.parent.resolve()
    return {
        MANIFEST_NAME: manifest_bytes,
        RECEIPT_NAME: bounded_read(receipt_path, REVIEW_BYTES),
        **{
            name: bounded_read(resolve_artifact(root, name), ARTIFACT_BYTES)
            for name in OBSERVATION_NAMES
        },
    }


def encode_packet(entries):
    stream = BytesIO()
    with ZipFile(stream, "w", compression=ZIP_STORED, allowZip64=False) as archive:
        for name in ENTRY_LIMITS:
            info = ZipInfo(name)
            info.create_system = 3
            info.external_attr = 0o100600 << 16
            archive.writestr(info, entries[name])
    return stream.getvalue()


def check_zip_footer(data):
    if len(data) < ZIP_END.size:
        raise ValueError("Packet has no ZIP footer")
    magic, disk, start_disk, disk_count, total, size, offset, comment = ZIP_END.unpack_from(
        data, len(data) - ZIP_END.size,
    )
    if (
        magic != b"PK\x05\x06" or disk or start_disk or comment
        or disk_count != len(ENTRY_LIMITS) or total != len(ENTRY_LIMITS)
        or not 0 < size <= MAX_ZIP_OVERHEAD or offset + size != len(data) - ZIP_END.size
    ):
        raise ValueError("Packet has an unexpected ZIP directory")


def read_packet(data):
    check_zip_footer(data)
    with ZipFile(BytesIO(data)) as archive:
        members = archive.infolist()
        if [member.filename for member in members] != list(ENTRY_LIMITS):
            raise ValueError("Packet names or ordering are invalid")
        entries = {}
        for member in members:
            limit = ENTRY_LIMITS[member.filename]
            if (
                member.compress_type != ZIP_STORED or member.flag_bits
                or member.file_size != member.compress_size or member.file_size > limit
            ):
                raise ValueError("Packet member uses unsupported encoding or size")
            with archive.open(member) as source:
                value = source.read(limit + 1)
            if len(value) != member.file_size or member.orig_filename != member.filename:
                raise ValueError("Packet member does not match its directory entry")
            entries[member.filename] = value
    if data != encode_packet(entries):
        raise ValueError("Packet is outside the canonical v1 format")
    return entries


def verify_entries(entries, trust_path, target, *, now=None):
    manifest = parse_json(Manifest, entries[MANIFEST_NAME])
    check_manifest_layout(manifest)
    check_target(manifest, target)
    # All paths are module constants. Never extract paths from the incoming ZIP.
    with TemporaryDirectory(prefix="guardian-handoff-") as directory:
        root = Path(directory)
        for name in ENTRY_LIMITS:
            (root / name).write_bytes(entries[name])
        receipt = verify_receipt(root / MANIFEST_NAME, root / RECEIPT_NAME, trust_path, now=now)
    if receipt.record.decision.verdict != "pass":
        raise ValueError("Only a verified pass is eligible for handoff")
    return receipt


def summary(record, packet):
    return {
        "format_version": 1,
        "status": "verified_for_handoff",
        "run_id": record.decision.run_id,
        "build_commit": record.build_commit,
        "device_build": record.device_build,
        "manifest_sha256": record.decision.manifest_sha256,
        "report_sha256": record.report_sha256,
        "review_key_id": record.key_id,
        "packet_sha256": sha256(packet).hexdigest(),
        "packet_bytes": len(packet),
    }


def export_packet(manifest_path, receipt_path, trust_path, target_path, output, *, now=None):
    target = parse_json(ReleaseTarget, bounded_read(target_path, TARGET_BYTES))
    entries = read_source(manifest_path, receipt_path, target)
    receipt = verify_entries(entries, trust_path, target, now=now)
    packet = encode_packet(entries)
    write_new_bytes(output, packet, maximum=PACKET_BYTES)
    return summary(receipt.record, packet)


def verify_packet(packet_path, trust_path, target_path, *, expected_digest=None, now=None):
    target = parse_json(ReleaseTarget, bounded_read(target_path, TARGET_BYTES))
    packet, receipt = verify_packet_target(packet_path, trust_path, target, expected_digest=expected_digest, now=now)
    return summary(receipt.record, packet)


def verify_packet_target(packet_path, trust_path, target, *, expected_digest=None, now=None):
    if expected_digest is not None:
        expected_digest = PACKET_DIGEST.validate_python(expected_digest, strict=True)
    packet = bounded_read(packet_path, PACKET_BYTES)
    if expected_digest is not None and not compare_digest(sha256(packet).hexdigest(), expected_digest):
        raise PacketDigestMismatch("Packet SHA-256 differs from the expected digest")
    entries = read_packet(packet)
    return packet, verify_entries(entries, trust_path, target, now=now)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("schema", help="Show the target schema")
    export = commands.add_parser("export", help="Export a verified handoff ZIP")
    verify = commands.add_parser("verify", help="Verify a handoff ZIP offline")
    for command in (export, verify):
        command.add_argument("packet", type=Path)
        command.add_argument("--trust", type=Path, required=True)
        command.add_argument("--target", type=Path, required=True)
    export.add_argument("--manifest", type=Path, required=True)
    export.add_argument("--receipt", type=Path, required=True)
    verify.add_argument("--sha256", help="Expected packet digest obtained independently")
    args = parser.parse_args()
    if args.command == "schema":
        print(json.dumps(ReleaseTarget.model_json_schema()))
        return 0
    try:
        if args.command == "export":
            result = export_packet(args.manifest, args.receipt, args.trust, args.target, args.packet)
        else:
            result = verify_packet(args.packet, args.trust, args.target, expected_digest=args.sha256)
    except (OSError, RuntimeError, ValueError, TypeError, BadZipFile, InvalidSignature, UnsupportedAlgorithm):
        parser.exit(2, "Guardian staging handoff rejected the inputs or could not write the packet.\n")
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
