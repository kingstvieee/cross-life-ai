# Guardian Parts IV–V: implementation and evidence

Date: 2026-10-12. Base: canonical `kingstvieee/cross-life-ai` main,
`ffa71a00b70e6711ad8792a1e4dfc2e98207952f`.

Source archive SHA-256: `77a8fbbc22c3d70090d21955334f62ac36bb1e9dafaf0530953645b14612064e`.

## Result

The architecture handoff is now an authenticated, persistent **simulation**
feature in the product backend and Expo hub. The Permission Centre opens from
the existing chamber, preserves the existing Guardian character, and provides
three simulated connector nodes. No new real connector is enabled.

The supplied 32-file handoff is preserved in `source-pack/`, with trailing
blank lines at end of file normalized for repository whitespace checks. This report and
`HARDENED_CONTRACT.md` describe the actual implementation and supersede any
assumption that a document, diagram, or mocked integration is finished software.

## Weaknesses found and addressed

| Gap in the handoff or current build | Implemented correction | Evidence |
| --- | --- | --- |
| Permission schema permitted loosely defined scopes | Closed request schemas; exact connector, capability, resource, subject and project; bounded lifetime | scope and closed-schema tests |
| Client/model could claim a low risk level | Server-owned skill catalog supplies risk and limits; no client risk override | spoofed-field and unknown-skill tests |
| Approval was described without binding rules | Hash binds subject, run, lane, action, trigger and observed resource version; confirmation expires and is consumed | hash mismatch, policy-change and replay tests |
| Retry semantics could duplicate writes | Idempotency keys plus stored origin and resource version; uncertain requests reuse a key | duplicate request and repair tests |
| Parallel-lane isolation lacked conflict behavior | Unique lanes; tokens bound to lane/run/action; resource-version conflicts require replanning | token isolation and conflicting-write tests |
| Completion could depend on executor self-report | Separate verification transition reads the simulated resource; no client-supplied completion or evidence | HTTP and corruption tests |
| Stop behavior was unspecified across requests | Durable per-user Safe Mode invalidates grants and unfinished runs; CAS rechecks after concurrent changes | Safe Mode race and restart-state tests |
| Audit log was called immutable without storage detail | Audit uses `$push`, never replacement; hash chaining records continuity | append-only and chain tests |
| Memory feedback could become global policy | Minimal context packets; verified proposal, owner resolution, project-only retention and expiry | memory/context tests |
| Broad integration scope could exhaust credits | Five fixed skills and three mocked adapters; no generation/model calls in this runtime | code has no network/model imports |

The authority and state boundary is server-side. MongoDB documents are keyed by
the authenticated session's user ID, never a caller-supplied user ID. Each
mutation compares the document version and commits simulated effects and audit
events in one update. Real external side effects must not be added inside this
retryable mutation: they require an outbox and connector-specific idempotency.

## What the Sabrina synthesis contributes

The provided research's useful architecture themes are translated into code:
versioned playbooks, small context packets, explicit finish lines, maker/checker
separation, bounded repair, and governed feedback. Distribution, content
multiplication, AEO, and revenue examples stay research notes; they do not become
Guardian permissions, product features or promises about business results.

This review studied the supplied synthesis. It does **not** assert that every
video on the creator's channel was viewed or independently validated. The source
pack's Ghost hardware/funding and creator revenue statements are inherited
research claims, not evidence for an investor submission. Verify primary,
dated sources separately before using them as facts or financial projections.

## Implementation map

