# Guardian Architecture Part V
## Guardian Loop Engine
Version: 2026-10-11.2

## Objective
Add repeatable, self-checking, bounded agent loops to Guardian without weakening the Part IV Trust Kernel.

Part V is an orchestration layer. It is **not** an authority layer.

## Governing principle
**The model proposes. The loop coordinates. The Trust Kernel authorizes. The connector executes. The verifier checks. Memory records only what policy allows.**

No loop, skill, planner, checker, or model may grant itself permission or bypass Part IV.

---

# 1. Context Builder
Build the smallest relevant task context packet.

Inputs may include:
- user intent
- active portal
- current project
- relevant governed memories
- selected skill
- allowed tools
- constraints
- recent related actions
- completion criteria

The Context Builder must obey Memory Governance and data minimization. It must not dump unrestricted user history into every model call.

---

# 2. Skill Registry
A skill is a reusable, versioned operating procedure.

Minimum skill schema:
- `skill_id`
- `version`
- `purpose`
- `allowed_inputs`
- `required_context`
- `workflow_steps`
- `constraints`
- `prohibited_actions`
- `required_capabilities`
- `risk_ceiling`
- `checker_rules`
- `success_criteria`
- `retry_limit`
- `timeout`
- `escalation_rule`
- `memory_write_policy`
- `audit_policy`

## Security rule
Skills may request capabilities but can never create or expand grants. Capability resolution is performed only by the Trust Kernel.

---

# 3. Loop Planner
The Loop Planner converts intent + context + skill into a bounded execution plan.

Every plan must declare:
- objective
- trigger
- selected skill
- ordered steps
- capability requests
- expected side effects
- risk estimate
- completion conditions
- retry ceiling
- timeout
- human approval points
- rollback / recovery strategy where available

The plan is untrusted until checked by the Trust Kernel.

---

# 4. Execution Lanes
Parallel work must be isolated.

Each lane receives:
- unique lane ID
- isolated working state
- scoped connector tokens
- scoped memory view
- own logs
- own retry budget

A lane cannot inherit another lane's connector grants or temporary tokens.

Conflicting writes to the same governed resource must be serialized, merged through a deterministic policy, or escalated for approval.

---

# 5. Trust Kernel gate
Every external action from every lane routes through the existing Part IV Trust Kernel.

The Trust Kernel evaluates:
- identity
- capability grant
- autonomy level
- risk
- destination
- requested data
- credential handle
- Safe Mode
- connector scope
- time / expiry

The Loop Engine cannot cache an authorization decision as a permanent permission.

---

# 6. Connector Broker
The Connector Broker binds an authorized action to an isolated connector and short-lived capability token.

Rules:
- no raw credential enters model context
- token is least-privilege
- token expires
- token is connector-specific
- token is action/scope-specific
- revoked tokens fail closed
- connector response is normalized before returning to the loop

---

# 7. Independent Verifier
A separate verifier checks observable results against deterministic success criteria.

The verifier must not rely only on the execution agent's self-report.

Examples:
- expected file actually exists
- calendar event has correct participants/time
- external draft exists but was not sent when send permission is absent
- audit event exists
- no unexpected connector was called
- expected UI or API state is present

For higher-risk tasks, the verifier should use a separate model or deterministic checks where possible.

---

# 8. Repair Loop
If verification fails, the task may be repaired only within a bounded retry budget.

Repair loop rules:
- identify the failed criterion
- preserve evidence/logs
- produce a targeted repair plan
- rerun required Trust Kernel checks
- execute only authorized corrections
- re-verify

## Stop conditions
Immediately stop and escalate when:
- retry budget exhausted
- risk increases above skill ceiling
- permissions are insufficient
- requested action changes materially
- verifier is unavailable for a task requiring verification
- Safe Mode turns on
- ambiguity crosses configured threshold
- conflicting external state cannot be resolved safely

Unbounded autonomous loops are prohibited.

---

# 9. Governed Memory Writeback
A successful loop may propose memory updates, but Memory Governance decides what is retained.

Possible write targets:
- task state
- project state
- learned preference
- skill improvement candidate
- connector health observation
- verified fact

Every write candidate carries:
- source
- evidence
- confidence
- sensitivity
- scope
- retention suggestion
- originating loop/lane

Corrections from a single task are not automatically global policy.

---

# 10. Audit model
Every loop receives a `loop_run_id`.

Audit events should include:
- loop_run_id
- lane_id
- trigger
- user / automation origin
- skill + version
- plan hash
- requested capabilities
- Trust Kernel decisions
- connector calls
- verifier results
- retries
- escalations
- memory write proposals
- final state

Final states:
- `completed_verified`
- `completed_with_user_override`
- `blocked_permission`
- `blocked_risk`
- `failed_verification`
- `escalated_human`
- `stopped_safe_mode`
- `timed_out`
- `retry_exhausted`

---

# 11. Autonomy integration
Part V uses the existing A0-A4 model.

- **A0 Observe**: may read allowed state and produce analysis; no action.
- **A1 Suggest**: may propose plans; no action.
- **A2 Confirm-to-Act**: every action requires user confirmation at the configured boundary.
- **A3 Bounded Auto**: loop may execute pre-approved low/medium-risk actions within strict scope.
- **A4 Scheduled/Delegated**: bounded recurring loop with predefined scope, risk ceiling, schedule/trigger, and verification.

There is no unrestricted autonomy level.

A4 does not mean perpetual permission. Grants remain revocable and scoped.

---

# 12. UI implications
Guardian remains the visible face.

Add a Loop Activity view showing:
- active loops
- current phase
- skill in use
- active lane(s)
- requested permissions
- risk level
- verifier status
- retries used / remaining
- next human approval point
- stop control

A user must be able to stop an active loop and trigger Safe Mode without negotiating with the model.

---

# 13. Simulation-first requirement
Part V begins in Simulation Mode.

Before any production connector execution:
- simulate loop planning
- simulate capability requests
- simulate lane isolation
- simulate connector calls
- run verifier
- exercise retries
- exercise escalation
- verify audit trace
- test Safe Mode interruption

Part IV P0 tests remain mandatory and Part V adds its own P0 tests.

---

# 14. Design priorities
1. Security before convenience
2. Deterministic policy before model judgment
3. Observable finish lines before autonomy
4. Data minimization before broad context
5. Independent verification before completion claims
6. Bounded retries before self-healing claims
7. Human escalation before uncertain action
8. Explicit project separation: STAARWAARDD is not DIGGITSTAAR or Milo
