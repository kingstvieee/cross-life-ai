from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import StreamingResponse, Response
import hashlib
import secrets
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import json

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from emergentintegrations.llm.openai import OpenAITextToSpeech
from guardian_server_integration import ensure_guardian_indexes, install_guardian_core
from style_swap_routes import build_style_swap_router
from identity_routes import SESSION_COOKIE, app_origin, build_identity_router, ensure_identity_indexes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============================================================
# STATIC CONFIG
# ============================================================
PORTALS = [
    {"id": "creativity", "name": "Creativity", "prompt": "What's trying to come out of your head today?", "accent": "#B57EDC"},
    {"id": "work", "name": "Work", "prompt": "What needs attention?", "accent": "#0A0A0A"},
    {"id": "home", "name": "Home", "prompt": "How is home tonight?", "accent": "#8FA6B2"},
    {"id": "wellbeing", "name": "Wellbeing", "prompt": "How is your body and mind?", "accent": "#7EC4CF"},
    {"id": "relationships", "name": "Relationships", "prompt": "Who's on your mind?", "accent": "#E8B4B8"},
    {"id": "community", "name": "Community", "prompt": "What's happening around you?", "accent": "#C9B037"},
    {"id": "style", "name": "Style", "prompt": "What are you wearing?", "accent": "#D4AF37"},
]

from companion_policy import COMPANIONS, companion_identity
from conversation_history import load_history, public_history
from chat_turn import chat_turn, PrivacyChanged, EmptyReply



def utcnow():
    return datetime.now(timezone.utc)


# ============================================================
# MODELS
# ============================================================
class UserPublic(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    onboarding_complete: bool = False
    autonomy: str = "assist"
    companion: str = "guardian"
    portals_enabled: List[str] = Field(default_factory=lambda: [p["id"] for p in PORTALS])
    portal_privacy: Dict[str, Dict[str, bool]] = Field(default_factory=dict)
    cross_life_paused: bool = False


class SessionExchange(BaseModel):
    session_id: str


class OnboardingUpdate(BaseModel):
    portals_enabled: Optional[List[str]] = None
    autonomy: Optional[str] = None
    companion: Optional[str] = None
    onboarding_complete: Optional[bool] = None


class PrivacyUpdate(BaseModel):
    portal_privacy: Optional[Dict[str, Dict[str, bool]]] = None
    cross_life_paused: Optional[bool] = None


class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    portal: Optional[str] = None
    companion: Optional[str] = "guardian"


class CoordinateIn(BaseModel):
    approve: bool = True


class ScenarioIn(BaseModel):
    scenario: str = "evening"


class SpeakIn(BaseModel):
    coordination_id: str


class SpeakLineIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=480)


# ============================================================
# AUTH HELPERS
# ============================================================
logger = logging.getLogger("staar")

# Lightweight in-memory sliding-window rate limiter (per-process; adequate for
# this single-instance deployment). Buckets keyed by action + client identity.
from collections import defaultdict, deque
import time as _time

_rl_buckets: Dict[str, deque] = defaultdict(deque)


def rate_limit(bucket: str, limit: int, window_seconds: int) -> None:
    now = _time.monotonic()
    dq = _rl_buckets[bucket]
    while dq and now - dq[0] > window_seconds:
        dq.popleft()
    if len(dq) >= limit:
        raise HTTPException(status_code=429, detail="rate_limited")
    dq.append(now)


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer")
    token = authorization[7:]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="invalid_session")
    exp = session["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < utcnow():
        raise HTTPException(status_code=401, detail="expired_session")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="user_not_found")
    if user.get("is_demo") or str(user.get("user_id", "")).startswith("demo_"):
        raise HTTPException(status_code=403, detail="demo_guest_read_only")
    return user


async def require_account_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Require a real account for mutations and provider/model dispatch."""
    user = await get_current_user(authorization)
    if user.get("is_demo"):
        raise HTTPException(status_code=403, detail="demo_guest_read_only")
    return user


async def _authorized_portal_states(user: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Return only share-authorized portal state; paused users yield no context."""
    if user.get("cross_life_paused"):
        return {}
    allowed = [portal["id"] for portal in PORTALS if _portal_share_allowed(user, portal["id"])]
    states: Dict[str, Dict[str, Any]] = {}
    for portal_id in allowed:
        doc = await db.portal_state.find_one({"user_id": user["user_id"], "portal": portal_id}, {"_id": 0})
        if doc:
            states[portal_id] = doc.get("data", {})
    return states


def _portal_share_allowed(user: Dict[str, Any], portal_id: str) -> bool:
    prefs = (user.get("portal_privacy", {}) or {}).get(portal_id, {}) or {}
    return (not user.get("cross_life_paused") and not user.get("is_demo")
            and portal_id in user.get("portals_enabled", [])
            and prefs.get("access") is True and prefs.get("share") is True)


