# Guardian 757 — Implementation Foundation (2026-11-21)

Status: foundation specification only. Not deployed. No background jobs, notifications, or device control are enabled by this document.

## Architecture
Client (nine world experiences) -> authenticated API -> policy gateway -> mission database -> durable queue -> leased worker -> tool adapter -> independent verifier -> audit log -> notification router.

The seven existing stable portal identifiers remain unchanged; STARVERSE and STAARSONIC require explicit route integration rather than renaming identifiers.

## Minimum data model
Mission: id, owner_id, objective, success_criteria, scope, budget_cad, status, priority, created_at, updated_at, expires_at.
Step: id, mission_id, dependencies, tool, input_digest, idempotency_key, checkpoint_uri, attempts, lease_until, status.
Approval: id, mission_id, action_digest, risk_tier, approver, expires_at, decision, signature.
Evidence: id, step_id, source, observed_at, checksum, result, verifier_id.
Alert: id, mission_id, severity, channel, dedupe_key, delivered_at, acknowledged_at.

## Execution state machine
proposed -> approved -> queued -> leased -> running -> verifying -> completed.
Failures: running -> retry_wait -> queued; unrecoverable -> blocked; policy denial -> awaiting_approval; cancelled -> cancelled.
Never mark completed without verifier evidence. Retry only idempotent operations; use compensation or explicit approval otherwise.

## Seven hard gates
1. 48-hour app-closed mission continuity verified with checkpoint recovery.
2. External policy enforcement denies unauthorized actions.
3. Evidence-backed claims and confidence checkpoints at each consequential step.
4. Independent integrity monitor detects drift and untrusted tool output.
5. Versioned memory updates with rollback and provenance.
6. Scope-preserving multi-agent delegation and auditable handoffs.
7. Regression, security, chaos, cost, and accessibility tests pass release thresholds.

## Delivery sequence
P0: inspect actual runtime, schema, auth, deployment, secrets, and costs. 
P1: mission storage, queue, worker leases, checkpointing, audit log, policy gates.
P2: verification, alerts (email/push), user consent, quiet hours, escalation.
P3: evidence/world model, cognitive orchestration, specialized agents.
P4: portal adapters, home integration, creative and commerce connectors.
P5: simulation, continual improvement, full evaluation and controlled rollout.

## Candidate inventory
The 750 count is a design target, not 750 implemented modules. The first 250 have not been independently reconciled against the repository. The additional 500 are represented by a proposed expansion task; a complete numbered, deduplicated acceptance matrix must be written before claims of implementation coverage.

## Safety and spending
No unapproved purchase, publishing, messages, device unlocking, production deployment, or third-party account changes. Credentials stored in a secrets manager. CAD budget limits enforced server-side. All integrations default disabled.

## First acceptance test
Close the mobile app for 48 hours while a non-destructive scheduled test mission runs server-side; restart a worker mid-step; verify exactly-once observable effect (or safe deduplication), preserved checkpoints, immutable evidence, and one acknowledged test alert. Record measured results, not simulated success.
