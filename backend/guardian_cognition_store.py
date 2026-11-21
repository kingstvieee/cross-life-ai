"""Per-account durable Guardian cognition, separate from workflow state.

No external action is executed by this adapter. Event verification is server-side:
the public-facing caller may not assert trustedVerified.
"""
from copy import deepcopy
from datetime import datetime, timezone
from guardian_cognition import initial_state, transition

PUBLIC_EVENTS = frozenset(("PORTAL_CHANGE", "SPEECH_START", "INTERRUPT",
                           "MUTE", "UNMUTE", "SPEECH_STOP", "DEFER"))


class GuardianCognitionStore:
    def __init__(self, collection):
        self.collection = collection

    async def read(self, user_id):
        if not user_id:
            raise ValueError("authenticated_user_required")
        await self.collection.update_one(
            {"user_id": user_id},
            {"$setOnInsert": {"user_id": user_id, "version": 0,
                              "state": initial_state()}},
            upsert=True,
        )
        record = await self.collection.find_one({"user_id": user_id}, {"_id": 0})
        if not record:
            raise RuntimeError("cognition_state_unavailable")
        return deepcopy(record["state"])

    async def apply(self, user_id, event, *, trusted=False, retries=3):
        if not isinstance(event, dict):
            raise ValueError("invalid_event")
        kind = event.get("type")
        if kind == "VERIFIED_UPDATE":
            if not trusted:
                raise PermissionError("trusted_worker_required")
        elif kind not in PUBLIC_EVENTS:
            raise ValueError("unsupported_event")
        if "trustedVerified" in event and not trusted:
            raise PermissionError("verification_flag_is_server_owned")
        normalized = deepcopy(event)
        if kind == "VERIFIED_UPDATE":
            normalized["trustedVerified"] = True
        for _ in range(retries):
            await self.read(user_id)
            record = await self.collection.find_one({"user_id": user_id}, {"_id": 0})
            version = record["version"]
            state, effects = transition(
                record["state"], normalized, now=datetime.now(timezone.utc))
            result = await self.collection.update_one(
                {"user_id": user_id, "version": version},
                {"$set": {"state": state}, "$inc": {"version": 1}})
            if result.matched_count == 1:
                return {"state": state, "effects": effects, "version": version + 1}
        raise RuntimeError("guardian_cognition_concurrent_update")
