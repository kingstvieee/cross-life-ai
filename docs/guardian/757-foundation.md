# Guardian 757 — Implementation Foundation (2026-11-21)

Status: implementation in progress. The authenticated API stores proposals and reports their state. The scheduler is an opt-in service. Live execution and iPhone acceptance remain unverified.

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

### Zero-cost Guardian preview

For a staging exercise, set `GUARDIAN_PREVIEW_ENABLED=true` on the API
and on the preview processes. Use the staging database through `MONGO_URL`
and `DB_NAME`. Start the worker and verifier as separately supervised
processes from `backend`.

```sh
python -m guardian_preview_service worker
python -m guardian_preview_service verifier
```

The existing scheduler can continue to handle mission expiry and retries.
Create a proposal, read its `preview_digest`, then post that digest with an
optional timezone-aware `run_at` to `/{mission_id}/queue-preview`. The
preview records a snapshot of the objective and success criteria and checks
that the stored result matches that snapshot. It has an estimated cost of
zero CAD and performs no external connector operations. The owner can record
an acknowledgment at `/{mission_id}/acknowledge-preview` after verification.
An acknowledgment is a mission receipt. Delivery of a live alert still
requires a configured test channel.

CI tests the API and separate MongoDB clients for each role. Service role IDs
are process identifiers. Staging must supply the service credentials and
process supervision. The CI test does not measure actual 48-hour elapsed time.
The 750 count is a design target, not 750 implemented modules. The first 250 have not been independently reconciled against the repository. The additional 500 are represented by a proposed expansion task; a complete numbered, deduplicated acceptance matrix must be written before claims of implementation coverage.

## Guardian brain and presence crosswalk

The later brain discussion adds the behaviors below. Its exact component count and item identifiers are unconfirmed. Record overlap before adding these behaviors to the 757 total.

| Capability | Existing entry point | Remaining acceptance evidence |
|---|---|---|
| Persistent objectives and follow-through | Mission proposal API, mission engine, scheduler and worker | Advance a real authorized objective while the app is closed and recover from a worker restart. |
| Perception and shared attention | Portal navigation, scene events and foreground microphone | Resolve a spoken reference against the selected item across portals and show its source. |
| Orienting and habituation | Guardian rig, scene and notification delivery | React once to a new event, suppress its duplicate and react again to a materially changed revision. |
| Reflexes, inhibition and turn-taking | Shared audio provider and microphone controls | Stop voice and mouth motion together, keep task cancellation separate and support an interrupted turn. |
| Internal status | Playback state, scene readiness and provider states | Surface a stale connector or failed voice channel with the verified last state and a usable fallback. |
| Perspective-taking and conversational repair | Companion chat and preferences | Honor an explicit request for space, resolve a corrected reference and explain what changed. |
| Motor prediction and embodiment | B250 asset, locomotion, face motion and speech bridge | Verify gaze, banking, wing motion and speech synchronization on iPhone without obstructing any of the nine portals. |
| Learning from correction | Life Map records and workflow checkpoints | Save a correction at the intended scope with provenance, then verify it after relaunch and after rollback. |
| Tool authority and independent verification | Mission worker, verifier and workflow grants | Enforce authorization, stale intent checks, cancellation and provider readback on a real connector. |

## Safety and spending
No unapproved purchase, publishing, messages, device unlocking, production deployment, or third-party account changes. Credentials stored in a secrets manager. CAD budget limits enforced server-side. All integrations default disabled.

## First acceptance test
Close the mobile app for 48 hours while a non-destructive scheduled test mission runs server-side; restart a worker mid-step; verify exactly-once observable effect (or safe deduplication), preserved checkpoints, immutable evidence, and one acknowledged test alert. Record measured results, not simulated success.
