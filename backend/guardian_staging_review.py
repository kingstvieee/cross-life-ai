"""Sign and independently verify an offline Guardian staging evidence decision."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from typing import Annotated, Literal

from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from pydantic import AwareDatetime, Field, model_validator

from guardian_staging_capture import write_new_json
from guardian_staging_evidence import MANIFEST_BYTES, bounded_read, review_manifest
from guardian_staging_manifest import Commit, Digest, EvidenceModel, Manifest, Token

REVIEW_BYTES = 128 * 1024
KEY_BYTES = 8 * 1024
DOMAIN = b"STAAR Hub Guardian staging review v1\x00"
Version = Annotated[int, Field(ge=1, le=1)]
CheckID = Annotated[str, Field(pattern=r"^SH-(42[1-9]|4[3-8][0-9]|49[0-2])$")]
KeyHex = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Signature = Annotated[str, Field(pattern=r"^[a-f0-9]{128}$")]


class Decision(EvidenceModel):
    version: Version
    run_id: Token
    manifest_sha256: Digest
    preparer: Token
    reviewer: Token
    reviewed_at: AwareDatetime
    verdict: Literal["pass", "fail", "hold"]
    reason: Literal["accepted", "failed_checks", "incomplete_capture", "manual_hold"]

    @model_validator(mode="after")
    def validate_decision(self):
        if self.preparer.casefold() == self.reviewer.casefold():
            raise ValueError("Reviewer and preparer must be distinct")
        if (self.verdict, self.reason) not in {
            ("pass", "accepted"), ("fail", "failed_checks"),
            ("hold", "incomplete_capture"), ("hold", "manual_hold"),
        }:
            raise ValueError("Reason is inconsistent with verdict")
        return self


class TrustedKey(EvidenceModel):
    reviewer: Token
    public_key: KeyHex
    valid_from: AwareDatetime
    valid_until: AwareDatetime
    revoked: bool

    @model_validator(mode="after")
    def validate_interval(self):
        if self.valid_from >= self.valid_until:
            raise ValueError("Trust interval must be increasing")
        return self


class TrustRegistry(EvidenceModel):
    version: Version
    keys: Annotated[list[TrustedKey], Field(min_length=1, max_length=100)]

    @model_validator(mode="after")
    def validate_unique_keys(self):
        if len({entry.public_key for entry in self.keys}) != len(self.keys):
            raise ValueError("Each public key must have a single trust entry")
        return self


class ReviewRecord(EvidenceModel):
    decision: Decision
    build_commit: Commit
    device_build: Token
    key_id: Digest
    validator_status: Literal["ready_for_review", "failed", "incomplete"]
    report_sha256: Digest
    failed_checks: Annotated[list[CheckID], Field(max_length=72)]


class Receipt(EvidenceModel):
    version: Version
    record: ReviewRecord
    signature: Signature


def reject_duplicate_fields(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("JSON object has duplicate fields")
        result[name] = value
    return result


def parse_json(model, data):
    # Enforce a single interpretation before the strict typed parser handles dates.
    json.loads(data, object_pairs_hook=reject_duplicate_fields)
    return model.model_validate_json(data)


def canonical_json(data):
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def key_id(public_key):
    return sha256(public_key.public_bytes_raw()).hexdigest()


def trusted_key(registry, fingerprint, decision):
    for entry in registry.keys:
        public_key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(entry.public_key))
        if key_id(public_key) == fingerprint:
            if (
                entry.reviewer != decision.reviewer or entry.revoked
                or not entry.valid_from <= decision.reviewed_at < entry.valid_until
            ):
                break
            return public_key
    raise ValueError("Reviewer key is not trusted for this decision")


def read_manifest(path):
    data = bounded_read(path, MANIFEST_BYTES)
    return parse_json(Manifest, data), sha256(data).hexdigest()


def build_record(manifest, manifest_digest, root, decision, fingerprint, now):
    if manifest_digest != decision.manifest_sha256 or manifest.run_id != decision.run_id:
        raise ValueError("Decision references different evidence")
    if not manifest.recorded_at <= decision.reviewed_at <= now:
        raise ValueError("Review time is outside the evidence recording window")
    report = review_manifest(manifest, root, now=decision.reviewed_at)
    status = report["status"]
    if decision.reason != "manual_hold" and status != {
        "pass": "ready_for_review", "fail": "failed", "hold": "incomplete",
    }[decision.verdict]:
        raise ValueError("Verdict conflicts with the evidence check results")
    return ReviewRecord(
        decision=decision, build_commit=manifest.build_commit, device_build=manifest.device_build,
        key_id=fingerprint, validator_status=status,
        report_sha256=sha256(canonical_json(report)).hexdigest(),
        failed_checks=[check["id"] for check in report["checks"] if not check["passed"]],
    )


def signed_message(record):
    return DOMAIN + canonical_json(record.model_dump(mode="json"))


def create_receipt(manifest_path, decision_path, registry_path, key_path, output, *, now=None):
    decision = parse_json(Decision, bounded_read(decision_path, REVIEW_BYTES))
    registry = parse_json(TrustRegistry, bounded_read(registry_path, REVIEW_BYTES))
    private_key = load_pem_private_key(bounded_read(key_path, KEY_BYTES), password=None)
    if not isinstance(private_key, Ed25519PrivateKey):
        raise ValueError("Expected an Ed25519 signing key")
    fingerprint = key_id(private_key.public_key())
    trusted_key(registry, fingerprint, decision)
    manifest, digest = read_manifest(manifest_path)
    record = build_record(
        manifest, digest, manifest_path.parent.resolve(), decision, fingerprint, now or datetime.now(timezone.utc),
    )
    receipt = Receipt(version=1, record=record, signature=private_key.sign(signed_message(record)).hex())
    write_new_json(output, receipt, maximum=REVIEW_BYTES)
    return receipt


def verify_receipt(manifest_path, receipt_path, registry_path, *, now=None):
    receipt = parse_json(Receipt, bounded_read(receipt_path, REVIEW_BYTES))
    registry = parse_json(TrustRegistry, bounded_read(registry_path, REVIEW_BYTES))
    record = receipt.record
    public_key = trusted_key(registry, record.key_id, record.decision)
    public_key.verify(bytes.fromhex(receipt.signature), signed_message(record))
    manifest, digest = read_manifest(manifest_path)
    expected = build_record(
        manifest, digest, manifest_path.parent.resolve(), record.decision, record.key_id,
        now or datetime.now(timezone.utc),
    )
    if signed_message(record) != signed_message(expected):
        raise ValueError("Signed review no longer matches the evidence")
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("schema", help="Show supported JSON schemas")
    create = commands.add_parser("sign", help="Sign a review and write a new receipt")
    verify = commands.add_parser("verify", help="Verify a receipt against the original bundle")
    for command in (create, verify):
        command.add_argument("manifest", type=Path)
        command.add_argument("receipt", type=Path)
        command.add_argument("--trust", type=Path, required=True)
    create.add_argument("--decision", type=Path, required=True)
    create.add_argument("--key", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "schema":
        print(json.dumps({model.__name__: model.model_json_schema() for model in (Decision, TrustRegistry, Receipt)}))
        return 0
    try:
        if args.command == "sign":
            receipt = create_receipt(args.manifest, args.decision, args.trust, args.key, args.receipt)
        else:
            receipt = verify_receipt(args.manifest, args.receipt, args.trust)
    except (OSError, RuntimeError, ValueError, TypeError, InvalidSignature, UnsupportedAlgorithm):
        parser.exit(2, "Guardian staging review rejected the inputs or could not write the receipt.\n")
    print(json.dumps({
        "operation": args.command,
        "verdict": receipt.record.decision.verdict,
        "validator_status": receipt.record.validator_status,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
