"""Server-owned OAuth authorization-code + PKCE login for a hosted identity broker.

Google, Microsoft, Apple and email are separate configured broker connections. No
provider is advertised as enabled until its server configuration is present.
Native sessions use a short-lived, single-use grant bound to app-held PKCE.
"""
import base64
import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlsplit

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel

SESSION_COOKIE = "__Host-staar_session"
FLOW_COOKIE = "__Host-staar_login"
PROVIDERS = ("google", "microsoft", "apple", "email")


def native_redirect():
    # The client cannot supply a redirect destination. Preserve the installed
    # app's scheme; enabling a new destination requires a reviewed code change.
    value = os.environ.get("AUTH_NATIVE_REDIRECT_URL", "").strip()
    return value if value == "frontend://auth-complete" else None


class NativeExchange(BaseModel):
    code: str
    verifier: str


def secure_url(value):
    parsed = urlsplit(value or "")
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("HTTPS identity configuration required")
    return value


def app_origin():
    try:
        p = urlsplit(secure_url(os.environ.get("AUTH_APP_URL", "")))
        return p.scheme + "://" + p.netloc
    except ValueError:
        return None


def config(provider):
    if provider not in PROVIDERS:
        return None
    keys = ("AUTH_AUTHORIZE_URL", "AUTH_TOKEN_URL", "AUTH_USERINFO_URL", "AUTH_ISSUER",
            "AUTH_CLIENT_ID", "AUTH_CLIENT_SECRET", "AUTH_CALLBACK_URL", "AUTH_APP_URL")
    values = {key: os.environ.get(key, "").strip() for key in keys}
    values["connection"] = os.environ.get("AUTH_CONNECTION_" + provider.upper(), "").strip()
    if not all(values.values()):
        return None
    try:
        for key in ("AUTH_AUTHORIZE_URL", "AUTH_TOKEN_URL", "AUTH_USERINFO_URL", "AUTH_ISSUER", "AUTH_CALLBACK_URL", "AUTH_APP_URL"):
            secure_url(values[key])
    except ValueError:
        return None
    return values


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


async def ensure_identity_indexes(db):
    await db.auth_flows.create_index("state_hash", unique=True)
    await db.auth_flows.create_index("expires_at", expireAfterSeconds=0)
    await db.auth_native_grants.create_index("code_hash", unique=True)
    await db.auth_native_grants.create_index("expires_at", expireAfterSeconds=0)


