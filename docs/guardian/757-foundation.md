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

### Guardian notices and the SH-346–389 staging gate

Terminal results and uncertain execution create a pending notice in the same
MongoDB write as the corresponding mission state transition. The opt-in relay
copies those events to a separate dispatch collection. The consumer turns dispatch
entries into the owner's inbox records. An inbox read and a
mission acknowledgment are separate writes.

Run the relay with `python -m guardian_notice_relay`,
`GUARDIAN_NOTICE_RELAY_ENABLED=true` and `GUARDIAN_NOTICE_RELAY_MONGO_URL`.
Run the consumer with `python -m guardian_notice_service`,
`GUARDIAN_NOTICE_ENABLED=true` and `GUARDIAN_NOTICE_MONGO_URL`. Both use the
same `DB_NAME` and have separate credentials. Each handles up to 100 events per
sweep. The authenticated `/api/guardian/notices/readiness` route reports both
poll times and requires both to be fresh. Dispatch depth and oldest pending age
are logged without notice content. The default read
retention is 30 days. Unread notices have no expiry timestamp.

| Remix IDs | Implementation and evidence |
|---|---|
| SH-346–350 | Atomic event production, strict payload, neutral labels, indexed due claims. `tests/test_guardian_notices.py` checks pending-marker recovery, classification, payload rejection and the 100-event batch limit. |
| SH-351–352 | Unique owner/event index and immutable event replay checking. The MongoDB test interrupts the flow between inbox write and outbox completion and replays concurrent deliveries. |
| SH-353–359 | The authenticated inbox API supports paging, unread state, idempotent read receipts and mission links. MongoDB integration tests cover equal-time page ordering, foreign records and cursors, and distinct read/acknowledgment writes. |
| SH-360–366 | The Guardian Notices route is linked from Missions. Client tests exercise request cancellation forwarding, stale cursors, page deduplication and confirmed read state. iPhone account switching, app resume, VoiceOver and large-text acceptance are pending. |
| SH-367–370 | Committed read logs, queue metrics, neutral read state and read-only TTL. Integration tests exercise receipt logging, queue depth/age and expiry configuration. |
| SH-371–374 | Claims fence completion by token and deadline. Expired claims reenter the scan, transient failures use bounded backoff, and invalid events enter quarantine. Integration tests exercise all four behaviors. |
| SH-375 | Relay and consumer use separate roles. Disposable authenticated MongoDB tests verify that the consumer delivers a result while mission reads and writes are denied. Staging role provisioning and verification against the deployed credentials are pending. |
| SH-376–384 | Notice, worker and verifier heartbeat records, a short isolated process-restart test, one zero-cost preview and a scoped lease-recovery test are available. The measured staging run and staging service credentials are pending. |
| SH-385–389 | The short local run provides preliminary single-result evidence. Native return and acknowledgment, staged tenant checks, signed evidence and release verdict are pending. |

The staging verdict remains pending until these records exist for one run ID:

- Staging environment and exact API, worker, verifier, notice service and iPhone build versions, along with a recorded service-permission denial for the notice identity.
- Actual device close and first return in UTC, separated by at least 48 hours, and the approved mission's scheduled time and deadline.
- Timestamped worker and verifier samples, old and new worker identities across the restart, and persisted checkpoint or quarantine results.
- Matching verification digest and one owner-visible result, two persisted timestamps for notice read and mission acknowledgment, and a denied second-account attempt.
- Artifact hashes, failed or missing checks, and the release reviewer's verdict.

### SH-390–420 · Notice delivery permissions and cutover

This range extends the R1 remix with a new mapping for the unresolved ledger slots.
The consumer updates only the dispatch queue, its own heartbeat and inbox
records. The relay has mission access for the outbox handoff. Its collection
role grants it no inbox access. Separate heartbeat collections keep both notice
roles away from preview worker and verifier health records.

Before a staging cutover, stop the old consumer that wrote directly to
`guardian_missions`. Bootstrap the mission, dispatch, inbox and two notice
health collections. Inspect `python -m guardian_notice_permissions <database>`
for the two role definitions. Assign a distinct database principal to each
role and use only its own URI. Start the relay and consumer, then verify that
readiness reports both fresh timestamps. Old delivered markers remain closed.
An active legacy claim is recoverable after its existing due time.

