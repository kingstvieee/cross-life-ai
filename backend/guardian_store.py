from copy import deepcopy
from typing import Any, Callable, Dict, Optional, Tuple

from guardian_core import GuardianCore, utc_iso
from guardian_workflow import (
    add_portal_contribution,
    arbitrate_portal_weave,
    cancel,
    checkpoint,
    claim_lease,
    dispatch,
    mark_sent,
    mark_worker_retry,
    new_workflow,
    proactive_decision,
    recover_worker,
    reconcile,
    record_provider_event,
    request_operation_cancellation,
    revoke_authority,
    set_proactive_consent,
    set_speech_quiet,
    view,
)


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
            "workflows": {"rsf-fabric-sourcing": new_workflow()},
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
                        "workflows": deepcopy(document.get("workflows", {"rsf-fabric-sourcing": new_workflow()})),
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

    async def get_workflow(self, user_id: str, workflow_id: str) -> Dict[str, Any]:
        document = await self.ensure_user(user_id)
        return view(document.get("workflows", {}).get(workflow_id), workflow_id).__dict__

    async def _mutate_workflow(self, user_id: str, workflow_id: str, mutation: Callable[[Dict[str, Any]], Dict[str, Any]]) -> Dict[str, Any]:
        def apply(core: GuardianCore) -> Dict[str, Any]:
            # Workflow state lives beside the existing mission ledger, in the same
            # optimistic-concurrency write, so checkpoints cannot drift from user scope.
            document_workflow = getattr(core, "workflows", {}).get(workflow_id)
            updated = mutation(deepcopy(document_workflow))
            core.workflows = {**getattr(core, "workflows", {}), workflow_id: updated}
            return view(updated, workflow_id).__dict__

        result, _ = await self._mutate_with_workflows(user_id, apply)
        return result

    async def _mutate_with_workflows(self, user_id: str, mutation: Callable[[GuardianCore], Any], *, retries: int = 3) -> Tuple[Any, Dict[str, Any]]:
        for _ in range(retries):
            document = await self.ensure_user(user_id)
            version = int(document.get("version", 0))
            core = self._hydrate(document)
            core.workflows = deepcopy(document.get("workflows", {"rsf-fabric-sourcing": new_workflow()}))
            result = mutation(core)
            updated_at = utc_iso()
            write = await self.collection.update_one(
                {"user_id": user_id, "version": version},
                {"$set": {"schema_version": 1, "missions": deepcopy(core.missions), "ledger": deepcopy(core.ledger), "private_mode": core.private_mode, "workflows": deepcopy(core.workflows), "updated_at": updated_at}, "$inc": {"version": 1}},
            )
            if getattr(write, "matched_count", 0) == 1:
                return deepcopy(result), {"version": version + 1, "updatedAt": updated_at}
        raise RuntimeError("Guardian state changed concurrently; retry request")

    async def claim_workflow_lease(self, user_id: str, workflow_id: str, *, owner: str, fence: int) -> Dict[str, Any]:
        return await self._mutate_workflow(user_id, workflow_id, lambda workflow: claim_lease(workflow, workflow_id, owner=owner, fence=fence))

    async def record_workflow_checkpoint(self, user_id: str, workflow_id: str, *, owner: str, fence: int, checkpoint_id: str, summary: str, idempotency_key: str) -> Dict[str, Any]:
        return await self._mutate_workflow(user_id, workflow_id, lambda workflow: checkpoint(workflow, workflow_id, owner=owner, fence=fence, checkpoint_id=checkpoint_id, summary=summary, idempotency_key=idempotency_key))

    async def cancel_workflow(self, user_id: str, workflow_id: str, *, owner: str, fence: int, reason: str) -> Dict[str, Any]:
        return await self._mutate_workflow(user_id, workflow_id, lambda workflow: cancel(workflow, workflow_id, owner=owner, fence=fence, reason=reason))

    async def reconcile_workflow(self, user_id: str, workflow_id: str, *, idempotency_key: str, outcome: str, evidence: Dict[str, Any]) -> Dict[str, Any]:
        return await self._mutate_workflow(user_id, workflow_id, lambda workflow: reconcile(workflow, workflow_id, idempotency_key=idempotency_key, outcome=outcome, evidence=evidence))

    async def _workflow_mutation(self, user_id: str, workflow_id: str, fn: Callable[[Dict[str, Any]], Dict[str, Any]]) -> Dict[str, Any]:
        return await self._mutate_workflow(user_id, workflow_id, fn)

    async def set_speech_quiet(self, user_id: str, workflow_id: str, *, quiet: bool) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: set_speech_quiet(workflow, workflow_id, quiet=quiet))

    async def set_proactive_consent(self, user_id: str, workflow_id: str, *, greetings: bool, check_ins: bool) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: set_proactive_consent(workflow, workflow_id, greetings=greetings, check_ins=check_ins))

    async def proactive_decision(self, user_id: str, workflow_id: str, *, kind: str, at: Any) -> Dict[str, Any]:
        document = await self.ensure_user(user_id)
        return proactive_decision(document.get("workflows", {}).get(workflow_id), workflow_id, kind=kind, at=at)

    async def retry_workflow(self, user_id: str, workflow_id: str, *, owner: str, fence: int, error: str) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: mark_worker_retry(workflow, workflow_id, owner=owner, fence=fence, error=error))

    async def recover_workflow(self, user_id: str, workflow_id: str, *, owner: str, fence: int) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: recover_worker(workflow, workflow_id, owner=owner, fence=fence))

    async def revoke_workflow_authority(self, user_id: str, workflow_id: str, *, reason: str) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: revoke_authority(workflow, workflow_id, reason=reason))

    async def dispatch_workflow(self, user_id: str, workflow_id: str, **kwargs: Any) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: dispatch(workflow, workflow_id, **kwargs))

    async def mark_workflow_sent(self, user_id: str, workflow_id: str, *, idempotency_key: str) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: mark_sent(workflow, workflow_id, idempotency_key=idempotency_key))

    async def request_operation_cancellation(self, user_id: str, workflow_id: str, *, idempotency_key: str, reason: str) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: request_operation_cancellation(workflow, workflow_id, idempotency_key=idempotency_key, reason=reason))

    async def record_provider_event(self, user_id: str, workflow_id: str, **kwargs: Any) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: record_provider_event(workflow, workflow_id, **kwargs))

    async def reconcile_workflow_with_authority(self, user_id: str, workflow_id: str, *, authority: Optional[Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: reconcile(workflow, workflow_id, authority=authority, **kwargs))

    async def add_portal_contribution(self, user_id: str, workflow_id: str, **kwargs: Any) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: add_portal_contribution(workflow, workflow_id, **kwargs))

    async def arbitrate_portal_weave(self, user_id: str, workflow_id: str) -> Dict[str, Any]:
        return await self._workflow_mutation(user_id, workflow_id, lambda workflow: arbitrate_portal_weave(workflow, workflow_id))
