"""Read-only calendar connections. Tokens remain encrypted on the server.

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

    @router.get("")
    async def status(authorization: str = Header(None)):
        user = await account(authorization); output = []
        for provider in SPECS:
            try: configuration(provider); configured = True
            except HTTPException: configured = False
            linked = await db.provider_connections.find_one({"user_id": user["user_id"], "provider": provider}, {"_id": 0, "linked_at": 1, "reconnect_required": 1})
            output.append({"id": provider, "configured": configured, "connected": bool(linked and not linked.get("reconnect_required")), "reconnect_required": bool(linked and linked.get("reconnect_required")), "linked_at": linked.get("linked_at") if linked else None, "capability": "calendar_read_only"})
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
                result = await client.post(SPECS[provider]["token"], data={**cfg, "code": code, "grant_type": "authorization_code", "code_verifier": verifier})
            if result.status_code != 200: raise ValueError("token_exchange_failed")
            tokens = result.json()
            if not isinstance(tokens.get("access_token"), str) or not tokens["access_token"]: raise ValueError("invalid_token")
            tokens["expires_at"] = (now() + timedelta(seconds=max(0, min(int(tokens.get("expires_in", 3600)), 86400)))).timestamp()
            await db.provider_flows.update_one({"flow": flow["flow"]}, {"$set": {"status": "consented", "tokens": seal(tokens)}, "$unset": {"verifier": ""}})
            return HTMLResponse("<h1>Calendar permission received</h1><p>Return to STAAR Hub and choose Finish connection. No calendar has been read yet.</p>", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"})
        except (ValueError, httpx.HTTPError, KeyError):
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
                probe = await client.get(SPECS[provider]["api"], params=calendar_query(provider), headers={"Authorization": "Bearer " + token})
            if probe.status_code in (401, 403): raise HTTPException(409, "provider_reconnect_required")
            if probe.status_code != 200: raise HTTPException(502, "provider_read_unavailable")
            payload = probe.json()
            items = payload.get("items" if provider == "google" else "value")
            if not isinstance(items, list): raise HTTPException(502, "provider_read_unavailable")
        except (httpx.HTTPError, ValueError, AttributeError):
            raise HTTPException(502, "provider_read_unavailable")
        # Atomically consume consent only after proven read permission; no data is stored.
        consumed = await db.provider_flows.find_one_and_delete(query)
        if not consumed: raise HTTPException(409, "consent_not_finished_or_expired")
        await db.provider_connections.update_one({"user_id": user["user_id"], "provider": provider}, {"$set": {"tokens": consumed["tokens"], "linked_at": now(), "reconnect_required": False}}, upsert=True)
        return {"connected": True, "capability": "calendar_read_only", "readback_verified": True}

    @router.delete("/{provider}")
    async def disconnect(provider: str, authorization: str = Header(None)):
        user = await account(authorization)
        if provider not in SPECS: raise HTTPException(404, "unknown_provider")
        await db.provider_connections.delete_many({"user_id": user["user_id"], "provider": provider})
        await db.provider_flows.delete_many({"user_id": user["user_id"], "provider": provider})
        return {"connected": False, "note": "Saved credentials removed. You can also revoke consent in the provider account."}

    @router.get("/{provider}/calendar")
    async def calendar(provider: str, authorization: str = Header(None)):
        user = await account(authorization); limiter("provider_read:" + user["user_id"], 30, 60); cfg = configuration(provider)
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
                    result = await client.post(SPECS[provider]["token"], data={**cfg, "grant_type": "refresh_token", "refresh_token": tokens["refresh_token"]})
                    if result.status_code in (400, 401, 403):
                        await invalidate_revoked_token(record)
                        raise HTTPException(409, "provider_reconnect_required")
                    if result.status_code != 200: raise HTTPException(502, "provider_read_unavailable")
                    fresh = result.json()
                    if not fresh.get("access_token"): raise HTTPException(502, "provider_read_unavailable")
                    tokens.update(fresh); tokens["expires_at"] = (now() + timedelta(seconds=int(fresh.get("expires_in", 3600)))).timestamp()
                    refreshed_token = seal(tokens)
                    await db.provider_connections.update_one({"_id": record["_id"], "tokens": record["tokens"]}, {"$set": {"tokens": refreshed_token}})
                    record["tokens"] = refreshed_token
                response = await client.get(SPECS[provider]["api"], params=calendar_query(provider), headers={"Authorization": "Bearer " + tokens["access_token"]})
                if response.status_code in (401, 403):
                    await invalidate_revoked_token(record)
                    raise HTTPException(409, "provider_reconnect_required")
                if response.status_code != 200: raise HTTPException(502, "provider_read_unavailable")
                data = response.json()
                return {"provider": provider, "read_at": now().isoformat(), "events": [event_summary(provider, x) for x in data.get("items" if provider == "google" else "value", [])[:25]]}
            except (httpx.HTTPError, ValueError, KeyError): raise HTTPException(502, "provider_read_unavailable")
    return router