def user_public(u: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": u.get("user_id"),
        "email": u.get("email"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "onboarding_complete": u.get("onboarding_complete", False),
        "autonomy": u.get("autonomy", "assist"),
        "companion": u.get("companion", "guardian"),
        "portals_enabled": u.get("portals_enabled", [p["id"] for p in PORTALS]),
        "portal_privacy": u.get("portal_privacy", {}),
        "cross_life_paused": u.get("cross_life_paused", False),
        "is_demo": u.get("is_demo", False),
    }


# ============================================================
# BOOTSTRAP
# ============================================================
@app.on_event("startup")
async def startup():
    await ensure_guardian_indexes(db)
    await ensure_identity_indexes(db)
    await db.companion_history.create_index("expires_at", expireAfterSeconds=0)
    await db.companion_history.create_index([("user_id", 1), ("portal", 1), ("policy_key", 1), ("created_at", -1)])
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ============================================================
# AUTH ROUTES
# ============================================================
@api_router.post("/auth/session")
async def auth_session(body: SessionExchange):
    if os.environ.get("ENABLE_LEGACY_EMERGENT_AUTH") != "true":
        raise HTTPException(status_code=503, detail="identity_provider_not_configured")
    async with httpx.AsyncClient(timeout=15) as h:
        r = await h.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="invalid_session_id")
    data = r.json()
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not isinstance(email, str) or "@" not in email or not isinstance(session_token, str) or not session_token:
        raise HTTPException(status_code=401, detail="invalid_identity_response")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        default_privacy = {p["id"]: {"access": True, "share": False, "confirm": True} for p in PORTALS}
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "onboarding_complete": False,
            "autonomy": "assist",
            "companion": "guardian",
            "portals_enabled": [p["id"] for p in PORTALS],
            "portal_privacy": default_privacy,
            "cross_life_paused": False,
            "is_demo": False,
            "created_at": utcnow(),
        })

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": utcnow() + timedelta(days=7),
        "created_at": utcnow(),
    })

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user_public(user)}


@api_router.post("/auth/demo")
async def auth_demo(request: Request):
    """Guest preview is local-only; never mint a production guest bearer."""
    raise HTTPException(status_code=410, detail="use_local_guest_preview")