| ID | Implemented contract | Local acceptance |
|---|---|---|
| SH-390 | Run a dedicated notice relay | The worker, verifier, relay and consumer process test ends with one inbox notice. |
| SH-391 | Preserve atomic mission event production | A mission transition produces a pending event before dispatch. |
| SH-392 | Introduce an independent dispatch collection | A relay pass creates one dispatch row with the validated event and due timestamp. |
| SH-393 | Validate every forwarded event | A version-two event is quarantined without delivery. |
| SH-394 | Verify the event's source ownership | An otherwise valid event with a different owner is quarantined. |
| SH-395 | Minimize the relay projection | Relay reads source owner, mission, event and due time. Checkpoints and lease credentials are absent from the projection. |
| SH-396 | Restrict relay work to due records | A future legacy claim remains pending until its due time. |
| SH-397 | Relay in due-time and event-ID order | The cursor sorts on the existing compound outbox keys before applying its batch limit. |
| SH-398 | Bound relay work per pass | The 101-record test relays 100 and then one. |
| SH-399 | Index pending delivery | Dispatch bootstrap creates the partial due-time and event-ID index. |
| SH-400 | Give each dispatch one stable key | Repeated publication of the same event produces one dispatch row. |
| SH-401 | Preserve immutable event data | `insert_immutable_event` uses insert-only fields and checks the saved event against the replay. |
| SH-402 | Persist dispatch before closing the mission marker | An interruption after the dispatch write leaves the mission marker recoverable. |
| SH-403 | Guard the handoff against concurrent changes | Closing a mission marker requires the same source event and due time. |
| SH-404 | Resume interrupted handoffs without redelivery | A relay replay leaves an already processed dispatch unchanged. |
| SH-405 | Handle concurrent relays | Three concurrent recovery passes record exactly one successful handoff. |
| SH-406 | Isolate malformed outbox records | The relay closes an invalid marker with a safe quarantine reason and continues. |
| SH-407 | Consume dispatch without mission access | The restricted consumer successfully delivers while MongoDB denies its mission reads. |
| SH-408 | Fence independent delivery leases | A stale consumer token cannot complete after another consumer recovered its claim. |
| SH-409 | Preserve completed legacy notices | A delivered legacy marker never enters the new dispatch queue. |
| SH-410 | Recover an expired legacy claim | The relay takes a previously claimed marker once due and clears its stale token. |
| SH-411 | Keep the relay opt-in | Starting it without the enable flag fails configuration. |
| SH-412 | Require a dedicated relay URI | Configuration rejects a general URI in place of the relay URI. |
| SH-413 | Define named database roles | The role definitions are applied to an authenticated disposable MongoDB fixture. |
| SH-414 | Prohibit consumer mission writes | MongoDB returns authorization error 13 when the consumer tries to change the verification outcome. |
| SH-415 | Prohibit consumer enqueue | MongoDB returns authorization error 13 when the consumer tries to insert a dispatch row. |
| SH-416 | Prohibit relay inbox writes | MongoDB returns authorization error 13 when the relay tries to change an inbox receipt. |
| SH-417 | Isolate notice heartbeats | The consumer can write its own heartbeat and is denied writes to relay and preview service health. |
| SH-418 | Report both service timestamps | The readiness endpoint returns the consumer and relay poll times to authenticated owners. |
| SH-419 | Detect an unavailable delivery path | Readiness is false for missing or stale relay health even when consumer health is fresh. |
| SH-420 | Exercise role denials in CI | The foundation workflow provisions an authenticated MongoDB fixture and runs the scoped-role integration test. |

### SH-421–492 · Staging evidence checks

These 72 entries extend the remix with an offline review tool for the staging
run. Each check reports its SH ID, result and a description. The definitions
live in `backend/guardian_staging_evidence.py`. Validation does not contact a
service or change deployment state.

| IDs | Evidence evaluated |
|---|---|
| SH-421–430 | Staging provenance, fixture flag, required observation types, unique confined files, SHA-256, schema, size, shared run ID and recording timestamp |
| SH-431–442 | iPhone build and owner, start/return chronology, measured 48-hour duration, capture coverage, launches, mission schedule, owner approval and deadline |
| SH-443–456 | Five service roles and commit, distinct process identities and role principals, identifiable polls and at most two minutes between ready polls across the closed window |
| SH-457–467 | Worker restart identity and timing, replacement readiness, observed worker attribution, lease requeue, quarantine, replay count and checkpoint integrity |
| SH-468–478 | Preview handler, approval digest, zero budget and cost, execution deadline, independent verifier, verified state and one result |
| SH-479–488 | Owner-scoped notice, verified result digest, exact dispatch and notice counts, event-derived notice ID, delivery and separate read and acknowledgment |
| SH-489–492 | MongoDB role denial, authenticated second-account isolation, preserved owner receipts and iPhone accessibility |

