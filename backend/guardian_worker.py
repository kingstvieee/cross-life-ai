"""Guardian mission execution coordinator.

A conservative, opt-in worker: it only runs registered non-destructive handlers.
The calling service must provide the collection, authentication and durable
scheduler. No outbound notifications or external actions are enabled.
"""
import asyncio
from guardian_mission_engine import (
    claim_mission, recover_expired_leases, renew_lease, transition,
    authorize_action,
)

class GuardianWorker:
    def __init__(self, collection, handlers, worker_id, *, lease_seconds=60, scoped=False):
        self.collection = collection
        self.handlers = dict(handlers)
        self.worker_id = worker_id
        self.lease_seconds = lease_seconds
        self.scope = {"handler_names": tuple(self.handlers)} if scoped else {}

    async def _heartbeat(self, owner_id, mission_id, token, stop):
        while not stop.is_set():
            try:
                await asyncio.wait_for(stop.wait(), timeout=self.lease_seconds / 3)
                return
            except asyncio.TimeoutError:
                await renew_lease(self.collection, owner_id=owner_id,
                                  mission_id=mission_id, lease_token=token,
                                  lease_seconds=self.lease_seconds)

    async def run_once(self):
        await recover_expired_leases(self.collection, **self.scope)
        mission = await claim_mission(self.collection, worker_id=self.worker_id,
                                      lease_seconds=self.lease_seconds, **self.scope)
        if not mission:
            return False
        owner = mission["owner_id"]
        mid = mission["mission_id"]
        token = mission["lease_token"]
        mission = await transition(
            self.collection, owner_id=owner, mission_id=mid,
            expected="leased", target="running", lease_token=token,
        )
        handler_name = mission.get("handler")
        handler = self.handlers.get(handler_name)
        if handler is None:
            await transition(self.collection, owner_id=owner, mission_id=mid,
                             expected="running", target="blocked", lease_token=token,
                             checkpoint={"reason": "unregistered_handler"})
            return True
        if not authorize_action(
            approved=mission.get("approved", False),
            action_scope=handler_name,
            granted_scopes=mission.get("granted_scopes", []),
            cost_cad=mission.get("estimated_cost_cad"),
            budget_cad=mission.get("budget_cad"),
        ):
            await transition(self.collection, owner_id=owner, mission_id=mid,
                             expected="running", target="awaiting_approval",
                             lease_token=token)
            return True
        stop = asyncio.Event()
        heartbeat = asyncio.create_task(self._heartbeat(owner, mid, token, stop))
        execution = asyncio.create_task(handler(mission))
        try:
            done, _ = await asyncio.wait(
                (execution, heartbeat), return_when=asyncio.FIRST_COMPLETED,
            )
            if heartbeat in done:
                # Stop issuing work. Expired running leases are reconciled
                # separately because cancellation cannot undo provider effects.
                await heartbeat
                raise RuntimeError("Guardian heartbeat stopped during execution")
            stop.set()
            await heartbeat
            try:
                result = execution.result()
            except Exception:
                # An exception alone does not establish that a tool did nothing.
                await transition(
                    self.collection, owner_id=owner, mission_id=mid,
                    expected="running", target="blocked", lease_token=token,
                    checkpoint={"reason": "handler_outcome_requires_reconciliation"},
                )
                return True
            await transition(self.collection, owner_id=owner, mission_id=mid,
                             expected="running", target="verifying",
                             lease_token=token, checkpoint={"result": result})
            return True
        finally:
            stop.set()
            if not execution.done():
                execution.cancel()
            await asyncio.gather(execution, heartbeat, return_exceptions=True)

    async def serve(self, stop_event, *, poll_seconds=5):
        if poll_seconds <= 0:
            raise ValueError("poll_seconds must be positive")
        while not stop_event.is_set():
            await self.run_once()
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=poll_seconds)
            except asyncio.TimeoutError:
                pass