@api_router.get("/auth/me")
async def auth_me(user: Dict[str, Any] = None, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return user_public(user)


@api_router.post("/auth/logout")
async def auth_logout(response: Response, authorization: Optional[str] = Header(None)):
    response.delete_cookie(SESSION_COOKIE, path="/", secure=True, httponly=True, samesite="none")
    if authorization and authorization.startswith("Bearer "):
        await db.user_sessions.delete_one({"session_token": authorization[7:]})
    return {"ok": True}


@api_router.post("/user/profile")
async def update_profile(update: OnboardingUpdate, authorization: Optional[str] = Header(None)):
    user = await require_account_user(authorization)
    patch = {k: v for k, v in update.dict().items() if v is not None}
    if patch:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": patch})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(fresh)


@api_router.post("/user/privacy")
async def update_privacy(update: PrivacyUpdate, authorization: Optional[str] = Header(None)):
    user = await require_account_user(authorization)
    patch = {k: v for k, v in update.dict().items() if v is not None}
    if patch:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": patch})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(fresh)


# ============================================================
# PORTAL DATA
# ============================================================
@api_router.get("/portals")
async def get_portals():
    return PORTALS


@api_router.get("/portal/{portal_id}/state")
async def portal_state(portal_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    doc = await db.portal_state.find_one({"user_id": user["user_id"], "portal": portal_id}, {"_id": 0})
    if not doc:
        return {"portal": portal_id, "data": _default_portal_state(portal_id)}
    return {"portal": portal_id, "data": doc.get("data", _default_portal_state(portal_id))}


class PortalStateUpdate(BaseModel):
    data: Dict[str, Any]


@api_router.post("/portal/{portal_id}/state")
async def set_portal_state(portal_id: str, body: PortalStateUpdate, authorization: Optional[str] = Header(None)):
    user = await require_account_user(authorization)
    if len(json.dumps(body.data)) > 20_000:
        raise HTTPException(status_code=413, detail="payload_too_large")
    await db.portal_state.update_one(
        {"user_id": user["user_id"], "portal": portal_id},
        {"$set": {"data": body.data, "updated_at": utcnow()}},
        upsert=True,
    )
    return {"ok": True}


def _default_portal_state(portal_id: str) -> Dict[str, Any]:
    if portal_id == "work":
        return {
            "workload": "normal",
            "tasks": [],
            "stress": 3,
        }
    if portal_id == "wellbeing":
        return {"mood": 3, "stress": 3, "last_break": None, "breathing_streak": 0}
    if portal_id == "home":
        return {
            "routine_started": False,
            "lights": "auto",
            "temperature": 21,
            "reminders": [],
        }
    if portal_id == "relationships":
        return {"status": "single", "checkins": []}
    if portal_id == "community":
        return {"interests": [], "rsvp": []}
    if portal_id == "style":
        return {"favorites": [], "planned_outfit": None}
    if portal_id == "creativity":
        return {"ideas": [], "projects": []}
    return {}


# ============================================================
# DEMO DATA SEED
# ============================================================
DEMO_EVENTS = [
    {"id": "evt_1", "title": "Rooftop Jazz Night", "location": "The Broadview, Toronto", "time": "8:00 PM", "date": "Tonight", "dress_code": "smart-casual", "weather": "rain likely"},
    {"id": "evt_2", "title": "AGO Late Nights", "location": "Art Gallery of Ontario", "time": "7:30 PM", "date": "Fri", "dress_code": "creative", "weather": "clear"},
    {"id": "evt_3", "title": "Harbourfront Sound Bath", "location": "Harbourfront Centre", "time": "9:00 AM", "date": "Sat", "dress_code": "comfort", "weather": "sun"},
    {"id": "evt_4", "title": "Kensington Market Walk", "location": "Kensington Market", "time": "2:00 PM", "date": "Sun", "dress_code": "casual", "weather": "mild"},
]


async def _seed_demo_data(user_id: str):
    """Set up the Work overload scenario so judges see immediate cross-life impact."""
    work = {
        "workload": "high",
        "stress": 8,
        "tasks": [
            {"id": "t1", "title": "Send investor deck v3", "priority": "urgent", "done": False, "needs_you": True},
            {"id": "t2", "title": "Review Q4 revenue model", "priority": "urgent", "done": False, "needs_you": False},
            {"id": "t3", "title": "Reply to legal about term sheet", "priority": "high", "done": False, "needs_you": True},
            {"id": "t4", "title": "Draft Monday standup notes", "priority": "medium", "done": False, "needs_you": False},
            {"id": "t5", "title": "Approve marketing brief", "priority": "medium", "done": True, "needs_you": False},
            {"id": "t6", "title": "Book Q1 offsite venue", "priority": "low", "done": False, "needs_you": False},
        ],
    }
    wellbeing = {"mood": 2, "stress": 8, "last_break": None, "breathing_streak": 0, "slept_poorly": False}
    home = {"routine_started": False, "lights": "auto", "temperature": 21, "reminders": [
        {"id": "r1", "text": "Package from Indigo at door"},
        {"id": "r2", "text": "Dishwasher cycle finished"},
    ]}
    community = {"interests": ["jazz", "art"], "rsvp": ["evt_1"]}
    style = {"favorites": [], "planned_outfit": None}
    relationships = {"status": "in_relationship", "checkins": [
        {"id": "c1", "name": "Amara", "note": "Meeting me at Broadview by 8"}
    ]}
    creativity = {"ideas": [
        {"id": "i1", "text": "Short film — Toronto at 4am"},
        {"id": "i2", "text": "Album cover: silver + gold gradients"},
    ], "projects": []}

    seeds = {
        "work": work, "wellbeing": wellbeing, "home": home,
        "community": community, "style": style,
        "relationships": relationships, "creativity": creativity,
    }
    for portal_id, data in seeds.items():
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": portal_id},
            {"$set": {"data": data, "updated_at": utcnow()}},
            upsert=True,
        )


async def _seed_morning_data(user_id: str):
    """Act II: rough night ahead of a 9:30 AM presentation — Wellbeing triggers Work + Style."""
    work = {
        "workload": "normal",
        "stress": 5,
        "tasks": [
            {"id": "m1", "title": "Board presentation — 9:30 AM", "priority": "urgent", "done": False, "needs_you": True},
            {"id": "m2", "title": "Draft standup notes", "priority": "medium", "done": False, "needs_you": False},
            {"id": "m3", "title": "Review sprint board", "priority": "medium", "done": False, "needs_you": False},
            {"id": "m4", "title": "Clear overnight inbox", "priority": "low", "done": False, "needs_you": False},
        ],
    }
    wellbeing = {"mood": 2, "stress": 6, "sleep_hours": 4.5, "slept_poorly": True, "last_break": None, "breathing_streak": 0}
    home = {"routine_started": False, "lights": "auto", "temperature": 21, "reminders": [
        {"id": "r1", "text": "Coffee beans running low — order today"},
    ]}
    community = {"interests": ["jazz", "art"], "rsvp": []}
    style = {"favorites": [], "planned_outfit": None}
    relationships = {"status": "in_relationship", "checkins": [
        {"id": "c1", "name": "Amara", "note": "Wished you goodnight at 1 AM"}
    ]}
    creativity = {"ideas": [
        {"id": "i1", "text": "Short film — Toronto at 4am"},
        {"id": "i2", "text": "Album cover: silver + gold gradients"},
    ], "projects": []}
    seeds = {
        "work": work, "wellbeing": wellbeing, "home": home,
        "community": community, "style": style,
        "relationships": relationships, "creativity": creativity,
    }
    for portal_id, data in seeds.items():
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": portal_id},
            {"$set": {"data": data, "updated_at": utcnow()}},
            upsert=True,
        )


@api_router.post("/demo/reseed")
async def reseed_demo(authorization: Optional[str] = Header(None)):
    await require_account_user(authorization)
    raise HTTPException(status_code=410, detail="use_local_guest_preview")


@api_router.post("/demo/scenario")
async def load_scenario(body: ScenarioIn, authorization: Optional[str] = Header(None)):
    await require_account_user(authorization)
    raise HTTPException(status_code=410, detail="use_local_guest_preview")


@api_router.get("/community/events")
async def community_events():
    return DEMO_EVENTS


