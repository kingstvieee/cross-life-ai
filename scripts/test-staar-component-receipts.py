import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("receipts", Path(__file__).with_name("check-staar-component-receipts.py"))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


def fixture():
    ids = [f"test-{i}" for i in range(805)]
    commit = "a" * 40
    build = "fabricated-test-candidate"
    rows = [
        {"id": cid, "candidate_ids": [cid], "owner": "fixture owner", "completion_task": "fixture task",
         "verification_lanes": ["app"], "receipts": [
             {"lane": "app", "kind": "runtime", "result": "pass", "build": build, "commit": commit,
              "component_id": cid, "verified_by": "fixture reviewer", "evidence_ref": "fixture proof",
              "observed": "fixture result"}]}
        for cid in ids[:-1]
    ]
    rows[0]["candidate_ids"].append(ids[-1])
    rows[0].update(consolidation_reason="fixture overlap", consolidation_approval="fixture approval")
    return ids, {"scope_approval": "fixture scoped decision", "commit": commit, "build": build, "components": rows}


class Checks(unittest.TestCase):
    def test_full_synthetic_roster_is_structurally_reviewable(self):
        result = checker.validate(*fixture())
        self.assertTrue(result["ready_for_receipt_review"])
        self.assertEqual(result["components_with_receipts"], 804)

    def test_unapproved_consolidation_and_dropped_id_fail(self):
        ids, ledger = fixture()
        ledger["components"][0].pop("consolidation_approval")
        self.assertTrue(any("consolidation" in reason for reason in checker.validate(ids, ledger)["blockers"]))
        ledger["components"][0]["candidate_ids"].pop()
        self.assertTrue(any("each original candidate" in reason for reason in checker.validate(ids, ledger)["blockers"]))

    def test_old_build_mock_and_missing_hardware_fail(self):
        ids, ledger = fixture()
        rows = ledger["components"]
        rows[0]["receipts"][0]["build"] = "older"
        rows[1]["receipts"][0]["kind"] = "mock"
        rows[2]["verification_lanes"].append("hardware")
        result = checker.validate(ids, ledger)
        self.assertEqual(result["components_with_receipts"], 801)
        self.assertFalse(result["ready_for_receipt_review"])

    def test_receipts_must_be_attributed_to_the_same_component(self):
        ids, ledger = fixture()
        ledger["components"][1]["receipts"] = ledger["components"][0]["receipts"]
        self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])

if __name__ == "__main__":
    unittest.main()
