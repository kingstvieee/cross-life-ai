# Manus Implementation Order — Part V Guardian Loop Engine

## Dependency
Do not use Part V to bypass unfinished Part IV work. The Trust Kernel remains the mandatory authority layer.

## V0 — Inspect current state
- confirm current Part IV implementation status
- map every action path and connector path
- identify any direct model-to-tool path
- identify current memory implementation
- identify current scheduler/background-task implementation
- identify any existing agent or workflow orchestration

## V1 — Loop data model
Build:
- loop_run_id
- lane_id
- objective
- trigger
- skill reference/version
- completion criteria
- retry limit
- timeout
- status enum
- escalation reason

Simulation only.

## V2 — Skill Registry
Implement versioned skill definitions and validation.
Reject any skill attempting to:
- grant permissions
- raise autonomy
- access raw credentials
- disable verification
- disable Safe Mode

## V3 — Context Builder
Create minimal task-specific context packets from governed sources.
Add tests that unrelated/private context is excluded.

## V4 — Loop Planner + Execution Lane
Create bounded plans and isolated lane state.
All connector requests route through Trust Kernel.

## V5 — Independent Verifier + Repair Loop
Implement checker separation.
A loop may not return `completed_verified` based solely on executor self-report.
Add retry budget and human escalation.

## V6 — Governed Memory Writeback
Successful tasks may propose memory updates.
Memory Governance decides final retention/scope.

## V7 — Guardian Loop Activity UI
Add to the Guardian experience:
- active loop
- current step
- skill
- lane count
- risk
- permission state
- verifier state
- retries
- stop button
- Safe Mode access

Do not replace Guardian with a generic workflow dashboard.

## V8 — Adversarial testing
Run all Part IV P0 tests plus `05_ENGINEERING/Loop_Engine_Acceptance_Tests.md`.

## V9 — One controlled real loop
Only after Part IV + Part V P0 pass:
- choose one low-risk connector task
- enable bounded real execution
- require outcome verification
- compare real result with simulated expectation

## Do not broaden scope until this works reliably
Do not add dozens of skills, agents, or connectors before one controlled loop is secure, observable, verifiable, and recoverable.
