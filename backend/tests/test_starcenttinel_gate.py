"""Fail-closed security tests. No live provider calls."""
import pytest
from fastapi import HTTPException
from starcenttinel_gate import require_sentinel_admission

class Collection:
    def __init__(self, value=None, fail=False):
        self.value, self.fail = value, fail
    async def find_one(self, query):
        if self.fail:
            raise RuntimeError("database offline")
        return self.value

class DB:
    def __init__(self, value=None, fail=False):
        self.starcenttinel_policy = Collection(value, fail)

@pytest.mark.asyncio
@pytest.mark.parametrize("policy", [
    None,
    {"mode": "NORMAL"},
    {"mode": "NORMAL", "independent_enforcement_verified": True},
    {"mode": "LOCKDOWN", "independent_enforcement_verified": True},
    {"mode": "NORMAL", "independent_enforcement_verified": True,
     "signature": "forged", "scope": ["dispatch"]},
])
@pytest.mark.parametrize("operation", ["dispatch", "send-admission"])
async def test_guardian_local_policy_never_grants_access(policy, operation):
    with pytest.raises(HTTPException) as exc:
        await require_sentinel_admission(DB(policy), user_id="owner", operation=operation)
    assert exc.value.status_code == 423
    assert exc.value.detail == "sentinel_independent_capability_required"

@pytest.mark.asyncio
async def test_database_outage_cannot_enable_dispatch():
    with pytest.raises(HTTPException) as exc:
        await require_sentinel_admission(DB(fail=True), user_id="owner", operation="dispatch")
    assert exc.value.status_code == 423

@pytest.mark.asyncio
@pytest.mark.parametrize("operation", ["admin.recover", "policy.update", "provider.revoke", ""])
async def test_unsupported_operations_denied(operation):
    with pytest.raises(HTTPException) as exc:
        await require_sentinel_admission(DB({"mode": "NORMAL"}), user_id="owner", operation=operation)
    assert exc.value.status_code == 403
