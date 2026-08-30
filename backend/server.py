from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import StreamingResponse, Response
import hashlib
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

COMPANIONS = {
    "guardian": {
        "name": "Guardian",
        "voice": "Protective, intelligent, observant, grounded, confident. Direct without being cold. Never a customer-service chatbot.",
    },
    "kaia": {
        "name": "Kaia",
        "voice": "Warm without being sweet, emotionally perceptive, patient, conversational.",
    },
    "atlas": {
        "name": "Atlas",
        "voice": "Direct, grounded, concise, protective, practical, calm.",
    },
}


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
    message: str
    portal: Optional[str] = None
    companion: Optional[str] = "guardian"


class CoordinateIn(BaseModel):
    approve: bool = True


class ScenarioIn(BaseModel):
    scenario: str = "evening"


class SpeakIn(BaseModel):
    coordination_id: str


# ============================================================
# AUTH HELPERS
# ============================================================
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
    return user


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

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        default_privacy = {p["id"]: {"access": True, "share": True, "confirm": False} for p in PORTALS}
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
async def auth_demo():
    """Create ephemeral demo session so judges can experience app instantly."""
    demo_email = f"demo_{uuid.uuid4().hex[:8]}@staar.demo"
    user_id = f"demo_{uuid.uuid4().hex[:10]}"
    default_privacy = {p["id"]: {"access": True, "share": True, "confirm": False} for p in PORTALS}
    await db.users.insert_one({
        "user_id": user_id,
        "email": demo_email,
        "name": "Demo Guest",
        "picture": None,
        "onboarding_complete": True,
        "autonomy": "assist",
        "companion": "guardian",
        "portals_enabled": [p["id"] for p in PORTALS],
        "portal_privacy": default_privacy,
        "cross_life_paused": False,
        "is_demo": True,
        "created_at": utcnow(),
    })
    session_token = f"demo_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": utcnow() + timedelta(days=1),
        "created_at": utcnow(),
    })
    # Seed demo data (Work overload scenario)
    await _seed_demo_data(user_id)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user_public(user)}


