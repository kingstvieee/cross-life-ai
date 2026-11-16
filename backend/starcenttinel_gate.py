"""Guardian admission gate: independently signed capability is required.

Until a separately operated verifier is implemented, every external action
is denied. A mutable Guardian Mongo record cannot grant security authority.
"""
from fastapi import HTTPException

ALLOWED_OPERATIONS = frozenset({"dispatch", "send-admission"})

async def require_sentinel_admission(db, *, user_id: str, operation: str) -> None:
    if operation not in ALLOWED_OPERATIONS:
        raise HTTPException(status_code=403, detail="sentinel_operation_not_allowed")
    # Deliberately ignore all Guardian-local policy fields. In particular,
    # independent_enforcement_verified=True MUST NOT unlock execution.
    # A future implementation must validate independently signed, scoped,
    # expiring, one-use authority and check revocation before dispatch.
    raise HTTPException(status_code=423, detail="sentinel_independent_capability_required")
