# Definition of Done

Part IV is considered implemented only when:

- Simulation Mode is functional end-to-end.
- Guardian routes every simulated action through the Trust Kernel.
- No direct tool bypass path exists.
- Permission Centre displays capability grants and activity history.
- A0-A4 autonomy levels are enforced.
- Risk classification is enforced.
- Safe Mode prevents all simulated external actions.
- Audit events are append-only in the prototype.
- Credentials are represented through vault handles, never raw values.
- P0 acceptance tests all pass.
- Mocked versus real integrations are visibly labeled.
- Manus produces an updated architecture diagram and implementation status map.

Anything short of this is `IN PROGRESS`, not complete.



## Part V addendum
Part V is considered implemented only when:
- Context Builder uses only relevant governed context.
- Skill Registry is versioned and validated.
- Skills cannot grant permissions or raise autonomy.
- Loop Planner produces explicit finish lines, retry ceilings, and escalation rules.
- Execution lanes are isolated.
- Every connector action still routes through Trust Kernel.
- Independent Verifier checks observable results.
- Executor self-report alone cannot produce `completed_verified`.
- Repair loops are bounded.
- Memory writeback is governed.
- Safe Mode stops active Part V execution.
- Every Part V P0 acceptance test passes.

Until then, Part V status is `IN PROGRESS`.
