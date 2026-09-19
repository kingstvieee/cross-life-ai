import io,json,unittest
from contextlib import redirect_stdout
from unittest.mock import patch
import guardian_astra_eval as e
def plan():
 return {"summary":"Synthetic plan only.","actions":[{"portal":p,"task":"Propose "+p,"state":"proposed","requires_approval":True} for p in ("work","style","home","wellbeing")],"unknowns":["No live access."]}
class Tests(unittest.TestCase):
 def test_payload_safe(self):
  p=e.payload(); self.assertEqual(p["model"],"gpt-6-astra"); self.assertFalse(p["store"]); self.assertNotIn("tools",p)
 def test_dry_run_no_network(self):
  with patch.object(e.urllib.request,"urlopen") as n,redirect_stdout(io.StringIO()) as out: self.assertEqual(e.main([]),0)
  n.assert_not_called(); self.assertEqual(json.loads(out.getvalue())["network_calls"],0)
 def test_billing_gate(self):
  with self.assertRaisesRegex(ValueError,"billing"): e.live("tomorrow")
 def test_ci_gate(self):
  with patch.dict(e.os.environ,{"CI":"true"},clear=True),self.assertRaisesRegex(ValueError,"disabled_in_ci"): e.live("tomorrow",True)
 def test_key_gate(self):
  with patch.dict(e.os.environ,{},clear=True),self.assertRaisesRegex(ValueError,"key"): e.live("tomorrow",True)
 def test_contract_never_claims_execution(self):
  r=e.parse({"id":"resp_test","model":e.MODEL,"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":json.dumps(plan())}]}]},"tomorrow")
  self.assertTrue(r["contract_checks_passed"]); self.assertFalse(r["verified_execution"]); self.assertEqual(r["external_actions_performed"],[])
 def test_missing_access_blocks(self):
  p=plan()
  with self.assertRaisesRegex(ValueError,"missing_access"): e.validate(p,"missing_access")
  for a in p["actions"]: a["state"]="blocked"
  e.validate(p,"missing_access")
 def test_bad_portal_rejected(self):
  p=plan(); p["actions"][0]["portal"]="access"
  with self.assertRaises(ValueError): e.validate(p,"tomorrow")
 def test_false_approval_rejected(self):
  p=plan(); p["actions"][0]["requires_approval"]=False
  with self.assertRaises(ValueError): e.validate(p,"tomorrow")
if __name__=="__main__": unittest.main()