From `backend`, print the schema or check a completed bundle:

```sh
python -m guardian_staging_evidence --schema
python -m guardian_staging_evidence /absolute/path/to/manifest.json
```

The version-one manifest contains the run ID, environment, fixture flag, commit,
device build, recording timestamp and relative paths and SHA-256 hashes for seven
observation files. Every file carries the same run ID. Use sanitized test account
and service aliases in the observations. Keep credential material outside the
bundle. Use the recorded foreground session log for device launches. Use the
mission evidence and service polls for worker and verifier identities. Join the
verified mission digest to the dispatch event and persisted inbox record when
building the inbox observation. Use dispatch completion time for delivered_at.
Capture the second account's successful list status alongside its zero matches,
and preserve the individual denial statuses for detail, read and acknowledgment.

The command exits with 2 for missing or unusable inputs, 1 for a bundle that fails
one or more checks, and 0 for a bundle ready for review. A reviewer still checks
that the observations come from the recorded staging environment, reviews the
source evidence and signs the release verdict. The automated suite uses synthetic
bundles to verify the rules. A measured 48-hour staging run remains outstanding.

### SH-493–543 · Staging capture, assembly and sealing

These entries extend the remix with the evidence collection path. It records
the five service roles, preserves the raw poll journal and seals the seven
observations for the existing validator. It neither starts a mission nor deploys
or certifies a release.

From `backend`, generate the MongoDB sampler role and run a configured capture:

```sh
python -m guardian_staging_capture sampler-role staging_database
python -m guardian_staging_capture sample /absolute/path/polls.jsonl \
  --run-id stage-example --api-instance api-staging-build --count 2890 --interval 60
python -m guardian_staging_capture assemble-services \
  /absolute/path/registry.json /absolute/path/polls.jsonl /absolute/path/services.json
python -m guardian_staging_capture seal /absolute/path/manifest.json \
  --run-id stage-example --build-commit <40-character-commit> --device-build <ios-build> --environment staging
python -m guardian_staging_evidence /absolute/path/manifest.json
```

Sampling requires the opt-in flag `GUARDIAN_STAGING_SAMPLE_ENABLED=true`, a
dedicated read-only `GUARDIAN_STAGING_SAMPLE_MONGO_URL`,
`GUARDIAN_STAGING_SAMPLE_DB` and `GUARDIAN_STAGING_API_ORIGIN`. The API probe
reports the health endpoint response under the operator-supplied API instance
alias. Review the deployment record to establish that alias and build.
Start polling before the first device close and keep polling through its first
return. The example count allows a 48-hour close plus a short setup and return
margin. Keep both sides of a restart in the process registry. Each registry
entry has a role, instance, principal, commit and config version. The registry
and poll journal share the same run ID.

Supply the other six JSON observations from captured records beside the
manifest. The sealer expects conventional names such as `device.json` and
`mission.json`. It defaults to a local fixture. Explicit staging mode labels
the evidence for review. The validator still checks the capture and the release
reviewer still checks its provenance. Keep the poll journal and registry with
the source records, including frames with unidentified service failures.