def build_identity_router(*, db, limiter=None, now=None, http_client=None):
    router = APIRouter(prefix="/auth", tags=["identity"])
    clock = now or (lambda: datetime.now(timezone.utc))
    client_factory = http_client or (lambda: httpx.AsyncClient(timeout=15, follow_redirects=False))

    @router.get("/providers")
    async def providers():
        return {"providers": [{"id": p, "enabled": config(p) is not None} for p in PROVIDERS],
                "nativeEnabled": native_redirect() is not None, "guest": "local-read-only"}

    @router.get("/start/{provider}")
    async def start(provider: str, request: Request, native_challenge: str | None = None):
        if limiter:
            limiter("identity-start:" + (request.client.host if request.client else "unknown"), 30, 3600)
        cfg = config(provider)
        if not cfg:
            raise HTTPException(503, "identity_provider_not_configured")
        if native_challenge is not None:
            if not native_redirect():
                raise HTTPException(503, "native_identity_not_configured")
            if not re.fullmatch(r"[A-Za-z0-9_-]{43}", native_challenge):
                raise HTTPException(400, "invalid_native_challenge")
        state, browser_binding, verifier = (secrets.token_urlsafe(32) for _ in range(3))
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        await db.auth_flows.insert_one({
            "state_hash": digest(state), "browser_hash": digest(browser_binding),
            "provider": provider, "verifier": verifier, "native_challenge": native_challenge,
            "native_redirect": native_redirect() if native_challenge else None,
            "expires_at": clock() + timedelta(minutes=5),
        })
        # Return locations and provider endpoints are configured by the server,
        # never accepted from a login request.
        params = {"response_type": "code", "client_id": cfg["AUTH_CLIENT_ID"],
                  "redirect_uri": cfg["AUTH_CALLBACK_URL"], "scope": "openid profile email",
                  "state": state, "code_challenge": challenge, "code_challenge_method": "S256",
                  "connection": cfg["connection"], "prompt": "login"}
        response = RedirectResponse(cfg["AUTH_AUTHORIZE_URL"] + ("&" if "?" in cfg["AUTH_AUTHORIZE_URL"] else "?") + urlencode(params), status_code=302)
        response.set_cookie(FLOW_COOKIE, browser_binding, max_age=300, secure=True, httponly=True, samesite="none", path="/")
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @router.get("/callback")
    async def callback_get(request: Request):
        return await _handle_callback(request)

    @router.post("/callback")
    async def callback_post(request: Request):
        form = await request.form(max_files=0, max_fields=8)
        return await _handle_callback(request, form_state=form.get("state"), form_code=form.get("code"))

    async def _handle_callback(request: Request, *, form_state=None, form_code=None):
        state = form_state or request.query_params.get("state", "")
        code = form_code or request.query_params.get("code", "")
        if not isinstance(state, str) or not isinstance(code, str):
            raise HTTPException(401, "invalid_login_callback")
        if limiter:
            limiter("identity-callback:" + (request.client.host if request.client else "unknown"), 60, 3600)
        binding = request.cookies.get(FLOW_COOKIE)
        if not state or not code or not binding or len(state) > 256 or len(code) > 4096:
            raise HTTPException(401, "invalid_login_callback")
        # Atomic consume makes callbacks single-use, including concurrent replay.
        flow = await db.auth_flows.find_one_and_delete({"state_hash": digest(state), "browser_hash": digest(binding)})
        if not flow:
            raise HTTPException(401, "invalid_or_replayed_login")
        expiry = flow.get("expires_at")
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if not expiry or expiry <= clock():
            raise HTTPException(401, "expired_login")
        cfg = config(flow["provider"])
        if not cfg:
            raise HTTPException(503, "identity_provider_not_configured")
        try:
            async with client_factory() as client:
                token_response = await client.post(cfg["AUTH_TOKEN_URL"], data={
                    "grant_type": "authorization_code", "code": code,
                    "redirect_uri": cfg["AUTH_CALLBACK_URL"], "client_id": cfg["AUTH_CLIENT_ID"],
                    "client_secret": cfg["AUTH_CLIENT_SECRET"], "code_verifier": flow["verifier"],
                })
                if token_response.status_code != 200:
                    raise ValueError("token exchange rejected")
                access_token = token_response.json().get("access_token")
                if not isinstance(access_token, str) or not access_token:
                    raise ValueError("access token missing")
                identity_response = await client.get(cfg["AUTH_USERINFO_URL"], headers={"Authorization": "Bearer " + access_token})
                if identity_response.status_code != 200:
                    raise ValueError("identity read rejected")
                identity = identity_response.json()
        except (httpx.HTTPError, ValueError, TypeError):
            raise HTTPException(401, "identity_verification_failed")
        # Identity comes from authenticated HTTPS userinfo, not caller email,
        # unverified ID-token decoding, or an access token submitted by the app.
        if not isinstance(identity, dict):
            raise HTTPException(401, "verified_identity_required")
        subject, email = identity.get("sub"), identity.get("email")
        if not isinstance(subject, str) or not subject or not isinstance(email, str) or "@" not in email or identity.get("email_verified") is not True:
            raise HTTPException(401, "verified_identity_required")
        user_id = "oidc_" + digest(cfg["AUTH_ISSUER"] + "|" + subject)
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            # Never silently link an existing account by matching email.
            if await db.users.find_one({"email": email}, {"_id": 0}):
                raise HTTPException(409, "existing_account_link_required")
            user = {"user_id": user_id, "email": email, "name": identity.get("name"),
                    "picture": identity.get("picture"), "onboarding_complete": False,
                    "autonomy": "suggest", "companion": "atlas", "is_demo": False,
                    "portals_enabled": ["creativity", "work", "home", "wellbeing", "relationships", "community", "style"],
                    "portal_privacy": {p: {"access": True, "share": False, "confirm": True}
                                       for p in ("creativity", "work", "home", "wellbeing", "relationships", "community", "style")},
                    "cross_life_paused": False, "created_at": clock()}
            await db.users.insert_one(user)
        if flow.get("native_challenge"):
            if flow.get("native_redirect") != native_redirect() or not native_redirect():
                raise HTTPException(503, "native_identity_not_configured")
            code = secrets.token_urlsafe(32)
            await db.auth_native_grants.insert_one({
                "code_hash": digest(code), "challenge": flow["native_challenge"],
                "user_id": user_id, "expires_at": clock() + timedelta(seconds=60),
            })
            response = RedirectResponse(native_redirect() + "?" + urlencode({"code": code}), status_code=303)
            response.delete_cookie(FLOW_COOKIE, path="/", secure=True, httponly=True, samesite="none")
            response.headers["Cache-Control"] = "no-store"
            response.headers["Referrer-Policy"] = "no-referrer"
            return response
        token = secrets.token_urlsafe(48)
        await db.user_sessions.insert_one({"session_token": token, "user_id": user_id,
                                          "created_at": clock(), "expires_at": clock() + timedelta(days=7)})
        response = RedirectResponse(cfg["AUTH_APP_URL"], status_code=303)
        response.set_cookie(SESSION_COOKIE, token, max_age=604800, secure=True, httponly=True, samesite="none", path="/")
        response.delete_cookie(FLOW_COOKIE, path="/", secure=True, httponly=True, samesite="none")
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @router.post("/native/exchange")
    async def exchange(body: NativeExchange, request: Request):
        if limiter:
            limiter("identity-exchange:" + (request.client.host if request.client else "unknown"), 30, 3600)
        if not native_redirect():
            raise HTTPException(503, "native_identity_not_configured")
        if not re.fullmatch(r"[A-Za-z0-9_-]{40,128}", body.code) or not re.fullmatch(r"[A-Za-z0-9._~-]{43,128}", body.verifier):
            raise HTTPException(401, "invalid_native_grant")
        challenge = base64.urlsafe_b64encode(hashlib.sha256(body.verifier.encode()).digest()).decode().rstrip("=")
        # A wrong verifier cannot consume another app's valid grant. Correct
        # concurrent exchanges still race through one atomic consume.
        grant = await db.auth_native_grants.find_one_and_delete({"code_hash": digest(body.code), "challenge": challenge})
        if not grant:
            raise HTTPException(401, "invalid_or_replayed_native_grant")
        expiry = grant.get("expires_at")
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if not expiry or expiry <= clock():
            raise HTTPException(401, "expired_native_grant")
        user = await db.users.find_one({"user_id": grant["user_id"]}, {"_id": 0})
        if not user or user.get("is_demo"):
            raise HTTPException(401, "account_required")
        token = secrets.token_urlsafe(48)
        await db.user_sessions.insert_one({"session_token": token, "user_id": user["user_id"],
                                          "created_at": clock(), "expires_at": clock() + timedelta(days=7)})
        # Only return JSON-serializable public profile data.
        public = {k: v for k, v in user.items() if k in {"user_id", "email", "name", "picture", "onboarding_complete", "autonomy", "companion", "portals_enabled", "portal_privacy", "cross_life_paused", "is_demo"}}
        return JSONResponse({"session_token": token, "user": public}, headers={"Cache-Control": "no-store", "Pragma": "no-cache"})

    return router
