"""Build 218: live security-plane readiness must fail closed under any missing proof."""
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from starcenttinel_gate import (HEALTH_HOST, HEALTH_PATH, allowed_health_url,
                                inspect_independent_control_plane)

URL = "https://" + HEALTH_HOST + HEALTH_PATH
KEY = "k" * 64
TOKEN = "jwt-private-test-not-a-real-secret"
CONFIG = {
    "STARCENTTINEL_HEALTH_URL": URL,
    "STARCENTTINEL_HEALTH_JWT": TOKEN,
    "STARCENTTINEL_PROOF_KEY": KEY,
}

def make_client(*, active=False, tamper=False, stale=False, missing_signature=False):
    def handler(req):
        nonce = req.headers.get("X-StarCenttinel-Nonce", "")
        assert req.headers["Authorization"] == "Bearer " + TOKEN
        payload = {
            "service": "starcenttinel-security-control",
            "nonce": nonce,
            "issued_at": (datetime.now(timezone.utc)-timedelta(minutes=5 if stale else 0)).isoformat(),
            "state": "ENFORCING" if active else "LOCKDOWN",
            "ready_for_live_actions": active,
            "external_authority_verified": active,
            "owner_webauthn_verified": active,
            "provider_revocation_verified": active,
            "portal_enforcement_count": 9 if active else 0,
            "revision": 1 if active else 0,
        }
        data = json.dumps(payload,sort_keys=True).encode()
        signature = hmac.new(KEY.encode(),nonce.encode()+b"\n"+data,hashlib.sha256).hexdigest()
        return httpx.Response(200,content=data,
            headers={"X-StarCenttinel-Proof":
                "sha256="+("0"*64 if tamper else signature) if not missing_signature else ""})
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))

def test_bad_endpoint_is_rejected_before_connecting():
    assert allowed_health_url(URL)
    for url in [
      "http://"+HEALTH_HOST+HEALTH_PATH,
      "https://evil.example/functions/v1/sentinel-control/health",
      URL+"?target=evil",
      URL.replace("health","revoke"),
      "https://"+HEALTH_HOST+".evil.example"+HEALTH_PATH,
    ]: assert not allowed_health_url(url)

@pytest.mark.asyncio
async def test_live_sentinel_cannot_be_declared_active_from_unsigned_or_lockdown_response():
    assert not (await inspect_independent_control_plane(environ={})).get("ready")
    for kw in [{},{'tamper':True},{'stale':True},{'missing_signature':True}]:
        async with make_client(**kw) as client:
            result=await inspect_independent_control_plane(client=client,environ=CONFIG,
                nonce="a"*48)
            assert result['ready'] is False
            assert result['mode']=="LOCKDOWN"

@pytest.mark.asyncio
async def test_only_real_fresh_owner_bound_server_attestation_unlocks_readback():
    async with make_client(active=True) as client:
        result=await inspect_independent_control_plane(client=client,environ=CONFIG,
            nonce="b"*48)
    assert result["ready"] is True
    assert result["revision"]==1
    assert result["external_authority_verified"] is True

@pytest.mark.asyncio
async def test_no_owner_bearer_or_hmac_key_never_unblocks_service():
    for key in ("STARCENTTINEL_HEALTH_JWT","STARCENTTINEL_PROOF_KEY"):
        partial={k:v for k,v in CONFIG.items() if k!=key}
        result=await inspect_independent_control_plane(environ=partial)
        assert result["ready"] is False
