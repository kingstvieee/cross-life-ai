"""Guardian independent verification gate.

Verification is intentionally separate from mission execution. Only explicitly
registered verifier functions can issue a completion decision; workers cannot
self-attest by simply setting a flag. The caller must authenticate verifier
identity and maintain a tamper-evident audit record outside this module.
"""
from datetime import datetime, timezone
from hashlib import sha256
import json

from guardian_mission_engine import transition


def canonical_digest(value):
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return sha256(payload.encode("utf-8")).hexdigest()


class VerificationRejected(RuntimeError):
    pass


class GuardianVerifier:
    def __init__(self, collection, verifiers):
        self.collection = collection
        self.verifiers = dict(verifiers)

    async def verify(self, *, mission, verifier_name, verifier_identity):
        if not verifier_identity or verifier_identity == mission.get("worker_id"):
            raise VerificationRejected("Verifier must be authenticated and independent")
        if mission.get("status") != "verifying":
            raise VerificationRejected("Mission is not awaiting verification")
        token = mission.get("lease_token")
        if not token:
            raise VerificationRejected("Verification requires an active lease")
        check = self.verifiers.get(verifier_name)
        if check is None:
            raise VerificationRejected("Verifier not registered")
        outcome = await check(mission)
        if type(outcome) is not bool:
            raise VerificationRejected("Verifier must return an explicit boolean")
        evidence = {
            "verifier": "independent",
            "verifier_identity": verifier_identity,
            "passed": outcome,
            "mission_id": mission["mission_id"],
            "result_digest": canonical_digest(mission.get("checkpoint")),
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
        if not outcome:
            await transition(
                self.collection, owner_id=mission["owner_id"],
                mission_id=mission["mission_id"], expected="verifying",
                target="blocked", lease_token=token,
                checkpoint={"verification_failed": True, "evidence": evidence},
            )
            return evidence
        await transition(
            self.collection, owner_id=mission["owner_id"],
            mission_id=mission["mission_id"], expected="verifying",
            target="completed", lease_token=token, evidence=evidence,
        )
        return evidence
