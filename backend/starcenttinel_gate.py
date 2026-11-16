"""Fail-closed Guardian admission gate. No endpoint in Guardian may lower containment.

This is an integration boundary, NOT an independently deployed control plane.
An external authority must write a valid signed/verified policy projection to
the database before any external dispatch is permitted. Until then deny.
"""
from fastapi import HTTPException

VALID_MODES = {"NORMAL", "CAUTION", "CONTAIN", "LOCKDOWN"}

async def require_sentinel_admission(db, *, user_id: str, operation: str) -> None:
    # Never trust request-provided mode, scopes, or approval booleans.
    try:
        record = await db.starcenttinel_policy.find_one({"user_id": user_id})
    except Exception as exc:
        raise HTTPException(status_code=503, detail="sentinel_policy_unavailable") from exc
    if not record or record.get("mode") not in VALID_MODES:
        raise HTTPException(status_code=423, detail="sentinel_unprovisioned_lockdown")
    # A local projection alone cannot establish independent authentication.
    # Fail closed unless an independent verifier has explicitly activated
    # enforcement in a future reviewed integration.
    if record.get("independent_enforcement_verified") is not True:
        raise HTTPException(status_code=423, detail="sentinel_independent_enforcement_required")
    if record["mode"] != "NORMAL":
        raise HTTPException(status_code=423, detail="sentinel_containment_active")
    if operation not in ("dispatch", "send-admission"):
        raise HTTPException(status_code=403, detail="sentinel_operation_not_allowed")