| ID | Implemented contract and acceptance |
|---|---|
| SH-493 | Sampling requires explicit enablement. The configuration test exercises the disabled case. |
| SH-494 | Require a dedicated sampler database URI with no general database fallback. |
| SH-495 | Require an explicit staging database and API origin before connecting. |
| SH-496 | Probe HTTPS origins and permit HTTP only for local loopback fixtures. |
| SH-497 | Reject origin credentials, extra paths, query strings, fragments and whitespace. |
| SH-498 | Probe the existing STAAR Hub health response with a read-only GET. |
| SH-499 | Treat redirects and unsuccessful statuses as unavailability. Verify a redirect makes no follow-on request. |
| SH-500 | Require the expected STAAR Hub online response body. |
| SH-501 | Bound the accepted API body to 4 KiB and the probe to five seconds. |
| SH-502 | Generate a MongoDB role with find access on the three health collections only. |
| SH-503 | Deny sampler reads of missions and inbox data in the authenticated MongoDB test. |
| SH-504 | Deny sampler writes to health collections in the same integration test. |
| SH-505 | Select the latest worker heartbeat and preserve its process identity on replacement. |
| SH-506 | Observe the verifier independently from the worker. |
| SH-507 | Store relay process identity and heartbeat time together. An older update cannot replace the newer pair. |
| SH-508 | Store consumer process identity and heartbeat time using the same atomic write. |
| SH-509 | Accept a health poll as ready only within the 30-second freshness window. |
| SH-510 | Record missing, stale and unavailable polls distinctly. |
| SH-511 | Require one observation per role in every frame. A ready observation requires an instance identity. |
| SH-512 | Stamp frames with an aware UTC time and an explicit run ID. |
| SH-513 | Append service observations as newline-delimited JSON. A later process can continue the same journal. |
| SH-514 | Restrict a newly created journal to the owner's read/write permissions. |
| SH-515 | Reject symlink destinations and journals that are not regular files. |
| SH-516 | Hold an exclusive lock while checking the tail and appending a frame. |
| SH-517 | Refuse to continue a journal identified with a different run. |
| SH-518 | Require strictly increasing observation times across resumptions. |
| SH-519 | Flush and sync a complete frame before reporting a successful append. |
| SH-520 | Reject interrupted trailing records without overwriting the source. |
| SH-521 | Bound frame size, journal bytes and the number of frames the exporter will accept. |
| SH-522 | Bound live capture to a requested poll count and a 30–60 second interval. |
| SH-523 | Schedule subsequent polls from the monotonic clock so network latency does not accumulate per interval. |
| SH-524 | Read the registry through a strict version-compatible service schema. |
| SH-525 | Reject duplicate instance identities in the registry. |
| SH-526 | Require the registry and journal to share an exact run ID. |
| SH-527 | Verify each observed process is registered under its observed role. |
| SH-528 | Preserve known unavailable or stale instances as failed samples. |
| SH-529 | Preserve unidentified failures in the source journal. The export omits their instance ID, leaving a gap in ready samples. |
| SH-530 | Preserve observation timestamps and registry versions in the service artifact. |
| SH-531 | Validate the export against the existing `Services` evidence model. |
| SH-532 | Write the service artifact through a synced temporary file before it becomes visible. |
| SH-533 | Refuse to overwrite an existing service export, including during a competing write. |
| SH-534 | Require all seven typed observation files beside the manifest. |
| SH-535 | Reject paths resolving outside the bundle and duplicate resolved observation files. |
| SH-536 | Validate each artifact's size and observation schema before sealing. |
| SH-537 | Require all seven observations to belong to the manifest's run. |
| SH-538 | Hash the actual bytes of every typed observation with SHA-256. |
| SH-539 | Record the run, build, environment and UTC sealing time in the typed manifest. |
| SH-540 | Default the CLI to a local fixture. Reject a fixture paired with a staging declaration. |
| SH-541 | Publish the manifest only after the observations pass intake. Refuse to replace a previous seal. |
| SH-542 | Keep raw connection errors and input values out of process error output. |
| SH-543 | Round-trip a sealed synthetic bundle through the validator to verify format compatibility. |

The capture tests run in the authenticated MongoDB foundation job. Local
fixtures and read-only role packaging do not establish staged credentials,
an actual iPhone closure or a release verdict.

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

## SH-544–605 · Signed staging evidence review

The original definitions are unresolved in the master ledger. These remixed
contracts extend the SH-493–543 capture pipeline. The proof is a signed
decision about a specific evidence bundle, supported by the SH-421–492
validator. Ownership sits with the Guardian evidence maintainer. Completion for
this batch is local implementation and automated verification.

From `backend`, run `python guardian_staging_review.py schema` for the version 1
formats. Record the SHA-256 of the original manifest bytes in the decision,
along with the run ID, preparer, reviewer, timezone-aware review time, verdict
and reason. The trust registry is maintained independently from the bundle.
Each entry records the approved reviewer ID, the raw Ed25519 public key as
64 lowercase hex characters, a validity window and revocation status. Give
the signing process access to the reviewer's unencrypted PEM only in the
reviewer's protected execution environment. Verification needs the public
registry, receipt and evidence files. Keep those three artifacts together
with the code revision used to evaluate them.

```sh
python guardian_staging_review.py sign evidence/manifest.json review.json \
  --decision decision.json --trust reviewer-trust.json --key /secure/reviewer.pem
python guardian_staging_review.py verify evidence/manifest.json review.json \
  --trust reviewer-trust.json
```

Both operations exit 0 for a valid recorded decision, including a hold or fail.
Automation must inspect the returned `verdict` and `validator_status`. Exit 2
indicates a rejected input or a write failure. A pass requires all 72 staging
checks and a non-fixture staging declaration. The reviewer's clock and judgment,
their assigned identity and the independently supplied registry are operational
trust inputs. The receipt confirms who signed the stated decision using that
registry, with the recorded review time treated as signer-supplied. Approving a
staging bundle is distinct from deploying or approving an app release.