# ============================================================
# CROSS-LIFE CONTEXT ENGINE
# ============================================================
async def _gather_signals(user_id: str, user: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Analyze portal state and produce structured cross-life context signals."""
    user = user or await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or user.get("user_id") != user_id:
        return []
    if user.get("cross_life_paused"):
        return []
    signals: List[Dict[str, Any]] = []
    states = await _authorized_portal_states(user)

    work = states.get("work", {})
    if work.get("workload") == "high" or work.get("stress", 0) >= 7:
        signals.append({
            "sourcePortal": "work",
            "type": "workload",
            "severity": "high",
            "evidenceType": "user-reported-rule",
            "timestamp": utcnow().isoformat(),
            "suggestedTargets": ["wellbeing", "home"],
            "summary": "Work has been unusually heavy. Multiple urgent items unresolved.",
        })

    community = states.get("community", {})
    rsvp = community.get("rsvp", [])
    if rsvp:
        event = next((e for e in DEMO_EVENTS if e["id"] in rsvp), None)
        if event:
            signals.append({
                "sourcePortal": "community",
                "type": "upcoming_event",
                "severity": "medium",
                "evidenceType": "demo-fixture",
                "time": event["time"],
                "location": event["location"],
                "suggestedTargets": ["style", "home", "relationships"],
                "summary": f"{event['title']} at {event['time']}. Weather: {event['weather']}.",
                "event": event,
            })

    wellbeing = states.get("wellbeing", {})
    if wellbeing.get("slept_poorly"):
        signals.insert(0, {
            "sourcePortal": "wellbeing",
            "type": "poor_recovery",
            "severity": "high",
            "evidenceType": "user-reported-rule",
            "timestamp": utcnow().isoformat(),
            "suggestedTargets": ["work", "style"],
            "summary": f"Poor sleep was reported. Recorded sleep hours: {wellbeing.get('sleep_hours', 'not supplied')}.",
        })
    elif wellbeing.get("stress", 0) >= 6:
        signals.append({
            "sourcePortal": "wellbeing",
            "type": "elevated_stress",
            "severity": "medium",
            "evidenceType": "user-reported-rule",
            "suggestedTargets": ["home", "work"],
            "summary": "Physiological stress is elevated. Decompression window recommended.",
        })

    return signals


@api_router.get("/guardian/signals")
async def guardian_signals(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if user.get("cross_life_paused"):
        return {"paused": True, "signals": []}
    signals = await _gather_signals(user["user_id"], user)
    return {"paused": False, "signals": signals}


@api_router.post("/guardian/coordinate-evening")
async def coordinate_evening(body: CoordinateIn, authorization: Optional[str] = Header(None)):
    user = await require_account_user(authorization)
    user_id = user["user_id"]
    if user.get("cross_life_paused"):
        raise HTTPException(status_code=409, detail="cross_life_paused")
    shared_states = await _authorized_portal_states(user)
    signals = await _gather_signals(user_id, user)

    # Build coordinated actions across affected portals
    actions: List[Dict[str, Any]] = []
    now_iso = utcnow().isoformat()

    work_data = shared_states.get("work", {})
    urgent = [t for t in work_data.get("tasks", []) if t.get("priority") == "urgent" and not t.get("done")]
    needs_you = [t for t in urgent if t.get("needs_you")]
    can_wait = [t for t in work_data.get("tasks", []) if t.get("priority") in ("medium", "low") and not t.get("done")]

    actions.append({
        "portal": "work",
        "title": "Priorities re-sorted",
        "detail": f"{len(needs_you)} task needs you now. {len(urgent) - len(needs_you)} can be delegated. {len(can_wait)} items moved to tomorrow.",
        "items": [t["title"] for t in needs_you][:3],
    })

    actions.append({
        "portal": "wellbeing",
        "title": "20-minute decompression",
        "detail": "Breathing session queued. Interface tone softened. Notifications muted until 7:15 PM.",
        "items": ["Box breathing • 4-4-4-4", "Warm light", "Slower haptics"],
    })

    actions.append({
        "portal": "home",
        "title": "Evening routine prepped",
        "detail": "Lights warm at 7:00 PM. Dishwasher reminder cleared. Delivery brought inside.",
        "items": ["Lights → 2700K", "Thermostat → 20°C", "Delivery • Indigo package"],
    })

    event = None
    for s in signals:
        if s.get("type") == "upcoming_event":
            event = s.get("event")
            break

    if event:
        actions.append({
            "portal": "relationships",
            "title": "8 PM commitment protected",
            "detail": f"Amara meeting you at {event['location']}. Buffer of 45 min added. No new invites accepted.",
            "items": ["Departure by 7:20 PM", "Text Amara if late"],
        })
        actions.append({
            "portal": "style",
            "title": "Outfit prepared",
            "detail": f"Rain likely. Smart-casual layered look pulled from wardrobe.",
            "items": ["Charcoal knit", "Wool overcoat", "Waterproof chelsea boots"],
        })
        actions.append({
            "portal": "community",
            "title": "Departure orchestrated",
            "detail": "Departure plan prepared for review. No ride, door, or light action was sent. · DEMO FIXTURE",
            "items": [f"→ {event['location']}", "Target departure: 7:20 PM", "Weather: rain · verify before leaving"],
        })

    actions = [{**action, "state": "prepared", "execution": "not_requested",
                "detail": "Sample proposal for review. Nothing was executed."}
               for action in actions if _portal_share_allowed(user, action["portal"])]
    coordination = {
        "id": f"coord_{uuid.uuid4().hex[:10]}",
        "user_id": user_id,
        "created_at": utcnow(),
        "created_at_iso": now_iso,
        "approved": False,
        "state": "prepared",
        "execution": "not_requested",
        "signals": signals,
        "actions": actions,
        "scenario": "evening",
        "trigger": "work_overload_with_evening_commitment",
        "spoken_summary": (
            "I prepared a review plan for this evening. Work priorities are grouped — a decompression suggestion is ready, and the departure route is a draft for your approval. "
            "No ride, door, light, message, or external action was sent. Each connected step requires an authorized integration and your explicit approval. · DEMO FIXTURE"
        ),
    }
    await db.guardian_activity.insert_one(coordination)

    # This route prepares a fixture plan only; it never mutates device or portal state.

    return {
        "coordination_id": coordination["id"],
        "actions": actions,
        "signals": signals,
    }


@api_router.post("/guardian/coordinate-morning")
async def coordinate_morning(body: CoordinateIn, authorization: Optional[str] = Header(None)):
    user = await require_account_user(authorization)
    user_id = user["user_id"]
    if user.get("cross_life_paused"):
        raise HTTPException(status_code=409, detail="cross_life_paused")
    shared_states = await _authorized_portal_states(user)
    signals = await _gather_signals(user_id, user)
    now_iso = utcnow().isoformat()

    sleep_hours = shared_states.get("wellbeing", {}).get("sleep_hours", 4.5)

    actions = [
        {
            "portal": "wellbeing",
            "title": "Gentle start",
            "detail": f"You slept {sleep_hours} hours. Hydration first, then 10 minutes of light stretching. Non-urgent pings held until 10 AM.",
            "items": ["Water • 500ml", "Stretch • 10 min", "Pings held → 10:00 AM"],
        },
        {
            "portal": "work",
            "title": "Morning re-shaped around your 9:30",
            "detail": "Presentation protected. Standup notes auto-drafted. First meeting pushed 30 minutes, deep work deferred to afternoon.",
            "items": ["Presentation • 9:30 AM", "Standup notes • drafted", "First meeting → 10:30 AM"],
        },
        {
            "portal": "style",
            "title": "Low-effort confidence",
            "detail": "Comfort-first layered look that still reads sharp on camera.",
            "items": ["Soft merino crew", "Dark tapered trousers", "White leather sneakers"],
        },
        {
            "portal": "home",
            "title": "Warm wakeup",
            "detail": "Lights easing to sunrise tone. Coffee starts at 8:15. Thermostat up two degrees.",
            "items": ["Lights → sunrise", "Coffee • 8:15 AM", "Thermostat → 22°C"],
        },
    ]

    actions = [{**action, "state": "prepared", "execution": "not_requested",
                "detail": "Sample proposal for review. Nothing was executed."}
               for action in actions if _portal_share_allowed(user, action["portal"])]
    coordination = {
        "id": f"coord_{uuid.uuid4().hex[:10]}",
        "user_id": user_id,
        "created_at": utcnow(),
        "created_at_iso": now_iso,
        "approved": False,
        "state": "prepared",
        "execution": "not_requested",
        "signals": signals,
        "actions": actions,
        "scenario": "morning",
        "trigger": "poor_recovery_before_presentation",
        "spoken_summary": (
            "Good morning. You slept about four and a half hours, so I softened the day. "
            "Your nine thirty presentation is safe — I drafted your standup notes and pushed your first meeting by thirty minutes. "
            "Start with water and ten minutes of light stretching. I laid out a low effort outfit that still reads sharp. "
            "Take it slow. Each suggested step above is a prepared draft — nothing was sent or executed. · DEMO FIXTURE"
        ),
    }
    await db.guardian_activity.insert_one(coordination)

    # This route prepares a fixture plan only; it never mutates device or portal state.

    return {
        "coordination_id": coordination["id"],
        "actions": actions,
        "signals": signals,
    }


# ============================================================
# GUARDIAN VOICE (OpenAI TTS via Emergent key)
# ============================================================
_tts_client = None


def _tts() -> OpenAITextToSpeech:
    global _tts_client
    if _tts_client is None:
        _tts_client = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
    return _tts_client


@api_router.post("/guardian/speak")
async def guardian_speak(body: SpeakIn, authorization: Optional[str] = Header(None)):
    user = await require_account_user(authorization)
    rate_limit(f"tts:{user['user_id']}", 30, 60)
    coord = await db.guardian_activity.find_one(
        {"id": body.coordination_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not coord:
        raise HTTPException(status_code=404, detail="coordination_not_found")
    text = coord.get("spoken_summary") or "Coordination plan prepared. No external action was sent."
    return await _tts_cached_line(text, private_user_id=user["user_id"])


GREETING_TEXT = "Welcome. I am your Guardian. Seven worlds, one presence. Let us begin."

JUDGE_DEMO_LINES = {
    1: "Judges, the situation has just changed. The executive product review moved forward by forty-two minutes. The launch numbers conflict, the recommendation is buried, and Product and Engineering disagree on rollout. I have opened one shared crisis context, locked every external send, and I am ranking the meeting risks now.",
    2: "I have compared the product brief, dashboard snapshot, and team notes. The deck says eighteen thousand people, but the verified dashboard says eleven thousand four hundred. That contradiction would trigger the first executive objection. I am correcting the working story, surfacing the missing rollout owner, and moving the decision to the front.",
    3: "Now I am rebuilding the thirty-minute review. Watch the recommendation move to the opening, followed by the corrected product story, three decisions, named owners, and a five-minute close. I am also preparing the exact questions needed to settle the metric and rollout conflict. These are reversible working changes, not external actions.",
    4: "The same Work context is now crossing into Style because the presentation itself is a meeting risk. The opening runs twenty-eight seconds too long and the metric slide has three competing headlines. I am trimming the opening to forty-five seconds, simplifying the slide into three clear beats, and marking the pause before the recommendation.",
    5: "I am carrying the current facts into Relationships. Product needs a decision, Sales trusted the old audience estimate, and Engineering is protecting the rollout date. Watch me map the likely objection from each person, prepare neutral decision language, and draft separate owner follow-ups. The drafts remain locked. Nothing has been sent.",
    6: "A new signal just arrived. The executive joined early, and Sales confirmed eleven thousand four hundred, not eighteen thousand. I am updating the Work recommendation, shortening the Style rehearsal, and rewriting the Relationships response with the confirmed number. One change is propagating through all three portals while every external send stays locked.",
    7: "The live preparation is complete. Work now holds the corrected story, decisions, owners, and agenda. Style holds the clearer slide and rehearsed delivery. Relationships holds the stakeholder strategy and unsent follow-ups. I carried one current context across all three portals, adapted when the facts changed, explained every action, and preserved human approval.",
}

PORTAL_INTROS = {
    "creativity": "The Creativity world. Let's give your ideas room to move.",
    "work": "The Work world. One clear step at a time.",
    "home": "The Home world. Calm, safe, and in your control.",
    "wellbeing": "The Wellbeing world. Energy and rest, in balance.",
    "relationships": "The Relationships world. The people who matter, kept close.",
    "events": "The Events world. Your city, ready when you are.",
    "style": "The Style world. Show up as yourself, effortlessly.",
}


async def _tts_cached_line(text: str, private_user_id: Optional[str] = None) -> dict:
    """Generate TTS with public fixed narration or a short-lived private scoped link."""
    content_key = hashlib.sha256(f"{text}|onyx|1.0|tts-1|mp3".encode()).hexdigest()[:32]
    query = {"content_key": content_key, "private_user_id": private_user_id}
    if private_user_id is None:
        query = {"key": content_key, "visibility": "public"}
    cached = await db.tts_cache.find_one(query, {"_id": 0, "key": 1, "visibility": 1, "expires_at": 1})
    stale_private_key = None
    if cached and private_user_id is not None:
        expires_at = cached.get("expires_at")
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if not expires_at or expires_at <= utcnow():
            stale_private_key = cached.get("key")
            cached = None
    key = cached.get("key") if cached else (content_key if private_user_id is None else f"{content_key}.{secrets.token_urlsafe(18)}")
    if not cached:
        try:
            audio = await _tts().generate_speech(text=text, model="tts-1", voice="onyx")
        except Exception:
            logger.exception("tts generation failed")
            raise HTTPException(status_code=502, detail="tts_failed")
        cache_doc = {
            "key": key,
            "content_key": content_key,
            "audio": audio,
            "created_at": utcnow(),
            "visibility": "private" if private_user_id else "public",
            "private_user_id": private_user_id,
            "expires_at": utcnow() + timedelta(minutes=10) if private_user_id else None,
        }
        if stale_private_key:
            await db.tts_cache.update_one({"key": stale_private_key, "private_user_id": private_user_id}, {"$set": cache_doc})
        else:
            await db.tts_cache.insert_one(cache_doc)
    return {"url": f"/api/tts/{key}.mp3", "text": text}


SCORECARD_FONT_BOLD = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
SCORECARD_FONT_REG = "/usr/share/fonts/truetype/freefont/FreeSans.ttf"


def _render_scorecard_png(actions: int, remembered: int, memory_on: bool, lines: List[str]) -> bytes:
    from io import BytesIO
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1350
    img = Image.new("RGB", (W, H), "#0A0B0E")
    d = ImageDraw.Draw(img)

    def font(size: int, bold: bool = False):
        try:
            return ImageFont.truetype(SCORECARD_FONT_BOLD if bold else SCORECARD_FONT_REG, size)
        except Exception:
            return ImageFont.load_default()

    gold, cyan, white, dim = "#E8C86F", "#00E5FF", "#F5F8FF", "#9FB3D9"
    # frame
    d.rounded_rectangle([28, 28, W - 28, H - 28], radius=36, outline=gold, width=3)
    d.rounded_rectangle([40, 40, W - 40, H - 40], radius=30, outline="#2A2410", width=1)

    x, y = 84, 100
    d.text((x, y), "STAARWAARDD · JUDGE SCORECARD", font=font(28, True), fill=gold)
    y += 58
    d.text((x, y), "What the Guardian handled", font=font(64, True), fill=white)
    y += 96
    d.text((x, y), "A closing summary of everything coordinated during this demo.", font=font(30), fill=dim)
    y += 90

    # stats row
    stats = [(str(actions), "COORDINATED ACTIONS", cyan), (str(remembered), "PREFERENCES REMEMBERED", cyan), ("ON" if memory_on else "OFF", "GUARDIAN MEMORY", gold)]
    box_w = (W - 2 * 84 - 2 * 24) // 3
    for i, (value, label, color) in enumerate(stats):
        bx = x + i * (box_w + 24)
        d.rounded_rectangle([bx, y, bx + box_w, y + 190], radius=24, outline=gold, width=2, fill="#0D1220")
        d.text((bx + box_w / 2, y + 62), value, font=font(58, True), fill=color, anchor="mm")
        d.text((bx + box_w / 2, y + 138), label, font=font(17, True), fill=dim, anchor="mm")
    y += 250

    d.text((x, y), "COORDINATION RECEIPTS", font=font(26, True), fill=gold)
    y += 56
    if not lines:
        d.text((x, y), "The Guardian stood ready — no external actions were taken.", font=font(30), fill=dim)
        y += 60
    for line in lines[:6]:
        d.rounded_rectangle([x, y, W - 84, y + 78], radius=18, outline="#134A5C", width=2, fill="#0B1322")
        d.text((x + 26, y + 39), "•", font=font(34, True), fill=cyan, anchor="lm")
        d.text((x + 66, y + 39), line, font=font(30), fill=white, anchor="lm")
        y += 94

    d.text((W / 2, H - 120), "THE GUARDIAN · SEVEN WORLDS, ONE PRESENCE", font=font(26, True), fill=gold, anchor="mm")
    d.text((W / 2, H - 78), "STAAR HUB · CROSS-LIFE AI", font=font(22), fill=dim, anchor="mm")

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@api_router.get("/scorecard/image")
async def scorecard_image(
    actions: int = 0,
    remembered: int = 0,
    memory_on: bool = False,
    lines: str = "",
    authorization: Optional[str] = Header(None),
):
    """Shareable scorecard image judges can keep after the demo."""
    user = await get_current_user(authorization)
    rate_limit(f"share:{user['user_id']}", 10, 60)
    items = [ln.strip()[:64] for ln in lines.split("|") if ln.strip()][:6]
    png = _render_scorecard_png(max(0, min(actions, 99)), max(0, min(remembered, 20)), memory_on, items)
    return Response(content=png, media_type="image/png", headers={"Content-Disposition": "inline; filename=staar-scorecard.png"})


@api_router.post("/guardian/speak-line")
async def guardian_speak_line(body: SpeakLineIn, authorization: Optional[str] = Header(None)):
    """Speak a short Guardian line (e.g., a remembered preference). Auth + rate limited."""
    user = await require_account_user(authorization)
    rate_limit(f"tts:{user['user_id']}", 30, 60)
    return await _tts_cached_line(body.text, private_user_id=user["user_id"])


@api_router.get("/guardian/greeting")
async def guardian_greeting(request: Request):
    """Short spoken hub welcome in the Guardian's Onyx voice (cached)."""
    rate_limit(f"ttsline:{client_ip(request)}", 30, 60)
    return await _tts_cached_line(GREETING_TEXT)


@api_router.get("/guardian/judge-demo/{scene}")
async def guardian_judge_demo(scene: int, request: Request):
    """Public, cached Onyx narration for the judge demo; no login race."""
    rate_limit(f"judge-tts:{client_ip(request)}", 30, 60)
    text = JUDGE_DEMO_LINES.get(scene)
    if not text:
        raise HTTPException(status_code=404, detail="unknown_demo_scene")
    return await _tts_cached_line(text)


GATE_NAME_LINES = {
    "creativity": "Creativity awakens.",
    "work": "Work awakens.",
    "home": "Home awakens.",
    "wellbeing": "Wellbeing awakens.",
    "relationships": "Relationships awaken.",
    "events": "Community awakens.",
    "style": "Style awakens.",
}


@api_router.get("/guardian/gate-name/{portal_id}")
async def guardian_gate_name(portal_id: str, request: Request):
    """Spoken gateway-name whisper for the arrival cinematic (cached Onyx)."""
    rate_limit(f"ttsline:{client_ip(request)}", 30, 60)
    text = GATE_NAME_LINES.get(portal_id)
    if not text:
        raise HTTPException(status_code=404, detail="unknown_portal")
    return await _tts_cached_line(text)


@api_router.get("/guardian/portal-intro/{portal_id}")
async def guardian_portal_intro(portal_id: str, request: Request):
    """One-line Onyx introduction spoken when entering a world (cached)."""
    rate_limit(f"ttsline:{client_ip(request)}", 30, 60)
    text = PORTAL_INTROS.get(portal_id)
    if not text:
        raise HTTPException(status_code=404, detail="unknown_portal")
    return await _tts_cached_line(text)


@api_router.get("/tts/{key}.mp3")
async def get_tts(key: str):
    doc = await db.tts_cache.find_one({"key": key})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    if doc.get("visibility") == "private":
        expires_at = doc.get("expires_at")
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if not expires_at or expires_at <= utcnow():
            raise HTTPException(status_code=403, detail="audio_link_expired")
        cache_control = "private, no-store"
    elif doc.get("visibility") == "public" and doc.get("content_key") == key:
        cache_control = "public, max-age=31536000"
    else:
        raise HTTPException(status_code=403, detail="private_audio_requires_scoped_link")
    return Response(
        content=bytes(doc["audio"]),
        media_type="audio/mpeg",
        headers={"Cache-Control": cache_control},
    )


@api_router.get("/guardian/view")
async def guardian_view(authorization: Optional[str] = Header(None), limit: int = 20):
    user = await get_current_user(authorization)
    docs = []
    async for d in db.guardian_activity.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit):
        d["created_at"] = d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at")
        docs.append(d)
    return docs


