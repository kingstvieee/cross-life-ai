import copy
import unittest
from importlib import import_module

gate = import_module("check-staar-internal-candidate")
component_fixture = import_module("test-staar-component-receipts").fixture


def fixture():
    build = {"app_id": gate.APP_ID, "build": "123", "version": "1.0.4", "commit": "a"*40}
    keys, ledger = component_fixture(build=build["build"], commit=build["commit"])
    ledger.update(build)
    inventory = {**build, "reviewed_by":"QA", "evidence_ref":"review/controls",
                 "portals":{k:["primary"] for k in gate.WORLDS}}
    cases = [(lane, c) for lane, steps in gate.CASES.items() for c in steps]
    for portal, variants in gate.WORLDS.items():
        cases += [("portal", f"{portal}/{v}/art-navigation-animation") for v in variants]
        cases += [("action", f"{portal}/primary")]
    acceptance = {**build, "channel":"internal-testflight", "receipts":[{**build, "kind":"runtime",
        "lane":lane, "case":case, "result":"pass", "verified_by":"QA", "evidence_ref":f"qa/{lane}/{case}",
        "observed":"Runtime fixture"} for lane,case in cases]}
    return keys, ledger, inventory, acceptance


class CandidateTests(unittest.TestCase):
    def test_complete_fixture_is_eligible_for_review_only(self):
        result = gate.check(*fixture())
        self.assertTrue(result["eligible_for_evidence_review"], result["blockers"])
        self.assertEqual(result["component_review"]["components_with_receipts"], 805)

    def test_incomplete_dual_component_blocks_whole_candidate(self):
        keys, ledger, inventory, acceptance = fixture()
        row = next(row for row in ledger["components"] if row["id"] == "SH-755")
        row["receipts"] = [receipt for receipt in row["receipts"]
                           if receipt["criterion_id"] != "SH-755-STAGING-CLOSEOUT"]
        result = gate.check(keys, ledger, inventory, acceptance)
        self.assertFalse(result["eligible_for_evidence_review"])
        self.assertIn("805-component evidence is incomplete", result["blockers"])
        self.assertIn("SH-755-STAGING-CLOSEOUT/api: requires one unambiguous same-build runtime receipt",
                      result["component_review"]["blockers"])

    def test_old_art_or_mock_or_wrong_build_fail(self):
        keys, ledger, inventory, acceptance = fixture()
        for case in ("diggitstaar/studio/art-navigation-animation", "guardian-audible-welcome", "apple"):
            with self.subTest(case=case):
                attempt = copy.deepcopy(acceptance)
                row = next(r for r in attempt["receipts"] if r["case"] == case)
                row["kind"] = "fixture" if case == "apple" else "runtime"
                row["build"] = "122" if case != "apple" else "123"
                self.assertFalse(gate.check(keys, ledger, inventory, attempt)["eligible_for_evidence_review"])

    def test_unlisted_visible_action_and_missing_tenth_world_fail(self):
        keys, ledger, inventory, acceptance = fixture()
        inventory["portals"]["work"].append("missing-visible-action")
        del inventory["portals"]["diggitstaar"]
        blockers = gate.check(keys, ledger, inventory, acceptance)["blockers"]
        self.assertIn("action/work/missing-visible-action: requires one unambiguous same-build runtime receipt", blockers)
        self.assertIn("diggitstaar: no unique, nonempty action list", blockers)

    def test_same_build_failure_cannot_be_masked_by_a_pass(self):
        keys, ledger, inventory, acceptance = fixture()
        acceptance["receipts"].append({**acceptance["receipts"][0], "result":"fail"})
        self.assertFalse(gate.check(keys, ledger, inventory, acceptance)["eligible_for_evidence_review"])

    def test_duplicate_receipt_and_stale_scope_fail(self):
        keys, ledger, inventory, acceptance = fixture()
        acceptance["receipts"].append(acceptance["receipts"][0])
        ledger["commit"] = "b"*40
        result = gate.check(keys, ledger, inventory, acceptance)
        self.assertIn("component receipts are not tied to this exact candidate", result["blockers"])
        self.assertFalse(result["eligible_for_evidence_review"])


if __name__ == "__main__":
    unittest.main()
