"""Check component traceability and receipt coverage; never fetch private evidence.

A passing result verifies structure, not the authenticity of approvals or receipts.
The evidence ledger must come from the release review and be inspected separately.
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]{0,63}\Z")
SHA = re.compile(r"[a-f0-9]{40}\Z")
BAD = {"", "unknown", "tbd", "pending", "placeholder", "n/a", "none"}
LANES = {"app", "api", "provider", "hardware", "device"}
EXPECTED_CANDIDATES, EXPECTED_COMPONENTS = 805, 804


def named(value):
    return isinstance(value, str) and value.strip().casefold() not in BAD


def valid_id(value):
    return isinstance(value, str) and bool(ID.fullmatch(value))


def validate(candidate_ids, ledger):
    issue = []
    if len(candidate_ids) != EXPECTED_CANDIDATES or len(set(candidate_ids)) != EXPECTED_CANDIDATES or not all(map(valid_id, candidate_ids)):
        issue.append("candidate roster must contain 805 unique IDs from the preserved sources")
    if not isinstance(ledger, dict):
        return {"ready_for_receipt_review": False, "components_with_receipts": 0, "blockers": [*issue, "ledger must be an object"]}
    rows = ledger.get("components")
    build, commit = ledger.get("build"), ledger.get("commit")
    if not named(build) or not isinstance(commit, str) or not SHA.fullmatch(commit):
        issue.append("supply exact candidate build and source commit")
    if not named(ledger.get("scope_approval")):
        issue.append("supply the owner-approved scope record")
    if not isinstance(rows, list) or len(rows) != EXPECTED_COMPONENTS:
        issue.append("ledger must contain exactly 804 canonical components")
        rows = rows if isinstance(rows, list) else []

    canonical, candidate_uses, verified = [], [], 0
    for index, item in enumerate(rows, 1):
        if not isinstance(item, dict) or not valid_id(item.get("id")):
            issue.append(f"row {index}: invalid component ID")
            continue
        cid = item["id"]
        canonical.append(cid)
        sources = item.get("candidate_ids")
        if not isinstance(sources, list) or not sources or not all(map(valid_id, sources)) or len(set(sources)) != len(sources):
            issue.append(f"{cid}: missing or duplicated candidate attribution")
        else:
            candidate_uses.extend(sources)
            if cid not in sources:
                issue.append(f"{cid}: canonical ID must retain a source ID")
            if len(sources) > 1 and (not named(item.get("consolidation_reason")) or not named(item.get("consolidation_approval"))):
                issue.append(f"{cid}: consolidation lacks reason or row-level approval")
        if not named(item.get("owner")) or not named(item.get("completion_task")):
            issue.append(f"{cid}: missing accountable owner or completion task")
        expected_lanes, receipts = item.get("verification_lanes"), item.get("receipts")
        if not isinstance(expected_lanes, list) or not expected_lanes or not all(isinstance(x, str) and x in LANES for x in expected_lanes) or len(set(expected_lanes)) != len(expected_lanes):
            issue.append(f"{cid}: missing or invalid verification lanes")
            continue
        actual = set()
        for receipt in receipts if isinstance(receipts, list) else []:
            if not isinstance(receipt, dict):
                continue
            lane = receipt.get("lane")
            if (isinstance(lane, str) and lane in LANES and receipt.get("kind") == "runtime"
                and receipt.get("result") == "pass" and receipt.get("build") == build
                and receipt.get("commit") == commit and valid_id(receipt.get("component_id"))
                and receipt.get("component_id") == cid and named(receipt.get("verified_by"))
                and named(receipt.get("evidence_ref")) and named(receipt.get("observed"))):
                actual.add(lane)
        missing = sorted(set(expected_lanes) - actual)
        if missing:
            issue.append(f"{cid}: missing same-build runtime receipt for {', '.join(missing)}")
        else:
            verified += 1

    if len(set(canonical)) != len(canonical):
        issue.append("duplicate canonical component IDs")
    if Counter(candidate_uses) != Counter(candidate_ids):
        issue.append("attribution must retain each original candidate exactly once")
    return {"ready_for_receipt_review": not issue, "components_with_receipts": verified, "blockers": issue}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate_csv", type=Path, help="Preserved 805-row CSV, not an inferred replacement")
    parser.add_argument("review_ledger", type=Path, help="Owner-approved canonical mapping and reviewed receipts")
    args = parser.parse_args()
    try:
        with args.candidate_csv.open(encoding="utf-8-sig", newline="") as file:
            ids = [row["Candidate ID"] for row in csv.DictReader(file)]
        result = validate(ids, json.loads(args.review_ledger.read_text()))
    except (OSError, ValueError, KeyError) as exc:
        print(f"Could not validate release records: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result["ready_for_receipt_review"] else 1


if __name__ == "__main__":
    sys.exit(main())