@api_router.get("/auth/me")
async def auth_me(user: Dict[str, Any] = None, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return user_public(user)


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        await db.user_sessions.delete_one({"session_token": authorization[7:]})
    return {"ok": True}


@api_router.post("/user/profile")
async def update_profile(update: OnboardingUpdate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    patch = {k: v for k, v in update.dict().items() if v is not None}
    if patch:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": patch})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return user_public(fresh)


@api_router.post("/user/privacy")
async def update_privacy(update: PrivacyUpdate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
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
    user = await get_current_user(authorization)
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
    user = await get_current_user(authorization)
    await _seed_demo_data(user["user_id"])
    return {"ok": True}


@api_router.post("/demo/scenario")
async def load_scenario(body: ScenarioIn, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if body.scenario == "morning":
        await _seed_morning_data(user["user_id"])
    else:
        await _seed_demo_data(user["user_id"])
    return {"ok": True, "scenario": body.scenario}


@api_router.get("/community/events")
async def community_events():
    return DEMO_EVENTS


# ============================================================
# CROSS-LIFE CONTEXT ENGINE
# ============================================================
async def _gather_signals(user_id: str) -> List[Dict[str, Any]]:
    """Analyze portal state and produce structured cross-life context signals."""
    signals: List[Dict[str, Any]] = []
    states = {}
    async for doc in db.portal_state.find({"user_id": user_id}, {"_id": 0}):
        states[doc["portal"]] = doc.get("data", {})

    work = states.get("work", {})
    if work.get("workload") == "high" or work.get("stress", 0) >= 7:
        signals.append({
            "sourcePortal": "work",
            "type": "workload",
            "severity": "high",
            "confidence": 0.91,
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
                "confidence": 0.97,
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
            "confidence": 0.93,
            "timestamp": utcnow().isoformat(),
            "suggestedTargets": ["work", "style"],
            "summary": f"You slept {wellbeing.get('sleep_hours', 4.5)} hours. Recovery is low ahead of your 9:30 AM presentation.",
        })
    elif wellbeing.get("stress", 0) >= 6:
        signals.append({
            "sourcePortal": "wellbeing",
            "type": "elevated_stress",
            "severity": "medium",
            "confidence": 0.88,
            "suggestedTargets": ["home", "work"],
            "summary": "Physiological stress is elevated. Decompression window recommended.",
        })

    return signals


@api_router.get("/guardian/signals")
async def guardian_signals(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if user.get("cross_life_paused"):
        return {"paused": True, "signals": []}
    signals = await _gather_signals(user["user_id"])
    return {"paused": False, "signals": signals}


@api_router.post("/guardian/coordinate-evening")
async def coordinate_evening(body: CoordinateIn, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    user_id = user["user_id"]
    signals = await _gather_signals(user_id)

    # Build coordinated actions across affected portals
    actions: List[Dict[str, Any]] = []
    now_iso = utcnow().isoformat()

    work_state = await db.portal_state.find_one({"user_id": user_id, "portal": "work"}, {"_id": 0}) or {}
    work_data = work_state.get("data", {})
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
            "detail": "Route checked. Uber pre-booked for 7:20 PM. Doors + lights lock automatically.",
            "items": [f"→ {event['location']}", "ETA 7:55 PM", "Weather: rain"],
        })

    coordination = {
        "id": f"coord_{uuid.uuid4().hex[:10]}",
        "user_id": user_id,
        "created_at": utcnow(),
        "created_at_iso": now_iso,
        "approved": body.approve,
        "signals": signals,
        "actions": actions,
        "scenario": "evening",
        "trigger": "work_overload_with_evening_commitment",
        "spoken_summary": (
            "Here's what I did. Work is re-sorted — only what truly needs you stays tonight, the rest waits until tomorrow. "
            "I queued a twenty minute decompression and muted your notifications. Home is prepped, warm lights at seven. "
            "Your eight PM with Amara at The Broadview is protected. Leave by seven twenty. Rain is likely, so I laid out the wool overcoat and waterproof boots. "
            "Go finish that one task. I've got the rest of your evening."
        ),
    }
    await db.guardian_activity.insert_one(coordination)

    # Apply state mutations (mark decompression started, delay routine, etc.)
    if body.approve:
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": "wellbeing"},
            {"$set": {"data.decompression_active": True, "data.last_break": now_iso}},
            upsert=True,
        )
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": "home"},
            {"$set": {"data.routine_started": True, "data.evening_lights": "warm", "data.lights": "warm"}},
            upsert=True,
        )
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": "style"},
            {"$set": {"data.planned_outfit": {
                "name": "Rain-ready smart casual",
                "items": ["Charcoal knit", "Wool overcoat", "Waterproof chelsea boots"],
            }}},
            upsert=True,
        )

    return {
        "coordination_id": coordination["id"],
        "actions": actions,
        "signals": signals,
    }


@api_router.post("/guardian/coordinate-morning")
async def coordinate_morning(body: CoordinateIn, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    user_id = user["user_id"]
    signals = await _gather_signals(user_id)
    now_iso = utcnow().isoformat()

    wb_state = await db.portal_state.find_one({"user_id": user_id, "portal": "wellbeing"}, {"_id": 0}) or {}
    sleep_hours = wb_state.get("data", {}).get("sleep_hours", 4.5)

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

    coordination = {
        "id": f"coord_{uuid.uuid4().hex[:10]}",
        "user_id": user_id,
        "created_at": utcnow(),
        "created_at_iso": now_iso,
        "approved": body.approve,
        "signals": signals,
        "actions": actions,
        "scenario": "morning",
        "trigger": "poor_recovery_before_presentation",
        "spoken_summary": (
            "Good morning. You slept about four and a half hours, so I softened the day. "
            "Your nine thirty presentation is safe — I drafted your standup notes and pushed your first meeting by thirty minutes. "
            "Start with water and ten minutes of light stretching. I laid out a low effort outfit that still reads sharp. "
            "Take it slow. I've got the rest."
        ),
    }
    await db.guardian_activity.insert_one(coordination)

    if body.approve:
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": "wellbeing"},
            {"$set": {"data.gentle_start_active": True}},
            upsert=True,
        )
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": "style"},
            {"$set": {"data.planned_outfit": {
                "name": "Low-effort confidence",
                "items": ["Soft merino crew", "Dark tapered trousers", "White leather sneakers"],
            }}},
            upsert=True,
        )
        await db.portal_state.update_one(
            {"user_id": user_id, "portal": "home"},
            {"$set": {"data.lights": "sunrise", "data.temperature": 22}},
            upsert=True,
        )

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
    user = await get_current_user(authorization)
    coord = await db.guardian_activity.find_one(
        {"id": body.coordination_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not coord:
        raise HTTPException(status_code=404, detail="coordination_not_found")
    text = coord.get("spoken_summary") or "Coordination complete. Everything is handled."
    key = hashlib.sha256(f"{text}|onyx|1.0|tts-1|mp3".encode()).hexdigest()[:32]
    cached = await db.tts_cache.find_one({"key": key}, {"_id": 0, "key": 1})
    if not cached:
        try:
            audio = await _tts().generate_speech(text=text, model="tts-1", voice="onyx")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"tts_failed: {e}")
        await db.tts_cache.insert_one({"key": key, "audio": audio, "created_at": utcnow()})
    return {"url": f"/api/tts/{key}.mp3"}


GREETING_TEXT = "Welcome. I am your Guardian. Seven worlds, one presence. Let us begin."

PORTAL_INTROS = {
    "creativity": "The Creativity world. Let's give your ideas room to move.",
    "work": "The Work world. One clear step at a time.",
    "home": "The Home world. Calm, safe, and in your control.",
    "wellbeing": "The Wellbeing world. Energy and rest, in balance.",
    "relationships": "The Relationships world. The people who matter, kept close.",
    "events": "The Events world. Your city, ready when you are.",
    "style": "The Style world. Show up as yourself, effortlessly.",
}


async def _tts_cached_line(text: str) -> dict:
    """Generate (or reuse cached) Onyx TTS for a fixed line; returns url + text."""
    key = hashlib.sha256(f"{text}|onyx|1.0|tts-1|mp3".encode()).hexdigest()[:32]
    cached = await db.tts_cache.find_one({"key": key}, {"_id": 0, "key": 1})
    if not cached:
        try:
            audio = await _tts().generate_speech(text=text, model="tts-1", voice="onyx")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"tts_failed: {e}")
        await db.tts_cache.insert_one({"key": key, "audio": audio, "created_at": utcnow()})
    return {"url": f"/api/tts/{key}.mp3", "text": text}


