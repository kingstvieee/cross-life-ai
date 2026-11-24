import unittest
from backend.guardian_tool_router import GuardianToolRouter, ToolSpec

class ToolRouterTests(unittest.TestCase):
    def test_scope_and_approval_are_fail_closed(self):
        calls=[]
        router=GuardianToolRouter()
        router.register(ToolSpec('mail.send','mail.write',read_only=False,requires_approval=True),lambda args:calls.append(args) or {'id':'x'})
        denied=router.dispatch(request_id='r1',actor_id='u1',tool='mail.send',scopes=set(),arguments={})
        self.assertEqual(denied['reason'],'scope_denied')
        approval=router.dispatch(request_id='r2',actor_id='u1',tool='mail.send',scopes={'mail.write'},arguments={})
        self.assertEqual(approval['reason'],'approval_required')
        self.assertEqual(calls,[])
        verified=router.dispatch(request_id='r3',actor_id='u1',tool='mail.send',scopes={'mail.write'},arguments={'to':'a'},approved=True,readback=lambda x:x['id']=='x')
        self.assertEqual(verified['status'],'verified')
        self.assertEqual(len(calls),1)
        self.assertEqual(router.dispatch(request_id='r3',actor_id='u1',tool='mail.send',scopes={'mail.write'},arguments={'to':'a'},approved=True)['status'],'verified')
        self.assertEqual(len(calls),1)
    def test_unverified_without_readback(self):
        router=GuardianToolRouter()
        router.register(ToolSpec('files.read','files.read'),lambda _: {'ok':True})
        receipt=router.dispatch(request_id='r',actor_id='u',tool='files.read',scopes={'files.read'},arguments={})
        self.assertEqual(receipt['status'],'provider_reported')
        self.assertFalse(receipt['verified'])
    def test_conflicting_replay_fails(self):
        router=GuardianToolRouter()
        router.dispatch(request_id='r',actor_id='u',tool='missing',scopes=set(),arguments={})
        with self.assertRaises(ValueError):
            router.dispatch(request_id='r',actor_id='u',tool='missing',scopes=set(),arguments={'x':1})