| Component | State | Location |
| --- | --- | --- |
| Deterministic authorization and A0–A4 scope checks | Implemented for simulation | `backend/guardian_control.py` |
| Closed, versioned skill registry | Implemented: five server-owned skills | same module, `SKILLS` |
| Context Builder | Minimal deterministic packet; no model call | `context()` |
| Planner and isolated lanes | Fixed, single-action plans with timeout and finite retries | `plan()` |
| Connector broker | Single-use internal authority tokens, five-second lifetime | `authorize()`, `_consume()`, `_execute()` |
| Files, calendar, creative health adapters | Mocked effects; actual state transitions | simulated `resources` and independent checker |
| Verifier and targeted repair | Implemented; mismatch reason and bounded retry | `verify()`, `advance()` |
| Memory writeback | Proposed, owner-governed, project-only; expiry on next access | `resolve_memory()`, `purge_expired_memory()` |
| Durable state and append-only audit | Mongo adapter implemented; tested with CAS-capable test collection | `guardian_control_store.py` |
| Authenticated API and existing app mounting | Implemented | `guardian_control_routes.py`, `guardian_server_integration.py` |
| Permission Centre and visible Guardian | Implemented in existing Expo hub | `guardian-control-sheet.tsx`, `cinematic-hub.tsx` |
| Production credential vault and real connector sandbox | Deferred | no real credential is accepted or issued |
| A4 scheduler, background workers, parallel external execution | Deferred | schedule trigger policy is simulated; no scheduler is claimed |
| Hardware and physical devices | Deferred | no device control path |

## Safe Mode scope and remaining production work

Within this new engine, stopping is atomic with the persisted policy state;
subsequent simulation execution/verification fails closed. Resume never revives
old grants, approvals or stopped runs. The emergency endpoint has no dependency
on the planner or its regular rate-limit bucket.

New requests to existing authenticated Guardian coordination, chat, spoken-line,
and Style Swap routes also check Safe Mode before reaching their handlers.
An already dispatched legacy provider request cannot be recalled by this patch.
Public cached cinematic audio, local visual animation, and the existing
client-side judge demo are outside the simulation executor. Do not describe
Safe Mode as a physical shutdown or a system-wide network firewall.

The existing mission registry's user-supplied milestone evidence and older
client receipt history remain separate from this engine's independently verified
run state. They must not be used as proof of a successful external action. The
legacy model/TTS/Style Swap routes have not been migrated into a token-gated
connector broker. Before real Guardian tools are enabled, migrate every relevant
action path, give the model a separate non-owner identity, integrate revocation
with in-flight cancellation, and test cross-instance stop behavior.

Audit is append-only through this application API and hash chained. A database
administrator can still modify the underlying collection. Production needs
restricted database roles, independently anchored audit roots, and a segmented
audit collection. Run and grant state is capped at 100 each per user for this
pilot; archive/pagination and cleanup are expansion work. No new model usage or
paid media generation is required to demonstrate this feature.

## Run and review

1. Backend: set the existing `MONGO_URL` and `DB_NAME`, start the existing app.
   Startup adds a unique user index to `guardian_control_state`.
2. Frontend: use the existing Expo app and `EXPO_PUBLIC_BACKEND_URL`. Open the
   hub's **Permission Centre** button while signed in.
3. Review a files/calendar/creative access grant; confirm the exact scope.
4. Prepare a plan; continue to see `approval_needed` under A2.
5. Inspect data/destination/reversibility, approve the plan, then continue.
6. Check the stored result independently: only this transition can produce
   `completed_verified`. The UI continues to label it simulated.
7. Resolve or discard the proposed project memory. Test revocation and Safe Mode.

