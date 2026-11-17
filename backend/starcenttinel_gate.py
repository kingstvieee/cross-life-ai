"""Build 218: independent StarCenttinel security-plane readiness verification.

Unlike an API's self-reported 'connected' boolean, a positive result requires a
fresh, nonce-bound, HMAC-authenticated response from the separate control plane.
No secrets, server credentials or irreversible revocations live in this module.
Its current production state is expected to be LOCKDOWN until owner WebAuthn,
provider revocation and server-side enforcement are *actually* provisioned.
"""
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx

HEALTH_HOST = "khpprzhqovzhgxdltarq.supabase.co"
HEALTH_PATH = "/functions/v1/sentinel-control/health"

def denied(reason):
    return {"ready": False, "mode": "LOCKDOWN",
            "external_authority_verified": False, "reason": reason,
            "service": "starcenttinel-security-control"}

def allowed_health_url(url):
    if not isinstance(url, str): return False
    p = urlsplit(url)
    return (p.scheme == "https" and p.hostname == HEALTH_HOST and p.port is None
            and p.username is None and p.password is None
            and p.path == HEALTH_PATH and not p.query and not p.fragment)

async def inspect_independent_control_plane(*, client=None, environ=None, nonce=None):
    config = environ if environ is not None else os.environ
    url = config.get("STARCENTTINEL_HEALTH_URL", "")
    bearer = config.get("STARCENTTINEL_HEALTH_JWT", "")
    key = config.get("STARCENTTINEL_PROOF_KEY", "")
    if not allowed_health_url(url):
        return denied("independent_endpoint_unconfigured_or_untrusted")
    if not isinstance(bearer, str) or len(bearer) < 24 or len(key) < 32:
        return denied("independent_authentication_not_provisioned")
    challenge = nonce or secrets.token_hex(24)
    if not isinstance(challenge,str) or len(challenge) < 32:
        return denied("invalid_nonce")
    owned_client = client is None
    transport = client or httpx.AsyncClient(timeout=httpx.Timeout(3, connect=2),
                                            follow_redirects=False)
    try:
        response = await transport.get(url,headers={
            "Authorization": "Bearer " + bearer,
            "X-StarCenttinel-Nonce": challenge,
            "Accept": "application/json",
        })
        if response.status_code != 200 or len(response.content) > 4096:
            return denied("independent_health_unavailable")
        signature = response.headers.get("X-StarCenttinel-Proof", "")
        proof = hmac.new(key.encode(),challenge.encode()+b"\n"+response.content,
                         hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, "sha256="+proof):
            return denied("independent_health_unsigned")
        data = response.json()
        if not isinstance(data, dict) or data.get("nonce") != challenge:
            return denied("independent_nonce_mismatch")
        issued = datetime.fromisoformat(str(data.get("issued_at","")).replace("Z","+00:00"))
        age = abs((datetime.now(timezone.utc)-issued.astimezone(timezone.utc)).total_seconds())
        if age > 30:
            return denied("independent_health_stale")
        if (data.get("service") != "starcenttinel-security-control" or
            data.get("state") != "ENFORCING" or
            data.get("ready_for_live_actions") is not True or
            data.get("external_authority_verified") is not True or
            data.get("owner_webauthn_verified") is not True or
            data.get("provider_revocation_verified") is not True or
            data.get("portal_enforcement_count") != 9 or
            not isinstance(data.get("revision"),int) or data["revision"] < 1):
            return denied("independent_authority_or_provider_evidence_missing")
        return {"ready": True,"mode":"ENFORCING",
                "revision":data["revision"],"external_authority_verified":True,
                "service":"starcenttinel-security-control"}
    except (httpx.HTTPError, ValueError, TypeError, KeyError, OverflowError):
        return denied("independent_health_readback_failed")
    finally:
        if owned_client: await transport.aclose()