| ID | Contract and acceptance |
|---|---|
| SH-544 | Run review offline through the staging review entry point. Exercise it with the public CLI test. |
| SH-545 | Require a version 1 decision. Reject unsupported versions. |
| SH-546 | Reject boolean values passed as schema versions. |
| SH-547 | Require the decision to carry the manifest's run ID. |
| SH-548 | Require a SHA-256 of the exact manifest bytes in the decision. |
| SH-549 | Record preparer and reviewer identifiers in the signed record. |
| SH-550 | Reject self-review, including case variants of the preparer. |
| SH-551 | Require a review timestamp with a timezone. |
| SH-552 | Reject a review time earlier than the manifest recording time. |
| SH-553 | Reject a review time later than the verifier's current time. |
| SH-554 | Use explicit pass, fail and hold verdicts. |
| SH-555 | Require a reason consistent with the verdict. |
| SH-556 | Use a finite set of reason codes and reject unknown decision fields. |
| SH-557 | Require the versioned trust registry as an explicit input to sign and verify. |
| SH-558 | Require a bounded list of public key entries in that registry. |
| SH-559 | Bind each registry entry to a named reviewer. |
| SH-560 | Require a 32-byte public key encoded as lowercase hex. |
| SH-561 | Reject reversed or empty trust windows. |
| SH-562 | Apply inclusive start and exclusive end for a key's validity. |
| SH-563 | Reject revoked keys on signing and reverification. |
| SH-564 | Reject duplicate public keys, including entries with different reviewer aliases. |
| SH-565 | Support distinct keys for one reviewer during rotation. |
| SH-566 | Allow an expired key to verify a historical receipt signed within the validity window while its registry entry remains trusted. |
| SH-567 | Reject a key assigned to a different reviewer. |
| SH-568 | Reject signing keys absent from the trust registry. |
| SH-569 | Load signing material as a PEM private key. |
| SH-570 | Reject private keys of other algorithm types. |
| SH-571 | Derive a stable SHA-256 key identifier from the raw Ed25519 public key. |
| SH-572 | Read the manifest once per operation and evaluate the parsed snapshot used for its digest. |
| SH-573 | Accept staging evidence for a pass only when the existing 72-check evaluator reports readiness. |
| SH-574 | Reject local declarations for a pass. |
| SH-575 | Reject fixture declarations for a pass. |
| SH-576 | Allow a fail verdict when the validator finds a failed staging check. |
| SH-577 | Allow a hold for a capture the validator identifies as incomplete. |
| SH-578 | Reject a pass or fail when evidence is incomplete. |
| SH-579 | Allow an explicit manual hold on otherwise passing evidence. |
| SH-580 | Reject incomplete-capture or failed-check reasons for a passing bundle. |
| SH-581 | Record the validator's status in the signature payload. |
| SH-582 | Record the failed check IDs the validator actually evaluated. |
| SH-583 | Record the build commit from the verified manifest. |
| SH-584 | Record the device build from the verified manifest. |
| SH-585 | Use a deterministic representation to hash the full validator report. |
| SH-586 | Encode the signed record deterministically for comparison and signature verification. |
| SH-587 | Use a versioned domain prefix to distinguish review signatures from other messages. |
| SH-588 | Produce a version 1 receipt with a 64-byte Ed25519 signature. |
| SH-589 | Reverify using the public key registry alone for key material. |
| SH-590 | Reject a receipt altered after signing. |
| SH-591 | Reject an invalid or replaced signature. |
| SH-592 | Reject any manifest byte changes, including format-only changes. |
| SH-593 | Reject changed observation bytes when rechecking a pass. |
| SH-594 | Reject a replaced or resealed manifest under a previous receipt. |
| SH-595 | Reproduce the exact validator report and record using the receipt's review time. |
| SH-596 | Reject ambiguous duplicate JSON fields at the new decision, registry, manifest and receipt boundaries. |
| SH-597 | Bound manifest, decision, trust and receipt file reads to 128 KiB each. |
| SH-598 | Bound the signer PEM read to 8 KiB. |
| SH-599 | Sync the receipt contents before publishing the new file. |
| SH-600 | Refuse to overwrite a receipt or replace a symlink at its destination. |
| SH-601 | Use owner-only file permissions when publishing a receipt. |
| SH-602 | Print the three JSON schemas from the CLI. |
| SH-603 | Expose successful operation, verdict and validator status as machine-readable JSON. |
| SH-604 | Return a nonzero exit and a fixed error message on invalid input without printing input values. |
| SH-605 | Compile the module and run the staging review tests in the existing Guardian CI workflow. |

