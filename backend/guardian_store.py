from copy import deepcopy
from typing import Any, Callable, Dict, Optional, Tuple

from guardian_core import GuardianCore, utc_iso


class GuardianStore:
    """Durable, per-user persistence adapter for Guardian Core.

    The store keeps one versioned Guardian document per authenticated STAARWAARDD
    user. Mutations use optimistic concurrency so two requests cannot silently
    overwrite each other's mission or ledger updates.
    """

    def __init__(self, collection: Any) -> None:
        self.collection = collection

    def _new_document(self, user_id: str) -> Dict[str, Any]:
        core = GuardianCore()
        return {
            "user_id": user_id,
            "schema_version": 1,
            "version": 0,
            "missions": deepcopy(core.missions),
            "ledger": deepcopy(core.ledger),
            "private_mode": core.private_mode,
            "created_at": utc_iso(),
            "updated_at": utc_iso(),
        }

    def _hydrate(self, document: Dict[str, Any]) -> GuardianCore:
        core = GuardianCore()
        core.missions = deepcopy(document.get("missions", core.missions))
        core.ledger = deepcopy(document.get("ledger", core.ledger))
        core.private_mode = bool(document.get("private_mode", False))
        return core

    async def ensure_user(self, user_id: str) -> Dict[str, Any]:
        if not user_id:
            raise ValueError("user_id is required")
        await self.collection.update_one(
            {"user_id": user_id},
            {"$setOnInsert": self._new_document(user_id)},
            upsert=True,
        )
        document = await self.collection.find_one({"user_id": user_id}, {"_id": 0})
        if not document:
            raise RuntimeError("Guardian state could not be initialized")
        return document

    async def _mutate(
        self,
        user_id: str,
        mutation: Callable[[GuardianCore], Any],
        *,
        retries: int = 3,
    ) -> Tuple[Any, Dict[str, Any]]:
        for _ in range(retries):
            document = await self.ensure_user(user_id)
            version = int(document.get("version", 0))
            core = self._hydrate(document)
            result = mutation(core)
            updated_at = utc_iso()
            write = await self.collection.update_one(
                {"user_id": user_id, "version": version},
                {
                    "$set": {
                        "schema_version": 1,
                        "missions": deepcopy(core.missions),
                        "ledger": deepcopy(core.ledger),
                        "private_mode": core.private_mode,
                        "updated_at": updated_at,
                    },
                    "$inc": {"version": 1},
                },
            )
            if getattr(write, "matched_count", 0) == 1:
                return deepcopy(result), {
                    "version": version + 1,
                    "updatedAt": updated_at,
                }
        raise RuntimeError("Guardian state changed concurrently; retry request")

    async def briefing(self, user_id: str) -> Dict[str, Any]:
        document = await self.ensure_user(user_id)
        briefing = self._hydrate(document).briefing()
        briefing["persistence"] = {
            "durable": True,
            "scope": "per-user",
            "schemaVersion": document.get("schema_version", 1),
            "version": document.get("version", 0),
        }
        return briefing

    async def list_missions(
        self,
        user_id: str,
        *,
        portal: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Any:
        document = await self.ensure_user(user_id)
        return self._hydrate(document).list_missions(portal=portal, status=status)

    async def get_mission(self, user_id: str, mission_id: str) -> Optional[Dict[str, Any]]:
        document = await self.ensure_user(user_id)
        return self._hydrate(document).get_mission(mission_id)

    async def update_mission(
        self,
        user_id: str,
        mission_id: str,
        patch: Dict[str, Any],
        *,
        ledger_state: Optional[str] = None,
        summary: Optional[str] = None,
        evidence: Any = None,
    ) -> Dict[str, Any]:
        result, _ = await self._mutate(
            user_id,
            lambda core: core.update_mission(
                mission_id,
                patch,
                ledger_state=ledger_state,
                summary=summary,
                evidence=evidence,
            ),
        )
        return result

    async def set_private_mode(self, user_id: str, enabled: bool) -> Dict[str, bool]:
        result, _ = await self._mutate(
            user_id,
            lambda core: core.set_private_mode(enabled),
        )
        return result
