"""Deterministic Guardian attention and interruption reducer.

Pure state transitions; no microphone, network, database or tool authority.
The authenticated application must persist returned state per user.
"""
from copy import deepcopy
from datetime import datetime
from zoneinfo import ZoneInfo

PORTALS = frozenset(("Home", "Work", "Creativity", "Wellbeing",
                     "Relationships", "Community", "Style", "Starverse", "Staarsonic"))
STATES = frozenset(("idle", "observing", "listening", "thinking", "speaking",
                    "acting", "yielding", "muted"))
TORONTO = ZoneInfo("America/Toronto")


def initial_state():
    return {"schemaVersion": 1, "portal": "Home", "mode": "observing",
            "activeTask": None, "deferredTasks": {}, "speech": None,
            "speechEpoch": 0, "muted": False, "evidence": [],
            "lastEvent": None}


def transition(state, event, *, now=None):
    """Return a new state and declarative effects; never execute effects.

    Event data is untrusted. A verified update requires a trusted server-side
    verification flag, and callers must never derive that flag from client input.
    """
    s = deepcopy(state)
    effects = []
    kind = event.get("type")
    if kind == "PORTAL_CHANGE":
        portal = event.get("portal")
        if portal not in PORTALS:
            raise ValueError("unknown_portal")
        s["portal"] = portal
    elif kind == "VERIFIED_UPDATE":
        if event.get("trustedVerified") is not True:
            raise ValueError("unverified_update")
        task_id = event.get("taskId")
        evidence = event.get("evidence")
        if not isinstance(task_id, str) or not task_id or not isinstance(evidence, dict) or not evidence:
            raise ValueError("missing_task_evidence")
        s["activeTask"] = task_id
        s["evidence"].append({"taskId": task_id, "source": deepcopy(evidence)})
        if not s["muted"] and s["mode"] not in ("speaking", "acting", "listening"):
            effects.append({"type": "OFFER_BRIEFING", "taskId": task_id})
    elif kind == "SPEECH_START":
        if s["muted"]:
            raise ValueError("speech_muted")
        s["speechEpoch"] += 1
        s["speech"] = {"id": event.get("speechId"), "epoch": s["speechEpoch"]}
        s["mode"] = "speaking"
        effects.append({"type": "START_AV_SYNC", "epoch": s["speechEpoch"]})
    elif kind in ("INTERRUPT", "MUTE", "SPEECH_STOP"):
        s["speechEpoch"] += 1
        s["speech"] = None
        effects.append({"type": "STOP_AUDIO_AND_VISEMES", "epoch": s["speechEpoch"]})
        if kind == "MUTE":
            s["muted"] = True
        s["mode"] = "muted" if s["muted"] else ("listening" if kind == "INTERRUPT" else "observing")
    elif kind == "UNMUTE":
        s["muted"] = False
        s["mode"] = "observing"
    elif kind == "DEFER":
        task_id = event.get("taskId") or s["activeTask"]
        if not task_id or not any(x["taskId"] == task_id for x in s["evidence"]):
            raise ValueError("unknown_or_unverified_task")
        if now is None:
            raise ValueError("trusted_clock_required")
        local = now.astimezone(TORONTO)
        if event.get("until") != "tomorrow":
            raise ValueError("unsupported_deferral")
        next_day = local.date().fromordinal(local.date().toordinal() + 1)
        until = datetime.combine(next_day, datetime.min.time(), tzinfo=TORONTO)
        s["deferredTasks"][task_id] = {"until": until.isoformat(), "status": "deferred"}
        s["activeTask"] = None if s["activeTask"] == task_id else s["activeTask"]
        s["mode"] = "yielding"
        effects.append({"type": "PERSIST_DEFERRAL", "taskId": task_id, "until": until.isoformat()})
    else:
        raise ValueError("unknown_event")
    s["lastEvent"] = kind
    return s, effects
