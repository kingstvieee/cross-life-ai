"""Contract tests for durable Guardian admission; no provider calls."""
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from backend.guardian_durable_admission import DurableAdmission


class DurableAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "guardian.sqlite3"
        self.store = DurableAdmission(self.path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_restart_does_not_replay(self):
        first = self.store.claim(request_id="req-1", actor="user-1", tool="files.read", arguments={"id": 1})
        self.assertTrue(first["claimed"])
        second = DurableAdmission(self.path).claim(
            request_id="req-1", actor="user-1", tool="files.read", arguments={"id": 1})
        self.assertFalse(second["claimed"])
        self.assertEqual(second["state"], "claimed")

    def test_request_id_collision_rejected(self):
        self.store.claim(request_id="req-1", actor="user-1", tool="files.read", arguments={"id": 1})
        with self.assertRaises(ValueError):
            self.store.claim(request_id="req-1", actor="user-1", tool="files.read", arguments={"id": 2})

    def test_approval_required_and_single_use(self):
        args = {"to": "example@example.com"}
        expiry = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        with self.assertRaises(PermissionError):
            self.store.claim(request_id="req-1", actor="user-1", tool="mail.send",
                             arguments=args, requires_approval=True)
        self.store.grant(approval_id="approval-1", actor="user-1", tool="mail.send",
                         arguments=args, expires_at=expiry)
        self.assertTrue(self.store.claim(request_id="req-1", actor="user-1", tool="mail.send",
                         arguments=args, approval_id="approval-1", requires_approval=True)["claimed"])
        with self.assertRaises(PermissionError):
            self.store.claim(request_id="req-2", actor="user-1", tool="mail.send",
                             arguments=args, approval_id="approval-1", requires_approval=True)

    def test_approval_cannot_change_actor_or_payload(self):
        expiry = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        self.store.grant(approval_id="approval-1", actor="user-1", tool="mail.send",
                         arguments={"to": "a"}, expires_at=expiry)
        for actor, args in (("user-2", {"to": "a"}), ("user-1", {"to": "b"})):
            with self.assertRaises(PermissionError):
                self.store.claim(request_id="req-" + actor + args["to"], actor=actor,
                                 tool="mail.send", arguments=args, approval_id="approval-1",
                                 requires_approval=True)

    def test_receipt_survives_restart(self):
        self.store.claim(request_id="req-1", actor="user-1", tool="files.read", arguments={})
        self.store.finish(request_id="req-1", receipt={"status": "verified", "readback": True})
        result = DurableAdmission(self.path).get("req-1")
        self.assertEqual(result["state"], "verified")
        self.assertTrue(result["receipt"]["readback"])


if __name__ == "__main__":
    unittest.main()
