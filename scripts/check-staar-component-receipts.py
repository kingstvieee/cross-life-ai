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
EXPECTED_CANDIDATES = EXPECTED_COMPONENTS = 805
# Freeze the traceable roster, not merely its length. The aliases below are
# criteria under their existing rows, not additional canonical components.
CANDIDATE_IDS = frozenset({
    *(f"SH-{i:03d}" for i in range(1, 758)),
    *(f"G32-{i:02d}" for i in range(1, 33)),
    "network-inventory", "secure-remote", "tuya-adapter", "ttlock-adapter", "tv-adapter",
    "emergency-mode", "offline-knowledge", "emergency-lighting", "power-failover",
    "offline-maps", "first-aid", "diy-safety", "archive-provenance", "construction-library",
    "materials-intelligence", "collection-story",
})
assert len(CANDIDATE_IDS) == EXPECTED_CANDIDATES

# Product requirements retain their distinct live/signed-device evidence.
# The API lane on the closeout side denotes the backend closeout runtime,
# including its CI execution for SH-757; local fixture receipts do not qualify.
PRODUCT_MINIMUM_LANES = {
    "SH-751": {"device"},
    "SH-752": {"device"},
    "SH-753": {"device"},
    "SH-754": {"api"},
    "SH-755": {"provider", "device"},
    "SH-756": {"api"},
    "SH-757": {"app", "api", "device"},
}


def named(value):
    return isinstance(value, str) and value.strip().casefold() not in BAD


def valid_id(value):
    return isinstance(value, str) and bool(ID.fullmatch(value))


def lane_set(value):
    if (not isinstance(value, list) or not value
            or not all(isinstance(x, str) and x in LANES for x in value)
            or len(set(value)) != len(value)):
        return None
    return set(value)


def required_pairs(item, component_id, parent_lanes, issue):
    if component_id not in PRODUCT_MINIMUM_LANES:
        return {(None, lane) for lane in parent_lanes}
    minimum = {
        f"{component_id}-PRODUCT": PRODUCT_MINIMUM_LANES[component_id],
        f"{component_id}-STAGING-CLOSEOUT": {"api"},
    }
    criteria = item.get("verification_criteria")
    if not isinstance(criteria, list) or len(criteria) != 2:
        issue.append(f"{component_id}: require separate PRODUCT and STAGING-CLOSEOUT criteria")
        return None
    declared = {}
    for criterion in criteria:
        alias = criterion.get("id") if isinstance(criterion, dict) else None
        if not isinstance(alias, str) or alias not in minimum or alias in declared:
            issue.append(f"{component_id}: require unique PRODUCT and STAGING-CLOSEOUT criterion IDs")
            return None
        lanes = lane_set(criterion.get("verification_lanes"))
        if lanes is None or not minimum[alias] <= lanes:
            issue.append(f"{alias}: required verification lanes missing: {', '.join(sorted(minimum[alias]))}")
            return None
        declared[alias] = lanes
    if set().union(*declared.values()) != parent_lanes:
        issue.append(f"{component_id}: row verification lanes must match the union of both criteria")
        return None
    return {(alias, lane) for alias, lanes in declared.items() for lane in lanes}


def check_receipts(receipts, pairs, component_id, build, commit, issue):
    counts, disqualifying, used_refs = Counter(), set(), {}
    for receipt in receipts if isinstance(receipts, list) else []:
        if (not isinstance(receipt, dict) or receipt.get("kind") != "runtime"
                or receipt.get("build") != build or receipt.get("commit") != commit
                or receipt.get("component_id") != component_id):
            continue
        criterion = receipt.get("criterion_id")
        lane = receipt.get("lane")
        if (criterion is not None and not isinstance(criterion, str)) or not isinstance(lane, str):
            continue
        pair = (criterion, lane)
        if pair not in pairs:
            continue
        if receipt.get("result") != "pass" or not all(named(receipt.get(key)) for key in
                                                          ("verified_by", "evidence_ref", "observed")):
            disqualifying.add(pair)
            continue
        counts[pair] += 1
        if criterion is not None:
            used_refs.setdefault(receipt["evidence_ref"].strip(), set()).add(criterion)
    for criterion, lane in sorted(pairs):
        pair = (criterion, lane)
        if counts[pair] != 1 or pair in disqualifying:
            label = component_id if criterion is None else criterion
            issue.append(f"{label}/{lane}: requires one unambiguous same-build runtime receipt")
    if any(len(criteria) > 1 for criteria in used_refs.values()):
        issue.append(f"{component_id}: product and staging closeout require distinct evidence references")


def validate(candidate_ids, ledger):
    issue = []
    if not isinstance(candidate_ids, (list, tuple)) or not all(map(valid_id, candidate_ids)):
        issue.append("candidate roster must contain the 805 exact preserved source IDs, once each")
    elif len(candidate_ids) != EXPECTED_CANDIDATES or set(candidate_ids) != CANDIDATE_IDS:
        issue.append("candidate roster must contain the 805 exact preserved source IDs, once each")
    if not isinstance(ledger, dict):
        return {"ready_for_receipt_review": False, "components_with_receipts": 0, "blockers": [*issue, "ledger must be an object"]}
    rows = ledger.get("components")
    build, commit = ledger.get("build"), ledger.get("commit")
    valid_build = named(build) and isinstance(commit, str) and bool(SHA.fullmatch(commit))
    if not valid_build:
        issue.append("supply exact candidate build and source commit")
    if not named(ledger.get("scope_approval")):
        issue.append("supply the owner-approved scope record")
    if not isinstance(rows, list) or len(rows) != EXPECTED_COMPONENTS:
        issue.append(f"ledger must contain exactly {EXPECTED_COMPONENTS} canonical components")
        rows = rows if isinstance(rows, list) else []

    canonical, verified = [], set()
    for index, item in enumerate(rows, 1):
        if not isinstance(item, dict) or not valid_id(item.get("id")):
            issue.append(f"row {index}: invalid component ID")
            continue
        start = len(issue)
        cid = item["id"]
        canonical.append(cid)
        if item.get("candidate_ids") != [cid]:
            issue.append(f"{cid}: 805 scope requires one-to-one candidate attribution without consolidation")
        if not named(item.get("owner")) or not named(item.get("completion_task")):
            issue.append(f"{cid}: missing accountable owner or completion task")
        expected_lanes = lane_set(item.get("verification_lanes"))
        if expected_lanes is None:
            issue.append(f"{cid}: missing or invalid verification lanes")
            continue
        pairs = required_pairs(item, cid, expected_lanes, issue)
        if pairs is None or not valid_build:
            continue
        check_receipts(item.get("receipts"), pairs, cid, build, commit, issue)
        if cid in CANDIDATE_IDS and len(issue) == start:
            verified.add(cid)

    counts = Counter(canonical)
    if any(n > 1 for n in counts.values()):
        issue.append("duplicate canonical component IDs")
    if set(canonical) != CANDIDATE_IDS:
        issue.append("attribution must retain each original candidate exactly once")
    return {"ready_for_receipt_review": not issue,
            "components_with_receipts": sum(counts[cid] == 1 for cid in verified), "blockers": issue}


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
