import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.guardian_durable_admission import DurableAdmission
from backend.guardian_durable_executor import DurableGuardianExecutor
from backend.guardian_tool_router import GuardianToolRouter, ToolSpec


class DurableExecutorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = DurableAdmission(Path(self.tmp.name) / "receipts.sqlite")
        self.router = GuardianToolRouter()
        self.calls = []
        self.router.register(
            ToolSpec("mail.send", "mail.write", read_only=False, requires_approval=True),
            lambda args: self.calls.append(args) or {"id": "sent-1"})
        self.executor = DurableGuardianExecutor(self.router, self.store)

    def tearDown(self):
        self.tmp.cleanup()

    def test_no_approval_no_side_effect(self):
        with self.assertRaises(PermissionError):
            self.executor.execute(session_actor="u1", session_scopes={"mail.write"},
                                  request_id="r1", tool="mail.send", arguments={"to": "a"})
        self.assertEqual(self.calls, [])

    def test_single_approved_execution_and_restart_readback(self):
        args = {"to": "a"}
        expiry = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        self.store.grant(approval_id="a1", actor="u1", tool="mail.send",
                         arguments=args, expires_at=expiry)
        kwargs = dict(session_actor="u1", session_scopes={"mail.write"},
                      request_id="r1", tool="mail.send", arguments=args, approval_id="a1")
        result = self.executor.execute(**kwargs, readback=lambda outcome: outcome["id"] == "sent-1")
        self.assertEqual(result["status"], "verified")
        restarted = DurableGuardianExecutor(GuardianToolRouter(), DurableAdmission(self.store.path))
        self.assertEqual(self.executor.execute(**kwargs)["status"], "verified")
        self.assertEqual(len(self.calls), 1)

    def test_provider_ack_without_readback_not_verified(self):
        args = {"to": "a"}
        expiry = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        self.store.grant(approval_id="a1", actor="u1", tool="mail.send",
                         arguments=args, expires_at=expiry)
        result = self.executor.execute(session_actor="u1", session_scopes={"mail.write"},
                      request_id="r1", tool="mail.send", arguments=args, approval_id="a1")
        self.assertEqual(result["status"], "unknown")
        self.assertFalse(result["verified"])

    def test_write_timeout_remains_unknown_without_replaying(self):
        def timeout_after_possible_write(arguments):
            self.calls.append(arguments)
            raise TimeoutError

        self.router.register(ToolSpec("mail.update", "mail.write", False, True),
                             timeout_after_possible_write)
        args = {"message": "example"}
        expiry = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        self.store.grant(approval_id="a2", actor="u1", tool="mail.update",
                         arguments=args, expires_at=expiry)
        kwargs = dict(session_actor="u1", session_scopes={"mail.write"}, request_id="r2",
                      tool="mail.update", arguments=args, approval_id="a2")
        assert self.executor.execute(**kwargs)["status"] == "unknown"
        assert self.executor.execute(**kwargs)["reason"] == "provider_outcome_unresolved"
        assert self.calls == [args]

    def test_session_scope_denial(self):
        result = self.executor.execute(session_actor="u1", session_scopes=set(),
                      request_id="r1", tool="mail.send", arguments={})
        self.assertEqual(result["reason"], "scope_denied")
        self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