@api_router.get("/guardian/greeting")
async def guardian_greeting():
    """Short spoken hub welcome in the Guardian's Onyx voice (cached)."""
    return await _tts_cached_line(GREETING_TEXT)


@api_router.get("/guardian/portal-intro/{portal_id}")
async def guardian_portal_intro(portal_id: str):
    """One-line Onyx introduction spoken when entering a world (cached)."""
    text = PORTAL_INTROS.get(portal_id)
    if not text:
        raise HTTPException(status_code=404, detail="unknown_portal")
    return await _tts_cached_line(text)


@api_router.get("/tts/{key}.mp3")
async def get_tts(key: str):
    doc = await db.tts_cache.find_one({"key": key})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return Response(
        content=bytes(doc["audio"]),
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=31536000"},
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
    voice = COMPANIONS.get(companion, COMPANIONS["guardian"])["voice"]
    base = (
        f"You are {COMPANIONS.get(companion, COMPANIONS['guardian'])['name']}, the central intelligence of STAAR Hub, an AI Life House. "
        f"Voice: {voice} "
        "STAAR Hub organizes the user's life into seven portals: Creativity, Work, Home, Wellbeing, Relationships, Community, Style. "
        "Your unique capability is Cross-Life Context Intelligence — you observe how something in one portal affects others and coordinate a response. "
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


@api_router.post("/guardian/chat")
async def guardian_chat(body: ChatIn, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    companion = body.companion or user.get("companion", "guardian")
    session_id = f"{user['user_id']}_{companion}_{body.portal or 'hub'}"
    system_msg = _companion_prompt(companion, body.portal, user)

    signals = await _gather_signals(user["user_id"])
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
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.post("/guardian/chat-once")
async def guardian_chat_once(body: ChatIn, authorization: Optional[str] = Header(None)):
    """Non-streaming variant for simple UI flows."""
    user = await get_current_user(authorization)
    companion = body.companion or user.get("companion", "guardian")
    session_id = f"{user['user_id']}_{companion}_{body.portal or 'hub'}_once"
    system_msg = _companion_prompt(companion, body.portal, user)
    signals = await _gather_signals(user["user_id"])
    context_note = ("\n\nCurrent cross-life signals:\n" + json.dumps(signals)) if signals else ""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg + context_note,
    ).with_model("openai", "gpt-5.6-terra")

    parts: List[str] = []
    async for ev in chat.stream_message(UserMessage(text=body.message)):
        if isinstance(ev, TextDelta):
            parts.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return {"reply": "".join(parts)}


@api_router.get("/")
async def root():
    return {"app": "STAAR Hub", "status": "online"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
