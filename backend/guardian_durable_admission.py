"""Durable, fail-closed Guardian request admission. No provider execution in this module.

SQLite is a single-host development backend; use transactional shared storage for
multi-instance production. A claimed request is never automatically replayed.
"""
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


def _digest(actor, tool, args):
    return hashlib.sha256(json.dumps([actor, tool, args], sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


class DurableAdmission:
    def __init__(self, database_path):
        self.path = str(Path(database_path))
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS requests (
                request_id TEXT PRIMARY KEY, actor TEXT NOT NULL, tool TEXT NOT NULL,
                digest TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL, receipt TEXT)""")
            db.execute("""CREATE TABLE IF NOT EXISTS approvals (
                approval_id TEXT PRIMARY KEY, actor TEXT NOT NULL, tool TEXT NOT NULL,
                digest TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_request TEXT)""")

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=15, isolation_level=None)
        db.execute("PRAGMA busy_timeout=15000")
        return db

    def grant(self, *, approval_id, actor, tool, arguments, expires_at):
        """Called ONLY by trusted authenticated server approval flow, never client input."""
        if not all(isinstance(x, str) and x for x in (approval_id, actor, tool, expires_at)):
            raise ValueError("invalid_approval")
        with self._connect() as db:
            db.execute("INSERT INTO approvals VALUES (?,?,?,?,?,NULL)",
                       (approval_id, actor, tool, _digest(actor, tool, arguments), expires_at))

    def claim(self, *, request_id, actor, tool, arguments, approval_id=None,
              requires_approval=False):
        if not all(isinstance(x, str) and x for x in (request_id, actor, tool)):
            raise ValueError("invalid_request")
        digest = _digest(actor, tool, arguments)
        now = _utcnow()
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                prior = db.execute("SELECT digest,state,receipt FROM requests WHERE request_id=?",
                                   (request_id,)).fetchone()
                if prior:
                    if prior[0] != digest:
                        raise ValueError("idempotency_conflict")
                    db.execute("COMMIT")
                    return {"state": prior[1], "receipt": json.loads(prior[2]) if prior[2] else None, "claimed": False}
                if requires_approval:
                    approval = db.execute(
                        "SELECT actor,tool,digest,expires_at,consumed_request FROM approvals WHERE approval_id=?",
                        (approval_id,)).fetchone()
                    if not approval or approval[:3] != (actor, tool, digest) or approval[3] <= now or approval[4]:
                        raise PermissionError("valid_server_approval_required")
                    db.execute("UPDATE approvals SET consumed_request=? WHERE approval_id=?",
                               (request_id, approval_id))
                db.execute("INSERT INTO requests VALUES (?,?,?,?,?,?,?,NULL)",
                           (request_id, actor, tool, digest, "claimed", now, now))
                db.execute("COMMIT")
                return {"state": "claimed", "receipt": None, "claimed": True}
            except BaseException:
                db.execute("ROLLBACK")
                raise

    def finish(self, *, request_id, receipt):
        """Record a terminal result; caller must independently verify provider outcome."""
        if not isinstance(receipt, dict) or receipt.get("status") not in (
                "verified", "readback_failed", "failed", "denied", "unknown"):
            raise ValueError("invalid_terminal_receipt")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                row = db.execute("SELECT state FROM requests WHERE request_id=?", (request_id,)).fetchone()
                if not row or row[0] != "claimed":
                    raise ValueError("request_not_claimed")
                db.execute("UPDATE requests SET state=?,receipt=?,updated_at=? WHERE request_id=?",
                           (receipt["status"], json.dumps(receipt, sort_keys=True), _utcnow(), request_id))
                db.execute("COMMIT")
            except BaseException:
                db.execute("ROLLBACK")
                raise

    def get(self, request_id):
        with self._connect() as db:
            row = db.execute("SELECT state,receipt FROM requests WHERE request_id=?", (request_id,)).fetchone()
        return None if row is None else {"state": row[0], "receipt": json.loads(row[1]) if row[1] else None}
