"""Read-only account connections for calendars and Canva design metadata. Tokens remain encrypted on the server.

Provider app registration is distinct from STAAR account sign-in. No scopes are
silently borrowed from login and no write actions are exposed by this router.
"""
import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlsplit

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.responses import HTMLResponse

SPECS = {
    "google": {"authorize": "https://accounts.google.com/o/oauth2/v2/auth", "token": "https://oauth2.googleapis.com/token", "scope": "https://www.googleapis.com/auth/calendar.events.readonly", "api": "https://www.googleapis.com/calendar/v3/calendars/primary/events"},
    "canva": {"authorize": "https://www.canva.com/api/oauth/authorize", "token": "https://api.canva.com/rest/v1/oauth/token", "scope": "design:meta:read", "api": "https://api.canva.com/rest/v1/designs"},
    "microsoft": {"authorize": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", "token": "https://login.microsoftonline.com/common/oauth2/v2.0/token", "scope": "offline_access Calendars.ReadBasic", "api": "https://graph.microsoft.com/v1.0/me/calendarView"},
}

def now(): return datetime.now(timezone.utc)
def hashed(value): return hashlib.sha256(value.encode()).hexdigest()
def cipher():
    try: return Fernet(os.environ.get("PROVIDER_TOKEN_ENCRYPTION_KEY", "").encode())
    except (ValueError, TypeError): raise HTTPException(503, "provider_vault_not_configured")

def configuration(provider):
    if provider not in SPECS: raise HTTPException(404, "unknown_provider")
    prefix = "CONNECT_" + provider.upper()
    cid, secret, origin = (os.environ.get(key, "").strip() for key in (prefix + "_CLIENT_ID", prefix + "_CLIENT_SECRET", "CONNECT_CALLBACK_ORIGIN"))
    p = urlsplit(origin)
    if not cid or not secret or p.scheme != "https" or not p.hostname or p.username or p.password or p.path not in ("", "/") or p.query or p.fragment:
        raise HTTPException(503, "provider_app_not_configured")
    cipher()
    return {"client_id": cid, "client_secret": secret, "redirect_uri": origin.rstrip("/") + "/api/connections/" + provider + "/callback"}

def seal(tokens): return cipher().encrypt(json.dumps(tokens).encode()).decode()
def unseal(value):
    try: return json.loads(cipher().decrypt(value.encode()))
    except (InvalidToken, ValueError, TypeError): raise HTTPException(503, "provider_vault_unavailable")

def event_summary(provider, item):
    if provider == "google":
        return {"id": item.get("id", ""), "title": item.get("summary") or "Untitled event", "start": item.get("start", {}).get("dateTime") or item.get("start", {}).get("date"), "end": item.get("end", {}).get("dateTime") or item.get("end", {}).get("date")}
    return {"id": item.get("id", ""), "title": item.get("subject") or "Untitled event", "start": item.get("start", {}).get("dateTime"), "end": item.get("end", {}).get("dateTime")}

def calendar_query(provider):
    """Minimal, bounded read-only permission probe and calendar preview window."""
    start, end = now().isoformat(), (now() + timedelta(days=7)).isoformat()
    if provider == "google":
        return {"timeMin": start, "timeMax": end, "maxResults": 25, "singleEvents": "true", "orderBy": "startTime", "fields": "items(id,summary,start,end)"}
    return {"startDateTime": start, "endDateTime": end, "$top": 25, "$select": "id,subject,start,end", "$orderby": "start/dateTime"}

def capability(provider):
    return "design_metadata_read_only" if provider == "canva" else "calendar_read_only"

def read_query(provider):
    return {"sort_by": "modified_descending"} if provider == "canva" else calendar_query(provider)

def readback_items(provider, payload):
    if not isinstance(payload, dict):
        raise HTTPException(502, "provider_read_unavailable")
    items = payload.get("value" if provider == "microsoft" else "items")
    if not isinstance(items, list) or any(not isinstance(item, dict) for item in items[:25]):
        raise HTTPException(502, "provider_read_unavailable")
    if provider == "canva" and any(not isinstance(item.get("id"), str) or not item["id"] for item in items[:25]):
        raise HTTPException(502, "provider_read_unavailable")
    return items[:25]

def design_summary(item):
    title = item.get("title")
    return {"id": item["id"][:128], "title": title[:240] if isinstance(title, str) and title.strip() else "Untitled design"}

async def exchange_token(client, provider, cfg, **fields):
    if provider == "canva":
        # Canva authenticates the app using Basic, not form-encoded credentials.
        if fields.get("grant_type") == "authorization_code":
            fields["redirect_uri"] = cfg["redirect_uri"]
        return await client.post(SPECS[provider]["token"], data=fields, auth=(cfg["client_id"], cfg["client_secret"]))
    return await client.post(SPECS[provider]["token"], data={**cfg, **fields})


def build_provider_router(*, db, require_account_user, limiter, http_client=None):
    def private_response(response: Response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
    router = APIRouter(prefix="/connections", dependencies=[Depends(private_response)])
    make_client = http_client or (lambda: httpx.AsyncClient(timeout=20, follow_redirects=False))

    async def account(authorization): return await require_account_user(authorization)

    async def invalidate_revoked_token(record):
        # Compare-and-set: never invalidate a newer OAuth link or a refreshed token.
        await db.provider_connections.update_one(
            {"_id": record["_id"], "tokens": record["tokens"]},
            {"$set": {"reconnect_required": True}, "$unset": {"tokens": ""}},
        )

    async def require_current_connection(record):
        current = await db.provider_connections.find_one({
            "_id": record["_id"], "user_id": record["user_id"],
            "provider": record["provider"], "tokens": record["tokens"],
        })
        if not current or current.get("reconnect_required"):
            raise HTTPException(409, "provider_reconnect_required")

    @router.get("")
    async def status(authorization: str = Header(None)):
        user = await account(authorization); output = []
        for provider in SPECS:
            try: configuration(provider); configured = True
            except HTTPException: configured = False
            linked = await db.provider_connections.find_one({"user_id": user["user_id"], "provider": provider}, {"_id": 0, "linked_at": 1, "reconnect_required": 1, "tokens": 1})
            # Never return the token; its presence is required for a truthful status.
            has_token = bool(linked and isinstance(linked.get("tokens"), str) and linked["tokens"])
            output.append({"id": provider, "configured": configured, "connected": bool(has_token and not linked.get("reconnect_required")), "reconnect_required": bool(linked and (linked.get("reconnect_required") or not has_token)), "linked_at": linked.get("linked_at") if linked else None, "capability": capability(provider)})
        return output

    @router.post("/{provider}/start")
    async def start(provider: str, authorization: str = Header(None)):
        user = await account(authorization); limiter("provider_start:" + user["user_id"], 10, 3600)
        cfg = configuration(provider); state = secrets.token_urlsafe(32); flow = secrets.token_urlsafe(32); verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        # Replacing prior unfinished flows limits each account/provider to one.
        await db.provider_flows.delete_many({"user_id": user["user_id"], "provider": provider})
        await db.provider_flows.insert_one({"state": hashed(state), "flow": hashed(flow), "user_id": user["user_id"], "provider": provider, "verifier": seal({"verifier": verifier}), "expires_at": now() + timedelta(minutes=10), "status": "waiting"})
        query = {"client_id": cfg["client_id"], "redirect_uri": cfg["redirect_uri"], "response_type": "code", "scope": SPECS[provider]["scope"], "state": state, "code_challenge": challenge, "code_challenge_method": "S256", "prompt": "consent"}
        if provider == "google": query.update(access_type="offline", include_granted_scopes="false")
        if provider == "canva":
            query.pop("prompt")
            query["code_challenge_method"] = "s256"
        return {"flow": flow, "url": SPECS[provider]["authorize"] + "?" + urlencode(query)}

    @router.get("/{provider}/callback", response_class=HTMLResponse)
    async def callback(provider: str, state: str = "", code: str = "", error: str = ""):
        cfg = configuration(provider)
        # Consume state atomically before exchanging the authorization code.
        flow = await db.provider_flows.find_one_and_update({"state": hashed(state), "provider": provider, "status": "waiting", "expires_at": {"$gt": now()}}, {"$set": {"status": "exchanging"}, "$unset": {"state": ""}})
        if not flow: raise HTTPException(400, "connection_flow_expired")
        try:
            if error or not code: raise ValueError("denied")
            verifier = unseal(flow["verifier"])["verifier"]
            async with make_client() as client:
                result = await exchange_token(client, provider, cfg, code=code, grant_type="authorization_code", code_verifier=verifier)
            if result.status_code != 200: raise ValueError("token_exchange_failed")
            tokens = result.json()
            if not isinstance(tokens, dict) or not isinstance(tokens.get("access_token"), str) or not tokens["access_token"]: raise ValueError("invalid_token")
            tokens["expires_at"] = (now() + timedelta(seconds=max(0, min(int(tokens.get("expires_in", 3600)), 86400)))).timestamp()
            await db.provider_flows.update_one({"flow": flow["flow"]}, {"$set": {"status": "consented", "tokens": seal(tokens)}, "$unset": {"verifier": ""}})
            kind = "Canva" if provider == "canva" else "Calendar"
            return HTMLResponse(f"<h1>{kind} permission received</h1><p>Return to STAAR Hub and choose Finish connection. No account content has been read yet.</p>", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"})
        except (ValueError, TypeError, OverflowError, httpx.HTTPError, KeyError):
            await db.provider_flows.delete_one({"flow": flow["flow"]})
            raise HTTPException(400, "provider_consent_failed")

    @router.post("/{provider}/finish/{flow_id}")
    async def finish(provider: str, flow_id: str, authorization: str = Header(None)):
        user = await account(authorization); configuration(provider)
        # Do not present a provider as connected until its live API accepts this token.
        query = {"flow": hashed(flow_id), "user_id": user["user_id"], "provider": provider, "status": "consented", "expires_at": {"$gt": now()}}
        flow = await db.provider_flows.find_one(query)
        if not flow: raise HTTPException(409, "consent_not_finished_or_expired")
        token = unseal(flow["tokens"]).get("access_token")
        if not isinstance(token, str) or not token: raise HTTPException(409, "provider_reconnect_required")
        try:
            async with make_client() as client:
                probe = await client.get(SPECS[provider]["api"], params=read_query(provider), headers={"Authorization": "Bearer " + token})
            if probe.status_code in (401, 403): raise HTTPException(409, "provider_reconnect_required")
            if probe.status_code != 200: raise HTTPException(502, "provider_read_unavailable")
            readback_items(provider, probe.json())
        except (httpx.HTTPError, ValueError, AttributeError):
            raise HTTPException(502, "provider_read_unavailable")
        # Atomically consume consent only after proven read permission; no data is stored.
        consumed = await db.provider_flows.find_one_and_delete(query)
        if not consumed: raise HTTPException(409, "consent_not_finished_or_expired")
        await db.provider_connections.update_one({"user_id": user["user_id"], "provider": provider}, {"$set": {"tokens": consumed["tokens"], "linked_at": now(), "reconnect_required": False}}, upsert=True)
        return {"connected": True, "capability": capability(provider), "readback_verified": True}

    @router.delete("/{provider}")
    async def disconnect(provider: str, authorization: str = Header(None)):
        user = await account(authorization)
        if provider not in SPECS: raise HTTPException(404, "unknown_provider")
        await db.provider_connections.delete_many({"user_id": user["user_id"], "provider": provider})
        await db.provider_flows.delete_many({"user_id": user["user_id"], "provider": provider})
        return {"connected": False, "note": "Saved credentials removed. You can also revoke consent in the provider account."}

    @router.get("/{provider}/calendar")
    async def calendar(provider: str, authorization: str = Header(None)):
        return await provider_read(provider, "calendar_read_only", authorization)

    @router.get("/canva/designs")
    async def canva_designs(authorization: str = Header(None)):
        return await provider_read("canva", "design_metadata_read_only", authorization)

    async def provider_read(provider, expected_capability, authorization):
        user = await account(authorization)
        if provider not in SPECS or capability(provider) != expected_capability:
            raise HTTPException(404, "unknown_provider_capability")
        limiter("provider_read:" + user["user_id"], 30, 60)
        cfg = configuration(provider)
        record = await db.provider_connections.find_one({"user_id": user["user_id"], "provider": provider})
        if not record: raise HTTPException(409, "provider_not_connected")
        if record.get("reconnect_required") or not record.get("tokens"): raise HTTPException(409, "provider_reconnect_required")
        tokens = unseal(record["tokens"])
        async with make_client() as client:
            try:
                if float(tokens.get("expires_at", 0)) <= now().timestamp() + 60:
                    if not tokens.get("refresh_token"):
                        await invalidate_revoked_token(record)
                        raise HTTPException(409, "provider_reconnect_required")
                    await require_current_connection(record)
                    result = await exchange_token(client, provider, cfg, grant_type="refresh_token", refresh_token=tokens["refresh_token"])
                    if result.status_code in (400, 401, 403):
                        await invalidate_revoked_token(record)
                        raise HTTPException(409, "provider_reconnect_required")
                    if result.status_code != 200: raise HTTPException(502, "provider_read_unavailable")
                    fresh = result.json()
                    if not isinstance(fresh, dict) or not isinstance(fresh.get("access_token"), str) or not fresh["access_token"]: raise HTTPException(502, "provider_read_unavailable")
                    tokens.update(fresh); tokens["expires_at"] = (now() + timedelta(seconds=max(60, min(int(fresh.get("expires_in", 3600)), 86400)))).timestamp()
                    refreshed_token = seal(tokens)
                    await db.provider_connections.update_one({"_id": record["_id"], "tokens": record["tokens"]}, {"$set": {"tokens": refreshed_token}})
                    record["tokens"] = refreshed_token
                await require_current_connection(record)
                response = await client.get(SPECS[provider]["api"], params=read_query(provider), headers={"Authorization": "Bearer " + tokens["access_token"]})
                if response.status_code in (401, 403):
                    await invalidate_revoked_token(record)
                    raise HTTPException(409, "provider_reconnect_required")
                if response.status_code != 200: raise HTTPException(502, "provider_read_unavailable")
                items = readback_items(provider, response.json())
                await require_current_connection(record)
                result = {"provider": provider, "read_at": now().isoformat()}
                if provider == "canva":
                    return {**result, "designs": [design_summary(item) for item in items]}
                return {**result, "events": [event_summary(provider, item) for item in items]}
            except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError): raise HTTPException(502, "provider_read_unavailable")
    return router