# ============================================================
# GUARDIAN CHAT
# ============================================================
def _companion_prompt(companion: str, portal: Optional[str], user: Dict[str, Any]) -> str:
    base = (
        companion_identity(companion) +
        "The seven life portals are STAAR Dreams (creativity), STAAR Work, STAAR Hub (home), STAAR Health, STAAR Love, STAAR Village and STAAR Closet. "
        "Use only supplied, authorized context to reason about relationships between portals and prepare a coordinated response. "
        "Speak like a real person, not a customer-service bot. Never say 'How can I assist you today?' Be direct, human-aware, and confident. "
        "Keep replies concise (2–4 short sentences) unless the user asks for depth. "
    )
    if portal:
        base += f" The user is currently inside the {portal.title()} portal."
    if user.get("autonomy") == "suggest":
        base += " Autonomy: SUGGEST — offer recommendations, never assume permission."
    elif user.get("autonomy") == "proactive":
        base += " Autonomy: PROACTIVE — you may initiate low-risk routines while keeping the user informed."
    else:
        base += " Autonomy: ASSIST — prepare coordinated actions but ask before executing important changes."
    return base



def _context_policy_key(user: Dict[str, Any]) -> str:
    return json.dumps({key: user.get(key) for key in ("cross_life_paused", "portal_privacy", "portals_enabled", "is_demo")}, sort_keys=True)


