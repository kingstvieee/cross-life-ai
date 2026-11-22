"""Record and recheck an offline Guardian staging handoff closeout."""
import argparse
from hmac import compare_digest
import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field

from guardian_staging_capture import write_new_json
from guardian_staging_evidence import bounded_read
from guardian_staging_handoff import PACKET_BYTES, verify_packet
from guardian_staging_manifest import Commit, Digest, EvidenceModel, Token
from guardian_staging_readiness import INPUT_ERRORS
from guardian_staging_review import Version, canonical_json, parse_json

CLOSEOUT_BYTES = 4096


class Closeout(EvidenceModel):
    version: Version
    outcome: Literal["staging_handoff_verified"]
    run_id: Token
    build_commit: Commit
    device_build: Token
    packet_sha256: Digest
    manifest_sha256: Digest
    report_sha256: Digest
    review_key_id: Digest
    packet_bytes: Annotated[int, Field(gt=0, le=PACKET_BYTES)]


def verified_closeout(packet, trust, target, expected_digest, *, now=None):
    if expected_digest is None:
        raise ValueError("Closeout requires an independent packet digest")
    report = verify_packet(packet, trust, target, expected_digest=expected_digest, now=now)
    return Closeout(
        version=1, outcome="staging_handoff_verified",
        run_id=report["run_id"], build_commit=report["build_commit"], device_build=report["device_build"],
        packet_sha256=report["packet_sha256"], manifest_sha256=report["manifest_sha256"],
        report_sha256=report["report_sha256"], review_key_id=report["review_key_id"],
        packet_bytes=report["packet_bytes"],
    )


def closeout(packet, trust, target, expected_digest, record_path, *, check=False, now=None):
    recorded = parse_json(Closeout, bounded_read(record_path, CLOSEOUT_BYTES)) if check else None
    expected = verified_closeout(packet, trust, target, expected_digest, now=now)
    if check:
        if not compare_digest(canonical_json(recorded.model_dump()), canonical_json(expected.model_dump())):
            raise ValueError("Closeout record differs from verified staging evidence")
    else:
        write_new_json(record_path, expected, maximum=CLOSEOUT_BYTES)
    return expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("schema", help="Show the staging closeout record schema")
    for name in ("record", "verify"):
        command = commands.add_parser(name)
        command.add_argument("record", type=Path)
        for option in ("packet", "trust", "target"):
            command.add_argument("--" + option, type=Path, required=True)
        command.add_argument("--sha256", required=True, help="Independently obtained ZIP digest")
    args = parser.parse_args()
    if args.command == "schema":
        print(json.dumps(Closeout.model_json_schema(), sort_keys=True))
        return 0
    try:
        result = closeout(
            args.packet, args.trust, args.target, args.sha256, args.record, check=args.command == "verify",
        )
    except INPUT_ERRORS:
        parser.exit(2, "Guardian staging closeout rejected the inputs or could not write the record.\n")
    print(result.model_dump_json())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
