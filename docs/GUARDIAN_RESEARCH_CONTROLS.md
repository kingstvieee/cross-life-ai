# Guardian research controls — implementation checkpoint

Date: 2026-11-15 UTC. Branch: `codex/guardian-research-controls`.
Baseline: main `cca772d`. Status: backend prototype implemented and locally evaluated; live deployment and production reliability are unverified.

## Implementation and evidence

| Requirement | Implemented behavior | Evidence and limits |
|---|---|---|
| Delegated action permissions | Existing exact action/version/hash grants retained. New worker-protected `POST /api/guardian/core/workflows/{id}/send-admission` rechecks current grant and cancellation before send. | Revocation before admission rejected in 100 deterministic repetitions. This is a point-in-time check, not atomic revocation of a remote provider operation. Workers must call admission immediately before sending and use provider idempotency. |
| Durable workflow replay | Existing Mongo state/outbox/lease/readback design retained. Repeated sent transitions rejected. | 100 deterministic restart/replay repetitions keep one logical outbox operation. In-memory collection fixtures do not establish Mongo failover or exactly-once remote effects. |
| Memory continuity | Authenticated Life Map API with provenance, optimistic revision checks, current-only retrieval, seven backend portal scopes, corrections and content deletion across all revisions. Stored text has no authorization capability. | 70 lifecycle cases across home, work, creativity, wellbeing, relationships, community and style. Keyword retrieval only; no semantic model evaluation or downstream prompt-injection resistance claim. Backend community ID differs from the Village UI route `events`; no UI routes changed. |
| Minimum Necessary Interruption | Quiet speech overrides proactive consent. Naive timestamps rejected. Existing Toronto noon gate preserved. Private-mode-aware notification API deduplicates greeting per bearer session and check-in per caller event ID. | 100 repeated enqueue attempts create one inbox event. Inbox only; no new push, audio playback, urgency classifier, delivery acknowledgement or frontend login integration. Rotated tokens can produce a new greeting key. |
| Cross-app discovery | Optional operator allowlist via `GUARDIAN_POPPY_DISCOVERY_HOSTS`. Fixed public HTTPS discovery path; pinned DNS address plus hostname TLS validation; size limit; no redirect, compression, cookies, credentials or downstream calls. Only projected metadata returned. | Evaluated restricted signed-out subset, not a full Poppy implementation or verified company identity. No OAuth, issuer binding, account access or transactions. |

## API contract

Authenticated account routes under `/api/guardian/life-map`:

- `PUT /records`: `fact_id`, `portal`, `text`, `source_id`, `source_span`, `expected_revision` (zero for create).
- `GET /records?portal=work&query=meeting`: at most ten matching current records, scoped to an enabled portal and authenticated user.
- `DELETE /records/{fact_id}`: scrubs content/source spans/source IDs from every stored revision of that fact. Retains non-content revision metadata. Does not erase backups, logs, exports, external copies or independently derived summaries.
- `POST /notifications`: `kind` = `greetings` or `checkIns`; check-ins require `event_id`. Existing consent and quiet-hours policy apply. Queued means inbox persisted, never delivered.
- `GET /notifications`: inbox records only.
- `GET /poppy/discovery?host=example.com`: configured public host only; otherwise fail closed.

New collection: `guardian_life_map`, unique `user_id` index. Per-user compare-and-swap retries five times. Caps: 1,000 revisions, 1,000 notification events and 8 MiB serialized state. Capacity fails closed; retention/compaction requires a separate migration. Collection contains personal information and requires the same encryption, backup access and retention protections as existing account data.

Send admission and sent recording are deliberately separate: a late revocation cannot erase an already-crossed boundary. `/sent` remains an authenticated trusted-worker assertion, not independent provider evidence. Existing readback reconciliation determines verification. A compromised worker can misreport it. No global transaction spans Guardian and another application.

## Verification

Python 3.12; isolated environment with FastAPI 0.110.1, httpx 0.28.1 and python-multipart 0.0.32.

Command:

```sh
python -m pytest -q backend/test_guardian_*.py backend/test_identity_routes.py backend/test_conversation_history.py backend/test_companion_speech.py backend/test_voice_input.py
```

Result: **393 passed**, four dependency deprecation warnings. Counts include repeated deterministic replay/revocation checks; they are not 200 independently sampled production incidents. API tests exercise authentication, portal authorization, user isolation, correction, deletion and default-denied notifications. Transport tests exercise private addresses, malformed hosts/documents, redirects, response size, compression and duplicate JSON keys. New test filenames match the existing Guardian suite glob.

`git diff --check` passed. No live Mongo, OAuth provider, remote write, DNS/TLS integration, device, voice, browser UI or deployment test performed. No formal verification, full natural-reader origin graph, calibrated evidence fusion or satellite integration is claimed.

## Prioritized remaining acceptance work

1. Integrate the send-admission call into each actual provider worker, retain provider idempotency and separate readback. **Proposed targets:** zero unauthorized sends in 100 varied revocation/race cases per adapter; zero duplicate remote effects in 100 injected crash/retry cases. Measure revoked-token behavior at each provider, including cached tokens and active requests.
2. Wire Life Map retrieval and deletion into every actual model context, cache and export path. **Proposed targets:** zero deleted/superseded spans retrieved in a 70-case corpus; 100% returned claims retain source/revision; cross-account leakage zero in adversarial tests. Establish backup expiry before claiming complete deletion.
3. Wire login/arrival UI to the inbox and add delivery-time policy rechecks, acknowledgements, expiration and interruption budgets. **Proposed targets:** at most one discretionary greeting per logical login; zero discretionary spoken events during quiet/private mode; track dismissal and user-rated usefulness before setting a fatigue threshold.
4. Run real Mongo concurrent-write/restart tests and provider fault injection; attach traces and recovery measurements to the scope card. **Proposed target:** 100% injected failures visibly reach retry, reconciliation or abstention rather than silently succeeding. Recovery-time targets require measured adapter baselines.
5. Keep discovery read-only until explicit issuer binding, authorization scope/revocation and endpoint contract tests exist. Treat all fetched text as untrusted input. Do not promote benchmark findings or vendor documentation into production guarantees.

Incremental paid service spend: **CAD 0** for this checkpoint (no paid API or infrastructure action invoked; excludes existing subscription and workspace compute costs). No hosting or operating-cost estimate is asserted without workload and provider configuration.