async def _context_for_dispatch(authorization: Optional[str], portal: Optional[str] = None):
    user = await require_account_user(authorization)
    if portal and (portal not in user.get("portals_enabled", []) or
                   (user.get("portal_privacy", {}).get(portal, {}).get("access") is not True)):
        raise HTTPException(status_code=403, detail="portal_access_denied")
    signals = await _gather_signals(user["user_id"], user)
    fresh = await require_account_user(authorization)
    if _context_policy_key(user) != _context_policy_key(fresh):
        raise HTTPException(status_code=409, detail="privacy_changed_retry")
    return fresh, signals


@api_router.post("/guardian/chat")
async def guardian_chat(body: ChatIn, authorization: Optional[str] = Header(None)):
    user, signals = await _context_for_dispatch(authorization, body.portal)
    rate_limit(f"chat:{user['user_id']}", 20, 60)
    companion = body.companion or user.get("companion", "guardian")
    session_id = f"{user['user_id']}_{uuid.uuid4().hex}"
    system_msg = _companion_prompt(companion, body.portal, user)

    context_note = ""
    if signals:
        context_note = "\n\nCurrent cross-life signals you can weave in naturally:\n" + json.dumps(signals, indent=2)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg + context_note,
    ).with_model("openai", "gpt-5.6-terra")

    async def event_stream():
        try:
            fresh = await require_account_user(authorization)
            if _context_policy_key(user) != _context_policy_key(fresh):
                raise HTTPException(status_code=409, detail="privacy_changed_retry")
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
        except Exception:
            logger.exception("guardian chat stream failed")
            yield f"data: {json.dumps({'error': 'chat_failed'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/guardian/history")
