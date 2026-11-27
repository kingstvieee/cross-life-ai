import copy
import unittest
from importlib import import_module

gate = import_module("check-staar-internal-candidate")


def fixture():
    build = {"app_id": gate.APP_ID, "build": "123", "version": "1.0.4", "commit": "a"*40}
    keys = [f"C{i}" for i in range(805)]
    rows = [{"id":k, "candidate_ids":[k], "owner":"Maintainer", "completion_task":"Exercise and read back",
             "verification_lanes":["app"], "receipts":[{**build, "kind":"runtime", "result":"pass",
             "lane":"app", "component_id":k, "verified_by":"QA", "evidence_ref":f"receipt/{k}",
             "observed":"Readback matched"}]} for k in keys[:-1]]
    rows[-1].update(candidate_ids=[keys[-2], keys[-1]], consolidation_reason="Same legacy behavior",
                    consolidation_approval="Fixture owner record")
    ledger = {**build, "scope_approval":"Fixture scope review", "components":rows}
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
        self.assertEqual(result["component_review"]["components_with_receipts"], 804)

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