Focused tests (do not change the repository's pytest worker configuration):

```bash
cd backend
python -m pytest test_guardian_control.py test_guardian_core.py \
  test_guardian_store.py test_guardian_routes.py \
  test_guardian_server_integration.py test_guardian_astra_eval.py \
  test_style_swap_routes.py -q
```

Testing verifies runtime logic and HTTP integration against a test database
adapter. It does not attest to a deployed Mongo cluster, production Vercel
deployment, actual external tools, or physical Guardian hardware.

## Validation recorded

- Focused backend/HTTP/regression suite: **72 passed**, zero failures.
- Python compilation and `git diff --check`: passed.
- Both changed TSX files parse successfully with the TypeScript/JSX parser.
- Permission Centre focused TypeScript check: passed with published React, React Native and gradient types, plus declared existing Auth/Guardian interfaces.
- React Native Web / JSDOM interaction smoke against the new HTTP API and test database: passed grant, A2 approval, execution, independent verification, retained memory, Safe Mode and explicit resume with revoked grants. Authentication, Guardian rendering and gradient used test adapters.
- Full Expo web export: **passed in GitHub Actions** for implementation commit `9457cb8625519672927a28c35dfeb1cecdf129d3`. [Style Swap CI run 38234550162](https://github.com/kingstvieee/cross-life-ai/actions/runs/38234550162), job `frontend-web-export` (114761905683), completed both `yarn install --frozen-lockfile` and `yarn expo export --platform web` successfully. The earlier local dependency-fetch failure does not negate this CI build evidence.
- All four associated pull-request workflows passed for that implementation commit: Style Swap CI, Guardian Server Integration CI, Guardian Trust and Loop Simulation, and Guardian Activation CI. Build success does not prove authenticated deployment behavior.
- October 12 follow-up: the seven-file focused suite above was rerun from that exact implementation commit: **72 passed**, zero failures (two dependency deprecation warnings). Python compilation of the fetched backend review modules also passed. These checks still use test database/authentication adapters.

## Staging inspection and draft gates

On October 12, GitHub reported both Vercel previews Ready. Direct browser inspection found:

| Preview | Observed result | What this establishes |
| --- | --- | --- |
| [STAARWAARDD preview](https://staarwardd-git-codex-guardian-trust-loop-20261012-staarwarddd.vercel.app/) | Entrance and existing chamber load; Permission Centre opens and labels all three connectors SIMULATED. Reload controls renders `Request failed (404).` | Real-browser rendering smoke only; no successful authenticated control API response |
| cross-life-ai preview | Redirects to Vercel login/deployment protection | No authenticated application test performed |

The reachable preview cannot currently demonstrate grants, action confirmation, result verification, revocation, Safe Mode or per-user state isolation against a running backend. No grants or Safe Mode mutations were submitted during this browser inspection.

`frontend/src/auth.tsx` uses `EXPO_PUBLIC_BACKEND_URL`, falling back to same-origin requests. The checked-in `vercel.json` exports the frontend and contains no API rewrite. This identifies a configuration/deployment investigation path, not proof of which environment setting caused the observed 404. Do not substitute a guessed backend host or weaken preview protection.

Before merging this draft:
- Confirm a staging backend with this implementation mounted at `/api/guardian/control`, a deployed MongoDB collection and the required unique user indexes.
- Point the preview at that verified backend (or configure a verified same-origin API route), validate CORS and authentication, and rebuild if changing the Expo public environment.
- Use two distinct staging users to demonstrate isolation of grants, runs, memory and stop state; demonstrate exact A2 approval, independently checked completion, revocation before dispatch, Safe Mode and explicit resume without restored grants.
- Demonstrate cross-instance stop behavior against real shared MongoDB, including concurrent requests. Test-adapter CAS/race checks are not this deployment proof.
- Demonstrate cancellation of already-dispatched legacy provider requests before claiming system-wide stop. This remains unimplemented/unverified.
- Complete real-device visual/interaction QA. The browser rendering smoke does not replace it.

Keep PR #18 in draft until these required deployment checks are demonstrated. Real connector integrations remain simulations; existing Guardian design and cinematic material are unchanged. No paid generation or live model evaluation was used for this follow-up.

## Primary technical references consulted

- [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html): server-generated transaction details, server-side enforcement, short authorization lifetime and operation-specific credentials informed the exact-action approval contract.
- [MongoDB Atomicity and Transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/): single-document atomic updates and expected-value matching informed versioned CAS storage.

These references inform design choices; they are not certifications of this code.