The tests use disposable keys and synthetic bundles. A real signed staging
receipt still requires the captured 48-hour iPhone run, an independently
provisioned reviewer key and an explicit reviewer decision.

## SH-606–676 · Portable staging review handoff

The available ledger records do not supply the original definitions for this
range. These remixed contracts extend the SH-544–605 signed review. The Guardian
evidence maintainer owns the offline handoff. Completion for this batch is an
export and independent verification with automated rejection of mismatched,
untrusted, incomplete or altered input.

From `backend`, run `python guardian_staging_handoff.py schema` for the target
JSON format. Record the expected run ID, full build commit and iPhone build from
the intended release candidate. Both parties supply that target and a trusted
reviewer registry through independent channels. The ZIP carries the exact
manifest, seven observations and signed receipt from the evidence review.

```sh
python guardian_staging_handoff.py export guardian-handoff.zip \
  --manifest evidence/manifest.json --receipt review.json \
  --trust reviewer-trust.json --target target.json
python guardian_staging_handoff.py verify guardian-handoff.zip \
  --trust reviewer-trust.json --target target.json
```

The recipient can supply the independently obtained packet hash using
`--sha256`. Both commands return the same JSON summary on success. Exit 2 means
the packet could not be validated or exported. The ZIP includes staging
observations, so distribute it only through the approved evidence channel.
The ZIP format provides portability and integrity checks. Access controls and
encryption in transit are handled by the distribution channel. A verified
packet records a staging review for that build. Deployment remains a separate
action.

| ID | Contract and acceptance |
|---|---|
| SH-606 | Provide an offline handoff CLI with export and verification modes. |
| SH-607 | Require an independently supplied expected target for both operations. |
| SH-608 | Accept only version 1 of the target schema. |
| SH-609 | Reject boolean versions in the target. |
| SH-610 | Reject unexpected target fields. |
| SH-611 | Reject duplicate JSON keys in the target. |
| SH-612 | Read a target of at most 4 KiB. |
| SH-613 | Require the run identifier in the target. |
| SH-614 | Require the full 40-character lowercase commit ID in the target. |
| SH-615 | Require the device build identifier in the target. |
| SH-616 | Reject a packet for a different run even when both builds match. |
| SH-617 | Reject a packet for a different code commit. |
| SH-618 | Reject a packet for a different device build. |
| SH-619 | Require an explicit, separately supplied reviewer trust registry. |
| SH-620 | Require a readable signed review receipt as export input. |
| SH-621 | Require a readable typed manifest as export input. |
| SH-622 | Require all seven staging observations. |
| SH-623 | Require the flat file names produced by the seal command. |
| SH-624 | Confine source observations to the manifest directory. |
| SH-625 | Reject oversized source observations. |
| SH-626 | Bound source manifest bytes to 128 KiB. |
| SH-627 | Bound source receipt bytes to 128 KiB. |
| SH-628 | Read a single source snapshot before verification and publication. |
| SH-629 | Preserve exact source manifest bytes in the archive. |
| SH-630 | Preserve exact receipt bytes in the archive. |
| SH-631 | Preserve exact observation bytes in the archive. |
| SH-632 | Verify the reviewer signature before exporting. |
| SH-633 | Recheck the underlying staging evidence before exporting. |
| SH-634 | Allow only a signed pass to be exported. |
| SH-635 | Exclude valid hold and fail receipts from handoff. |
| SH-636 | Emit the same ZIP bytes for identical inputs. |
| SH-637 | Use a fixed order for all nine ZIP entries. |
| SH-638 | Record a fixed ZIP timestamp so export time has no effect on packet bytes. |
| SH-639 | Mark each entry as an owner-only regular file in ZIP metadata. |
| SH-640 | Use stored, uncompressed ZIP members. |
| SH-641 | Sync packet contents before publishing. |
| SH-642 | Refuse to overwrite an existing destination. |
| SH-643 | Refuse to replace an existing destination symlink. |
| SH-644 | Publish the package with owner-only access. |
| SH-645 | Accept verification with the packet, target and public trust registry only. |
| SH-646 | Bound whole-archive bytes before opening the ZIP. |
| SH-647 | Support an optional independently obtained packet SHA-256. |
| SH-648 | Reject an archive with a mismatched external digest. |
| SH-649 | Require a classic single-disk ZIP directory. |
| SH-650 | Bound the central directory size before passing the archive to the ZIP parser. |
| SH-651 | Validate the central directory offset against the end record. |
| SH-652 | Reject archives with entry counts outside the fixed layout. |
| SH-653 | Reject missing or extra entries. |
| SH-654 | Reject duplicate or reordered entries. |
| SH-655 | Reject absolute paths, traversal names and foreign path separators. |
| SH-656 | Reject compressed or flagged members. |
| SH-657 | Reject declared stored sizes that disagree or exceed an entry's limit. |
| SH-658 | Bound read size separately for every member. |
| SH-659 | Reject payload corruption detected by the ZIP CRC. |
| SH-660 | Reject symlink or other noncanonical entry metadata. |
| SH-661 | Reject archive comments, prefixes and trailing bytes. |
| SH-662 | Reject truncated packets. |
| SH-663 | Require exact equality to a canonical re-encoding. |
| SH-664 | Verify from a private temporary directory populated only with fixed names. |
| SH-665 | Remove the temporary verification directory on success or error. |
| SH-666 | Reverify signature, reviewer trust and exact evidence at receipt. |
| SH-667 | Recheck revocation when verifying an existing ZIP. |
| SH-668 | Reject modified evidence or receipts even after ZIP metadata is rebuilt. |
| SH-669 | Reject an imported hold or fail even if the archive layout is canonical. |
| SH-670 | Return a typed version marker and a clear handoff verification status in JSON. |
| SH-671 | Report the verified run, commit and device build in that JSON. |
| SH-672 | Report the manifest hash, validator report hash and review key ID. |
| SH-673 | Report the transport SHA-256 and packet byte count. |
| SH-674 | Expose the target schema through the CLI. |
| SH-675 | Exit with a fixed error message on rejected input without printing input values. |
| SH-676 | Compile the new module and run the handoff regression suite in the existing Guardian CI job. |