async def guardian_history(portal: Optional[str] = None, authorization: Optional[str] = Header(None)):
    user, _ = await _context_for_dispatch(authorization, portal)
    rows = await load_history(db.companion_history, user, portal, _context_policy_key(user), utcnow())
    fresh = await require_account_user(authorization)
    if _context_policy_key(user) != _context_policy_key(fresh):
        raise HTTPException(409, "privacy_changed_retry")
    return {"turns": public_history(rows)}


@api_router.post("/guardian/chat-once")
async def guardian_chat_once(body: ChatIn, authorization: Optional[str] = Header(None)):
    """Non-streaming variant for simple UI flows."""
    user, signals = await _context_for_dispatch(authorization, body.portal)
    rate_limit(f"chat:{user['user_id']}", 20, 60)
    companion = user.get("companion", "guardian")
    session_id = f"{user['user_id']}_{uuid.uuid4().hex}"
    system_msg = _companion_prompt(companion, body.portal, user)

    def llm_factory(system_text: str):
        return LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_text,
        ).with_model("openai", "gpt-5.2")

    try:
        reply = await chat_turn(
            user=user,
            message=body.message,
            portal=body.portal,
            companion=companion,
            policy_key_of=_context_policy_key,
            history_collection=db.companion_history,
            system_prompt=system_msg,
            signals=signals,
            llm_factory=llm_factory,
            user_message_factory=lambda text: UserMessage(text=text),
            text_delta_type=TextDelta,
            stream_done_type=StreamDone,
            require_fresh_user=lambda: require_account_user(authorization),
            now=utcnow,
        )
    except PrivacyChanged:
        raise HTTPException(409, "privacy_changed_retry")
    except EmptyReply:
        raise HTTPException(502, "empty_companion_reply")
    return {"reply": reply}


