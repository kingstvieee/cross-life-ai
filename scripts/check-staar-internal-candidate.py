"""Validate exact-build internal TestFlight acceptance records without remote access.

A pass checks structure and coverage only. Reviewers must authenticate every
receipt and review the action inventory against the shipped binary.
"""
import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path
from importlib import import_module

components = import_module("check-staar-component-receipts")

APP_ID = "6834467523"
WORLDS = {
    "home": ("residence",), "work": ("command",), "creativity": ("dream",),
    "wellbeing": ("health",), "relationships": ("realm", "singles"),
    "events": ("village",), "style": ("closet",), "staarverse": ("universe",),
    "staarsonic": ("studio",), "diggitstaar": ("studio",),
}
CASES = {
    "archive": ("signed-ipa", "protected-art-sha", "watch-embedded"),
    "testflight": ("internal-group-install",),
    "device": ("cold-launch", "locked-home", "guest-read-only", "guardian-landing",
               "guardian-audible-welcome", "guardian-lip-sync", "guardian-privacy",
               "guardian-cross-portal-voice"),
    "auth": ("apple", "google", "microsoft-outlook", "yahoo", "email"),
    "hardware": ("tuya-readback", "ttlock-authorized-status", "google-home-readback", "smart-tv-readback"),
}


def check(candidate_ids, component_ledger, inventory, acceptance):
    component_result = components.validate(candidate_ids, component_ledger)
    if not isinstance(acceptance, dict):
        return {"eligible_for_evidence_review": False, "blockers": ["candidate acceptance missing"],
                "component_review": component_result}
    commit, version, build = (acceptance.get(f) for f in ("commit", "version", "build"))
    blockers = []
    if (acceptance.get("app_id") != APP_ID or acceptance.get("channel") != "internal-testflight"
            or not isinstance(commit, str) or not components.SHA.fullmatch(commit)
            or not components.named(version)
            or not isinstance(build, str) or not build.isascii() or not build.isdecimal() or int(build) <= 122):
        blockers.append("identify an exact replacement build for the STAAR Hub internal app")
    if (not isinstance(component_ledger, dict) or component_ledger.get("commit") != commit
            or component_ledger.get("build") != build):
        blockers.append("component receipts are not tied to this exact candidate")
    if not component_result["ready_for_receipt_review"]:
        blockers.append(f"{components.EXPECTED_COMPONENTS}-component evidence is incomplete")

    def same_candidate(record):
        return (isinstance(record, dict) and record.get("app_id") == APP_ID
                and record.get("commit") == commit and record.get("build") == build
                and record.get("version") == version)

    expected = {(lane, step) for lane, steps in CASES.items() for step in steps}
    if not same_candidate(inventory) or not components.named(inventory.get("reviewed_by")) or not components.named(inventory.get("evidence_ref")):
        blockers.append("no device-reviewed action inventory for this exact candidate")
    else:
        entries = inventory.get("portals")
        if not isinstance(entries, dict) or set(entries) != set(WORLDS):
            blockers.append("the reviewed action inventory must cover the ten exact portals")
        for portal, variants in WORLDS.items():
            for variant in variants:
                expected.add(("portal", f"{portal}/{variant}/art-navigation-animation"))
            ids = entries.get(portal) if isinstance(entries, dict) else None
            if (not isinstance(ids, list) or not ids or not all(map(components.valid_id, ids))
                    or len(ids) != len(set(ids))):
                blockers.append(f"{portal}: no unique, nonempty action list")
                continue
            expected.update(("action", f"{portal}/{action}") for action in ids)

    receipts = acceptance.get("receipts")
    counts, disqualifying = Counter(), set()
    for record in receipts if isinstance(receipts, list) else []:
        if not same_candidate(record) or not all(components.named(record.get(k)) for k in ("lane", "case")):
            continue
        key = (record["lane"], record["case"])
        if record.get("kind") != "runtime":
            continue
        if record.get("result") != "pass" or not all(components.named(record.get(k)) for k in ("evidence_ref", "verified_by", "observed")):
            disqualifying.add(key)
        else:
            counts[key] += 1
    for lane, case in sorted(expected):
        if counts[(lane, case)] != 1 or (lane, case) in disqualifying:
            blockers.append(f"{lane}/{case}: requires one unambiguous same-build runtime receipt")
    return {"eligible_for_evidence_review": not blockers, "blockers": blockers,
            "expected_case_count": len(expected), "component_review": component_result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("candidate_csv", "component_ledger", "action_inventory", "acceptance"):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    try:
        with args.candidate_csv.open(encoding="utf-8-sig", newline="") as source:
            ids = [r["Candidate ID"] for r in csv.DictReader(source)]
        result = check(ids, *(json.loads(p.read_text()) for p in
                            (args.component_ledger, args.action_inventory, args.acceptance)))
    except (OSError, ValueError, KeyError) as error:
        print(f"Could not read release records: {error}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result["eligible_for_evidence_review"] else 1


if __name__ == "__main__":
    sys.exit(main())
