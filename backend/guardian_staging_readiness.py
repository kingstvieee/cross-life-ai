"""Report the next evidence collection step for an explicitly selected staging build."""
import argparse
from hashlib import sha256
import json
from pathlib import Path

from guardian_staging_evidence import MANIFEST_BYTES, bounded_read, review_manifest
from guardian_staging_handoff import (
    PACKET_DIGEST, TARGET_BYTES, PacketDigestMismatch, ReleaseTarget, verify_packet_target,
)
from guardian_staging_manifest import Manifest
from guardian_staging_review import parse_json, verify_receipt

from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm
from zipfile import BadZipFile

INPUT_ERRORS = (OSError, ValueError, TypeError, RuntimeError, InvalidSignature, UnsupportedAlgorithm, BadZipFile)


def readiness(target_path, manifest_path, receipt_path, packet_path, trust_path, *, expected_digest=None, now=None):
    if expected_digest is not None:
        expected_digest = PACKET_DIGEST.validate_python(expected_digest, strict=True)
    target = parse_json(ReleaseTarget, bounded_read(target_path, TARGET_BYTES))
    result = target.model_dump()

    def state(status, action, failed_checks=()):
        return {**result, "status": status, "next_action": action, "failed_checks": list(failed_checks)}

    if not manifest_path.exists():
        return state("capture_missing", "collect_and_seal_evidence")
    try:
        manifest_bytes = bounded_read(manifest_path, MANIFEST_BYTES)
        manifest = parse_json(Manifest, manifest_bytes)
        if (manifest.run_id, manifest.build_commit, manifest.device_build) != (
            target.run_id, target.build_commit, target.device_build,
        ):
            return state("target_mismatch", "select_matching_capture")
        report = review_manifest(manifest, manifest_path.parent.resolve(), now=now)
    except INPUT_ERRORS:
        return state("capture_invalid", "repair_capture")
    failed = [check["id"] for check in report["checks"] if not check["passed"]]
    if report["status"] != "ready_for_review":
        return state("capture_" + report["status"], "repair_capture", failed)
    if not receipt_path.exists():
        return state("review_missing", "obtain_signed_review")
    try:
        receipt = verify_receipt(manifest_path, receipt_path, trust_path, now=now)
        record = receipt.record
        if record.decision.manifest_sha256 != sha256(manifest_bytes).hexdigest():
            return state("review_invalid", "verify_receipt_and_reviewer_trust")
        if (record.decision.run_id, record.build_commit, record.device_build) != (
            target.run_id, target.build_commit, target.device_build,
        ):
            return state("target_mismatch", "select_matching_capture")
    except INPUT_ERRORS:
        return state("review_invalid", "verify_receipt_and_reviewer_trust")
    if record.decision.verdict != "pass":
        return state("review_" + record.decision.verdict, "resolve_review_decision")
    if not packet_path.exists():
        return state("packet_missing", "export_verified_handoff")
    try:
        _, packaged = verify_packet_target(
            packet_path, trust_path, target, expected_digest=expected_digest, now=now,
        )
        if packaged != receipt:
            return state("packet_mismatch", "export_matching_handoff")
    except PacketDigestMismatch:
        return state("packet_digest_mismatch", "locate_expected_handoff")
    except INPUT_ERRORS:
        return state("packet_invalid", "verify_or_reexport_handoff")
    return state("handoff_verified", "retain_verification_record")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("target", "manifest", "receipt", "packet", "trust"):
        parser.add_argument("--" + name, type=Path, required=True)
    parser.add_argument("--sha256", help="Expected ZIP digest obtained independently")
    args = parser.parse_args()
    try:
        result = readiness(
            args.target, args.manifest, args.receipt, args.packet, args.trust, expected_digest=args.sha256,
        )
    except INPUT_ERRORS:
        parser.exit(2, "Guardian staging readiness rejected the build target or expected ZIP digest.\n")
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "handoff_verified" else 1


if __name__ == "__main__":
    raise SystemExit(main())
