from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

PORTALS = ["Creativity", "Work", "Home", "Wellbeing", "Relationships", "Community", "Style"]
MISSION_STATUSES = ["active", "waiting", "blocked", "approval-needed", "completed", "paused"]
LEDGER_STATES = ["PLANNED", "ATTEMPTED", "BLOCKED", "WAITING", "APPROVAL_NEEDED", "VERIFIED_COMPLETE"]

INITIAL_MISSIONS = [
    {"id": "hub-core-build", "title": "Hub Core Build", "outcome": "Build the STAARWAARDD project up", "portals": ["Work"], "status": "active", "priority": 100, "timeSensitivity": "high", "currentState": "Guardian Core product integration is isolated on the canonical product repository.", "nextAction": "Verify the product-native mission registry and then connect it to durable storage.", "blocker": None, "approvalRequired": False, "lastVerifiedUpdate": None},
    {"id": "puppy-search", "title": "Puppy Search", "outcome": "Find the right Cane Corso × Dogo Argentino puppy in Toronto", "portals": ["Home", "Relationships"], "status": "active", "priority": 70, "timeSensitivity": "medium", "currentState": "Monitoring/research mission. Seller contact must be drafted and held for review.", "nextAction": "Review newly available Toronto matches when a monitoring source supplies them.", "blocker": "External listing source is not connected to the product runtime yet.", "approvalRequired": False, "lastVerifiedUpdate": None},
    {"id": "rsf-fabric-sourcing", "title": "RSF Fabric Sourcing", "outcome": "Source high-quality materials for RISING STAARDFORM prototypes", "portals": ["Style", "Work", "Creativity"], "status": "active", "priority": 65, "timeSensitivity": "medium", "currentState": "Material sourcing mission preserving the established architectural luxury direction.", "nextAction": "Build a verified shortlist of prototype fabrics and embellishment materials.", "blocker": "External supplier/search adapter is not connected to the product runtime yet.", "approvalRequired": False, "lastVerifiedUpdate": None},
]


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GuardianCore:
    """Product-native Guardian mission registry.

    This V1 adapter intentionally remains process-local. The canonical backend already
    has MongoDB; durable per-user persistence is the next integration step rather than
    pretending this in-memory registry is durable on a serverless/runtime restart.
    """

    def __init__(self) -> None:
        now = utc_iso()
        self.missions: Dict[str, Dict[str, Any]] = {m["id"]: {**deepcopy(m), "createdAt": now, "updatedAt": now} for m in INITIAL_MISSIONS}
        self.ledger: List[Dict[str, Any]] = []
        self.private_mode = False
        for mission in INITIAL_MISSIONS:
            self.log(mission_id=mission["id"], state="PLANNED", summary=f"Mission registered: {mission['title']}.")

    def log(self, *, state: str, summary: str, mission_id: Optional[str] = None, evidence: Any = None, requires_approval: bool = False) -> Dict[str, Any]:
        if state not in LEDGER_STATES:
            raise ValueError(f"Invalid ledger state: {state}")
        entry = {"id": f"evt-{len(self.ledger)+1}", "missionId": mission_id, "state": state, "summary": str(summary or ""), "evidence": evidence, "requiresApproval": bool(requires_approval), "timestamp": utc_iso()}
        self.ledger.append(entry)
        return deepcopy(entry)

    def list_missions(self, portal: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if portal and portal not in PORTALS:
            raise ValueError(f"Unknown portal: {portal}")
        values = [m for m in self.missions.values() if (not portal or portal in m["portals"]) and (not status or m["status"] == status)]
        return deepcopy(sorted(values, key=lambda m: m["priority"], reverse=True))

    def get_mission(self, mission_id: str) -> Optional[Dict[str, Any]]:
        mission = self.missions.get(mission_id)
        return deepcopy(mission) if mission else None

    def update_mission(self, mission_id: str, patch: Dict[str, Any], *, ledger_state: Optional[str] = None, summary: Optional[str] = None, evidence: Any = None) -> Dict[str, Any]:
        mission = self.missions.get(mission_id)
        if not mission:
            raise KeyError("Mission not found")
        if patch.get("status") and patch["status"] not in MISSION_STATUSES:
            raise ValueError("Invalid mission status")
        if patch.get("portals"):
            unknown = [p for p in patch["portals"] if p not in PORTALS]
            if unknown:
                raise ValueError(f"Unknown portal: {unknown[0]}")
        next_mission = {**mission, **deepcopy(patch), "id": mission_id, "updatedAt": utc_iso()}
        if next_mission["status"] == "completed" and (ledger_state != "VERIFIED_COMPLETE" or evidence in (None, "", {}, [])):
            raise ValueError("Completion requires VERIFIED_COMPLETE with non-empty evidence")
        if ledger_state:
            entry = self.log(mission_id=mission_id, state=ledger_state, summary=summary or f"Updated {mission['title']}", evidence=evidence, requires_approval=next_mission.get("approvalRequired", False))
            if ledger_state == "VERIFIED_COMPLETE":
                next_mission["lastVerifiedUpdate"] = entry["timestamp"]
        self.missions[mission_id] = next_mission
        return deepcopy(next_mission)

    def briefing(self) -> Dict[str, Any]:
        active = [m for m in self.list_missions() if m["status"] not in ("completed", "paused")]
        return {"guardian": "core-v1-product", "temporal": {"now": utc_iso(), "timezone": "America/Toronto"}, "privateMode": self.private_mode, "priority": active[0] if active else None, "activeCount": len(active), "approvalNeeded": [m for m in active if m["status"] == "approval-needed" or m.get("approvalRequired")], "blocked": [m for m in active if m["status"] == "blocked" or m.get("blocker")], "missions": active, "recentActivity": deepcopy(self.ledger[-10:])}

    def set_private_mode(self, enabled: bool) -> Dict[str, bool]:
        self.private_mode = bool(enabled)
        self.log(state="VERIFIED_COMPLETE", summary=f"Private Mode {'enabled' if self.private_mode else 'disabled'}.", evidence={"setting": "privateMode", "value": self.private_mode})
        return {"privateMode": self.private_mode}


guardian_core = GuardianCore()
