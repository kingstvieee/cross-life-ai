import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("receipts", Path(__file__).with_name("check-staar-component-receipts.py"))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


def fixture(*, build="fabricated-test-candidate", commit="a" * 40):
    ids = sorted(checker.CANDIDATE_IDS)
    rows = []
    for cid in ids:
        def receipt(lane, criterion=None):
            data = {"lane": lane, "kind": "runtime", "result": "pass", "build": build,
                    "commit": commit, "component_id": cid, "verified_by": "fixture reviewer",
                    "evidence_ref": f"fixture/{cid}/{criterion}/{lane}", "observed": "fixture result"}
            if criterion is not None:
                data["criterion_id"] = criterion
            return data

        row = {"id": cid, "candidate_ids": [cid], "owner": "fixture owner", "completion_task": "fixture task"}
        if cid in checker.PRODUCT_MINIMUM_LANES:
            product, staging = f"{cid}-PRODUCT", f"{cid}-STAGING-CLOSEOUT"
            pairs = {product: sorted(checker.PRODUCT_MINIMUM_LANES[cid]), staging: ["api"]}
            row["verification_lanes"] = sorted(set().union(*pairs.values()))
            row["verification_criteria"] = [{"id": alias, "verification_lanes": lanes}
                                            for alias, lanes in pairs.items()]
            row["receipts"] = [receipt(lane, alias) for alias, lanes in pairs.items() for lane in lanes]
        else:
            row.update(verification_lanes=["app"], receipts=[receipt("app")])
        rows.append(row)
    return ids, {"scope_approval": "fixture scoped decision", "commit": commit, "build": build, "components": rows}


def find(ledger, key):
    return next(row for row in ledger["components"] if row["id"] == key)


class Checks(unittest.TestCase):
    def test_full_synthetic_roster_is_structurally_reviewable(self):
        result = checker.validate(*fixture())
        self.assertTrue(result["ready_for_receipt_review"], result["blockers"])
        self.assertEqual(result["components_with_receipts"], 805)

    def test_804_rows_and_old_approved_consolidation_fail(self):
        ids, ledger = fixture()
        removed = ledger["components"].pop()
        first = ledger["components"][0]
        first["candidate_ids"].append(removed["id"])
        first.update(consolidation_reason="old overlap", consolidation_approval="old approval")
        blockers = checker.validate(ids, ledger)["blockers"]
        self.assertIn("ledger must contain exactly 805 canonical components", blockers)
        self.assertTrue(any("without consolidation" in reason for reason in blockers))
        self.assertTrue(any("each original candidate" in reason for reason in blockers))

    def test_fixed_roster_rejects_swapping_or_duplicate_ids_at_same_count(self):
        ids, ledger = fixture()
        original = ids.index("SH-751")
        for invalid in ("invented-761", "SH-752", []):
            with self.subTest(invalid=invalid):
                invalid_roster = copy.copy(ids)
                invalid_roster[original] = invalid
                blockers = checker.validate(invalid_roster, ledger)["blockers"]
                self.assertTrue(any("805 exact preserved source IDs" in reason for reason in blockers))

    def test_duplicate_rows_do_not_inflate_verified_count(self):
        ids, ledger = fixture()
        ledger["components"][-1] = copy.deepcopy(ledger["components"][0])
        result = checker.validate(ids, ledger)
        self.assertEqual(result["components_with_receipts"], 803)
        self.assertIn("duplicate canonical component IDs", result["blockers"])

    def test_old_build_mock_and_missing_hardware_fail(self):
        ids, ledger = fixture()
        rows = ledger["components"]
        rows[0]["receipts"][0]["build"] = "older"
        rows[1]["receipts"][0]["kind"] = "mock"
        rows[2]["verification_lanes"].append("hardware")
        result = checker.validate(ids, ledger)
        self.assertEqual(result["components_with_receipts"], 802)
        self.assertFalse(result["ready_for_receipt_review"])

    def test_receipts_must_be_attributed_to_the_same_component(self):
        ids, ledger = fixture()
        ledger["components"][1]["receipts"] = ledger["components"][0]["receipts"]
        self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])

    def test_each_of_seven_rows_requires_both_distinct_receipt_keys(self):
        for i in range(751, 758):
            for suffix in ("PRODUCT", "STAGING-CLOSEOUT"):
                cid = f"SH-{i}"
                criterion = f"{cid}-{suffix}"
                with self.subTest(criterion=criterion):
                    ids, ledger = fixture()
                    row = find(ledger, cid)
                    row["receipts"] = [r for r in row["receipts"] if r["criterion_id"] != criterion]
                    result = checker.validate(ids, ledger)
                    self.assertFalse(result["ready_for_receipt_review"])
                    self.assertEqual(result["components_with_receipts"], 804)
                    self.assertTrue(any(line.startswith(criterion + "/") for line in result["blockers"]))

    def test_same_api_lane_on_both_meanings_is_not_interchangeable(self):
        for generic in (True, False):
            ids, ledger = fixture()
            row = find(ledger, "SH-754")
            staging = row["receipts"][-1]
            if generic:
                staging.pop("criterion_id")
            else:
                staging["criterion_id"] = "SH-754-PRODUCT"
            self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])

    def test_minimum_product_provider_lane_cannot_be_dropped(self):
        ids, ledger = fixture()
        row = find(ledger, "SH-755")
        row["verification_lanes"].remove("provider")
        row["verification_criteria"][0]["verification_lanes"].remove("provider")
        row["receipts"] = [r for r in row["receipts"] if r["lane"] != "provider"]
        self.assertIn("SH-755-PRODUCT: required verification lanes missing: device, provider",
                      checker.validate(ids, ledger)["blockers"])

    def test_parent_lanes_cannot_be_dropped_or_added_without_criterion(self):
        ids, ledger = fixture()
        row = find(ledger, "SH-751")
        row["verification_lanes"].remove("device")
        self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])
        row["verification_lanes"] = ["api", "device", "hardware"]
        self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])

    def test_missing_or_substituted_alias_declaration_does_not_pass(self):
        for variant in ("remove", "fake", "dup"):
            ids, ledger = fixture()
            row = find(ledger, "SH-751")
            if variant == "remove":
                row.pop("verification_criteria")
            else:
                declared = row["verification_criteria"]
                declared[0]["id"] = "custom" if variant == "fake" else declared[1]["id"]
            self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])

    def test_alias_evidence_cannot_be_reused_between_meanings(self):
        ids, ledger = fixture()
        product, staging = find(ledger, "SH-754")["receipts"]
        staging["evidence_ref"] = " " + product["evidence_ref"]
        self.assertIn("SH-754: product and staging closeout require distinct evidence references",
                      checker.validate(ids, ledger)["blockers"])

    def test_criterion_receipts_reject_wrong_commit_old_build_or_fixture(self):
        for field, value in (("commit", "b" * 40), ("build", "old"), ("kind", "fixture")):
            ids, ledger = fixture()
            target = find(ledger, "SH-753")["receipts"][0]
            target[field] = value
            self.assertIn("SH-753-PRODUCT/device: requires one unambiguous same-build runtime receipt",
                          checker.validate(ids, ledger)["blockers"])

    def test_failing_or_duplicate_same_build_receipt_cannot_be_masked(self):
        for cid in ("SH-005", "SH-751"):
            for verdict in ("fail", "pass"):
                ids, ledger = fixture()
                row = find(ledger, cid)
                row["receipts"].append({**row["receipts"][0], "result": verdict})
                self.assertFalse(checker.validate(ids, ledger)["ready_for_receipt_review"])


if __name__ == "__main__":
    unittest.main()