Verification in this batch uses synthetic staging evidence and disposable keys.
A live packet still requires a captured 48-hour iPhone staging run and an
independently authorized reviewer.

## SH-678–717 · Staging readiness diagnostics

This remix provides a read-only next-action report for the selected staging
build. It uses the existing validator, signed review and handoff verifier.
Run `python guardian_staging_readiness.py --help` from `backend`.
The Guardian evidence maintainer owns diagnostic acceptance. Automated tests
use synthetic evidence. IDs 701–717 extend the earlier
700-item execution ledger within the broader 757-item project.

| ID | Contract |
|---|---|
| SH-678 | Read-only local readiness command. |
| SH-679 | Explicit target argument. |
| SH-680 | Explicit manifest argument. |
| SH-681 | Explicit receipt argument. |
| SH-682 | Explicit packet argument. |
| SH-683 | Explicit trust argument. |
| SH-684 | Reuse the versioned build target. |
| SH-685 | Enforce the target size limit. |
| SH-686 | Reject invalid typed targets. |
| SH-687 | Reject duplicate target fields. |
| SH-688 | Report the selected run ID. |
| SH-689 | Report the selected commit. |
| SH-690 | Report the selected device build. |
| SH-691 | Identify a missing capture. |
| SH-692 | Identify an invalid manifest. |
| SH-693 | Identify a mismatched capture run. |
| SH-694 | Identify a mismatched capture commit. |
| SH-695 | Identify a mismatched device build. |
| SH-696 | Reuse staging evidence checks. |
| SH-697 | Identify incomplete observations. |
| SH-698 | Identify failed staging checks. |
| SH-699 | Expose failed check IDs only. |
| SH-700 | Identify a missing signed review. |
| SH-701 | Verify the reviewer signature. |
| SH-702 | Honor reviewer revocation. |
| SH-703 | Verify the reviewed manifest matches the checked snapshot. |
| SH-704 | Identify an invalid signed review. |
| SH-705 | Surface a signed hold on passing evidence. |
| SH-706 | Require a signed pass to proceed to handoff. |
| SH-707 | Identify a missing handoff ZIP. |
| SH-708 | Verify the ZIP against the selected typed target. |
| SH-709 | Use the validated packet receipt without rereading the ZIP. |
| SH-710 | Require the packaged receipt to match the local signed decision. |
| SH-711 | Identify mismatched handoffs. |
| SH-712 | Identify invalid handoffs. |
| SH-713 | Return verified handoff status only after all gates. |
| SH-714 | Return a next action for each outcome. |
| SH-715 | Emit JSON without raw staging observations. |
| SH-716 | Distinguish verified, pending and invalid-target exits. |
| SH-717 | Run readiness regression coverage in Guardian CI. |