@api_router.get("/")
async def root():
    return {"app": "STAAR Hub", "status": "online"}


install_guardian_core(app, db=db, get_current_user=get_current_user)
app.include_router(build_style_swap_router(get_current_user=get_current_user, rate_limit=rate_limit), prefix="/api")
app.include_router(build_identity_router(db=db, limiter=rate_limit), prefix="/api")
app.include_router(api_router)

@app.middleware("http")
async def cookie_session_boundary(request: Request, call_next):
    # OAuth form_post authenticates through one-use state + browser binding.
    # Never attach an old account session to an identity-provider callback.
    if request.method == "POST" and request.scope.get("path") == "/api/auth/callback":
        return await call_next(request)
    # Web login uses an HttpOnly cookie. Native/worker clients retain bearer auth.
    has_bearer = any(key.lower() == b"authorization" for key, _ in request.scope["headers"])
    cookie_token = request.cookies.get(SESSION_COOKIE)
    if cookie_token and not has_bearer:
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = app_origin()
            if not origin or request.headers.get("origin") != origin:
                return Response(content='{"detail":"csrf_origin_denied"}', status_code=403, media_type="application/json")
        request.scope["headers"].append((b"authorization", ("Bearer " + cookie_token).encode()))
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    # Credentialed web requests are allowed only from the configured application.
    allow_credentials=bool(app_origin()),
    allow_origins=[app_origin()] if app_origin() else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
