"""Per-user durable simulation state, with atomic effects + appended audit events."""
from copy import deepcopy
from typing import Any

from guardian_control import GuardianControl, initial_state


class GuardianControlStore:
    def __init__(self, collection: Any):
        self.collection = collection

    async def load(self, subject):
        if not subject:
            raise ValueError("authenticated_subject_required")
        try:
            await self.collection.update_one(
                {"user_id": subject},
                {"$setOnInsert": {"user_id": subject, "version": 0, "schema_version": 1, "state": initial_state(), "audit": []}},
                upsert=True,
            )
        except Exception as exc:
            # Concurrent first visits may race the unique user index.
            if getattr(exc, "code", None) != 11000:
                raise
        doc = await self.collection.find_one({"user_id": subject}, {"_id": 0})
        if not doc:
            raise RuntimeError("guardian_control_unavailable")
        return doc

    async def status(self, subject):
        await self.mutate(subject, "purge_expired_memory")
        doc = await self.load(subject)
        result = GuardianControl(subject, doc["state"]).status()
        result["persistence"] = {"scope": "per-user", "version": doc["version"], "schema_version": 1}
        result["audit"] = deepcopy(doc["audit"][-50:])
        return result

    async def mutate(self, subject, method, *args):
        # Only named server routes call this method; there is no generic HTTP dispatch.
        for _ in range(3):
            doc = await self.load(subject)
            engine = GuardianControl(subject, doc["state"])
            if method != "purge_expired_memory":
                engine.purge_expired_memory()
            result = getattr(engine, method)(*args)
            if engine.state == doc["state"] and not engine.events:
                return result
            update = {"$set": {"state": deepcopy(engine.state)}, "$inc": {"version": 1}}
            if engine.events:
                update["$push"] = {"audit": {"$each": deepcopy(engine.events)}}
            write = await self.collection.update_one({"user_id": subject, "version": doc["version"]}, update)
            if getattr(write, "matched_count", 0) == 1:
                return result
        raise RuntimeError("guardian_control_conflict")
