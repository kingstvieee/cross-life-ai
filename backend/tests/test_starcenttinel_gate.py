"""No live provider calls. Run: python -m pytest backend/tests/test_starcenttinel_gate.py"""
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
async def test_missing_policy_denies():
    with pytest.raises(HTTPException) as e:
        await require_sentinel_admission(DB(), user_id="owner", operation="dispatch")
    assert e.value.status_code == 423

@pytest.mark.asyncio
async def test_unverified_policy_denies():
    with pytest.raises(HTTPException) as e:
        await require_sentinel_admission(DB({"mode":"NORMAL"}), user_id="owner", operation="dispatch")
    assert e.value.status_code == 423

@pytest.mark.asyncio
async def test_containment_denies():
    with pytest.raises(HTTPException) as e:
        await require_sentinel_admission(DB({"mode":"LOCKDOWN","independent_enforcement_verified":True}), user_id="owner", operation="dispatch")
    assert e.value.status_code == 423

@pytest.mark.asyncio
async def test_database_outage_denies():
    with pytest.raises(HTTPException) as e:
        await require_sentinel_admission(DB(fail=True), user_id="owner", operation="dispatch")
    assert e.value.status_code == 503

@pytest.mark.asyncio
async def test_verified_normal_allows_only_admission_operations():
    db=DB({"mode":"NORMAL","independent_enforcement_verified":True})
    await require_sentinel_admission(db,user_id="owner",operation="dispatch")
    await require_sentinel_admission(db,user_id="owner",operation="send-admission")
    with pytest.raises(HTTPException) as e:
        await require_sentinel_admission(db,user_id="owner",operation="admin.recover")
    assert e.value.status_code == 403