## SH-719–757 · Staging handoff closeout

This remixed batch records a reproducible, offline closeout for a verified
handoff ZIP. The Guardian evidence maintainer owns closeout acceptance.
Supply the expected target, independent ZIP digest and trusted reviewer registry.
Both operations reverify the actual ZIP and signed evidence under current trust.
The record is a derived verification result. Its provenance comes from
reverification against those independent inputs.

```sh
python guardian_staging_closeout.py record closeout.json --packet handoff.zip \
  --target target.json --trust reviewer-trust.json --sha256 EXPECTED_DIGEST
python guardian_staging_closeout.py verify closeout.json --packet handoff.zip \
  --target target.json --trust reviewer-trust.json --sha256 EXPECTED_DIGEST
```

The original component mapping remains unverified. Staging closeout grants no
deployment authority. Live acceptance still requires the actual 48-hour iPhone
run and authorized reviewer signoff.

| ID | Contract |
|---|---|
| SH-719 | Offline staging closeout entry point. |
| SH-720 | Explicit record operation. |
| SH-721 | Explicit verification operation. |
| SH-722 | Machine-readable schema operation. |
| SH-723 | Strict version 1 record format. |
| SH-724 | Fixed staging verification outcome. |
| SH-725 | Explicit packet input. |
| SH-726 | Explicit reviewer trust input. |
| SH-727 | Explicit target input. |
| SH-728 | Mandatory independently obtained packet SHA-256. |
| SH-729 | Require exact lowercase hexadecimal digest encoding. |
| SH-730 | Validate the digest before reading the ZIP. |
| SH-731 | Reject ZIP bytes differing from the pinned digest. |
| SH-732 | Reuse the canonical ZIP validator. |
| SH-733 | Recheck the signed passing review. |
| SH-734 | Recheck the evidence validator's result. |
| SH-735 | Enforce current reviewer trust and revocation. |
| SH-736 | Bind the record to the selected run. |
| SH-737 | Bind the record to the selected commit. |
| SH-738 | Bind the record to the selected iPhone build. |
| SH-739 | Record the verified packet hash. |
| SH-740 | Record the verified manifest hash. |
| SH-741 | Record the verified report hash. |
| SH-742 | Record the verified reviewer key ID. |
| SH-743 | Record the exact packet size. |
| SH-744 | Require a positive bounded packet size. |
| SH-745 | Emit a deterministic record for the same verified input. |
| SH-746 | Limit record reads to 4 KiB. |
| SH-747 | Reject unknown record fields. |
| SH-748 | Reject duplicate record fields. |
| SH-749 | Recompute all fields during verification. |
| SH-750 | Reject changes to recorded fields. |
| SH-751 | Create output only after verification. |
| SH-752 | Sync output before publication. |
| SH-753 | Preserve an existing closeout file. |
| SH-754 | Use owner-only output permissions. |
| SH-755 | Return machine-readable success output. |
| SH-756 | Report invalid inputs without echoing evidence. |
| SH-757 | Compile and test closeout in Guardian CI. |

## SH-677 and SH-718 · Final staging remix gaps

| ID | Implemented contract | Acceptance evidence |
|---|---|---|
| SH-677 | Handoff export checks the sealed run, commit and iPhone build before opening the signed receipt or observations. The verifier applies the same target match to received packets. | The wrong-target regression omits the receipt and an observation. Export still reports a target mismatch and creates no ZIP. See `backend/tests/test_guardian_staging_handoff.py`. |
| SH-718 | Readiness accepts an independently obtained ZIP digest via `--sha256`. A well-formed mismatch produces `packet_digest_mismatch` with `locate_expected_handoff`. Malformed digests are rejected and a matching digest still requires the signed packet checks. | The regression checks matching, mismatching and malformed digests. See `backend/tests/test_guardian_staging_readiness.py`. |

The local remix now maps all IDs from SH-346 through SH-757. The remaining
canonical traceability gaps predate this remix. The 254–305 reconciliation note
contains historical implementation evidence, while its per-ID mappings remain
unverified. The SH-306–346 intake records missing original requirements for
SH-306–345. SH-346 is covered by the local remix. Earlier implementation claims
also need source-to-code verification before project-wide certification.
Live acceptance still needs staging credentials and processes, the measured
iPhone run and the authorized reviewer's decision.
