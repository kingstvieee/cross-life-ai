# STAAR Hub working requirements SH-306 through SH-345

## Scope, provenance and release gate

- This is a **working requirements record for correction and verification**, not newly discovered original specifications, an owner approval receipt, a signed TestFlight acceptance, a change to the 805-count policy, or permission to use a production service.
- Historical IDs remain SH-306 through SH-345. The original intake lists them as reserved without original criteria. The exact recovered replacements below come from the November 22 Guardian engineering PDF, pages 3–6. See the [conversation that introduced the handoff](https://chatgpt.com/c/6b00ef8f-523c-83ea-a768-9940c612d667?messageId=3ba071e7-b8cb-50af-b389-f49cbf88ebe2) and [combined handoff message](https://chatgpt.com/c/6b00ef8f-523c-83ea-a768-9940c612d667?messageId=7325ee0f-6f35-5bfd-91e3-d3283b011547). The historical PDF labels these as **proposed replacements**. No earlier explicit per-ID adoption, independent signed-build results or original numbered criteria were located.
- The current request authorizes correction and verification. Preserve the recovered criteria as working criteria where consistent with the current product. In five cases the working wording below corrects demonstrably obsolete assumptions, without claiming owner confirmation of an exact layout or changing the specified audio-consent safeguards.
- Evidence below is scoped to inspected GitHub merge `5fddf9fb1924d0ba472470476dfbfd744aae87db` unless clearly marked otherwise. A code lead, static test, local fixture, source screenshot, or generated bundle cannot substitute for a same-build authenticated device or service receipt. Recheck test/source results after applying a correction to a newer commit.
- Store one acceptance record per component ID and exact candidate. Include criteria version, signed build and commit, matching API revision if relevant, run ID/time, environment, actual result, and evidence reference. Keep the unverified or blocked statuses visible; no implementation or release pass is inferred from this record.

## Focused verification of the five revised criteria

| ID | Exact-source/local evidence at the inspected merge | What local evidence does not prove |
|---|---|---|
| SH-329 | The host is a fixed, full-bleed WebView with safe-area overlay and separate scrollable native “All worlds” sheet; source tests register all ten routes; local renderer selects all ten at a synthetic portrait size of 390×844. | A physical device viewport, actual clipping, real gesture hit targets, owner-approved artistic framing, or simultaneous visibility. A test portrait is not an approved device matrix. |
| SH-330 | Exact navigation and native directory register Home, Work, Creativity, Wellbeing, Relationships, Events, Style, STARVERSE, STAARSONIC and DIGGITSTAAR. Tests check runtime, route and older nine-identity parity. An additional exact-source check confirms native/renderer order, labels, fallback routes and artwork keys match. | Locked physical positions, visual order across device presentations, actual artwork and native destination behavior. The unstaged DIGGITSTAAR private studio master is explicitly null and uses entrance artwork, not evidence that the signed build contains the approved locked interior. |
| SH-331 | Exact source: signed-in Hub pushes a validated portal, resets its navigation lock on focus, and Environment offers a return control. The headless harness selects all ten. | Native stack and session preservation. Baseline risk: Hub uses push and Environment uses replace('/hub'); inspect both one-Hub and no-prior-Hub flows rather than crediting round trips or accepting duplicate layers. |
| SH-337 | The host reads and subscribes to iOS Reduce Motion and forwards it to the renderer. The harness passes reduced-motion entry and all ten local selections using the merged scene source and local rig. | Actual iOS setting changes, rendering, focus and interactions on a signed device. Three.js runs with test renderer/clock shims here. |
| SH-340 | The exact-source policy and host suites exercise Toronto time including DST, explicit out-of-window On entry, foreground/cooldown, current-account consent and privacy gates, and muted/error behavior. | Actual audible playback, native interruption timing, old-install migration in the real store, or real account transitions and privacy receipts. |

Local run: **41/41 cases passed** in nine Node suites on hash-verified files. The separate headless scene harness passed **5/5 scenarios**, including both reduced-motion simulations. The merged renderer blob is `72aa58379bd06b222e2d99b519d6cdfe4949aa7d`. This is evidence of the exercised software behavior, not 46 approved components.

## Individual requirements

“Recovered proposal” preserves the November 22 wording (whitespace normalized). “Working update” only appears for a criterion whose old wording conflicts with confirmed route registration or the current policy. Related test files are leads, not a recorded pass for the whole criterion.


### SH-306 · Mission activity summary

- **Recovered proposal (p. 3):** Present existing owner-scoped status counts and distinguish them from filtered row counts.
- **Recovered pass condition:** A filtered view shows its row count while the account total still matches the fixture’s full inventory.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Related code and API test located. Summary call and account total are separate from filtered paging and displayed row count. Verify with two owners and a filtered iPhone view.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-307 · Mission detail provenance

- **Recovered proposal (p. 3):** Expose the original link and derivation operation on copied or revised proposals to their owner.
- **Recovered pass condition:** The derivative opens its source for the owner and the same route returns 404 to another account.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Proposed UI criterion incomplete. Owner-scoped source link and operation data exist, but the selected detail does not visibly identify whether it was copied or revised. Test owner/foreign lookup and add operation label before native proof.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-308 · Mission controls recovery

- **Recovered proposal (p. 3):** Keep a mission detail recoverable after a stale action conflict.
- **Recovered pass condition:** A competing transition yields 409. Refresh shows the new state and updated available actions.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local transport behavior passes. 409 guidance and refresh-detail path are implemented; the run did not execute competing lifecycle changes on a device.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`frontend/src/guardian-missions.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-missions.ts)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-309 · Proposal retry reconciliation

- **Recovered proposal (p. 3):** Use one idempotency key for an unchanged draft until the submission outcome is known.
- **Recovered pass condition:** Simulate response loss after creation. The retry resolves to one stored proposal and the same ID.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local transport behavior passes; server test located. Same key remains after ambiguous failure; transport equality and a backend replay case are covered separately. Need an installed candidate and actual lost-response reproduction.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs), [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py)

### SH-310 · Distinct edited draft submission

- **Recovered proposal (p. 3):** Invalidate a pending draft’s idempotency key after the user changes proposal content.
- **Recovered pass condition:** After an ambiguous save, changing criteria submits a new key and does not rewrite the original.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; targeted case needed. Editing resets the held key. Retry-after-edit and preservation of original need a direct scenario.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs), [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py)

### SH-311 · Timezone-aware proposals

- **Recovered proposal (p. 3):** Require an explicit offset for optional schedule and deadline input and preserve the instant in UTC.
- **Recovered pass condition:** A Toronto offset example returns the correct UTC time. Naive and invalid dates are rejected.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local date boundary checks pass. Local tests verify offset normalization plus rejected naive/invalid time and UTC queue transport. Confirm accepted and rejected inputs on actual API/app version.
- **Source leads:** [`frontend/src/guardian-missions.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-missions.ts), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs), [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py)

### SH-312 · Schedule readiness message

- **Recovered proposal (p. 3):** Surface whether the environment enables preview execution before the owner tries to schedule.
- **Recovered pass condition:** The proposal remains readable when disabled and shows no queue action or false pending status.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Proposed UI criterion incomplete. Backend removes queue action when the feature is disabled. A readable proposal does not visibly explain disabled readiness before scheduling. Verify disabled mode and add a pre-action reason if this proposal is adopted.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-313 · Migration-safe lifecycle projection

- **Recovered proposal (p. 3):** Read pre-existing mission records with missing newer optional fields.
- **Recovered pass condition:** Seed a legacy mission without evidence, derivation or acknowledgment. Detail and list still render.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; targeted case needed. Optional legacy evidence and derivation are guarded. Seed one actual old-format record and inspect both list and detail on target build.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-314 · Concurrent reschedule conflict

- **Recovered proposal (p. 3):** Apply a schedule change only when the queued preview still has the expected start and zero attempts.
- **Recovered pass condition:** Two requests move one preview. At most one update succeeds and the latest detail shows the winning start.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local transport behavior passes; atomic code present. Client submits expected start; Mongo implementation uses state/prior-start/attempt checks. Two actual contenders against a configured staging store not run.
- **Source leads:** [`frontend/src/guardian-missions.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-missions.ts), [`backend/guardian_mission_preview.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_preview.py)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs), [`backend/tests/test_guardian_mongo_preview.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mongo_preview.py)

### SH-315 · Preview deadline ordering

- **Recovered proposal (p. 3):** Reject reschedules in the past or at or beyond the mission deadline.
- **Recovered pass condition:** The invalid schedule is rejected and the previously stored time is unchanged.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; targeted case needed. Recheck past and deadline-equal times against a persistent test record, including that prior start is not mutated.
- **Source leads:** [`backend/guardian_mission_preview.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_preview.py), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mongo_preview.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mongo_preview.py), [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py)

### SH-316 · Foreground mission status refresh

- **Recovered proposal (p. 4):** Refresh active mission details while the console is foregrounded, updating the active list when appropriate.
- **Recovered pass condition:** A queued mission becomes completed, detail updates, and it disappears from a queued-only list.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local state reducer behavior passes. Queued→completed removal from queued-only entries passed locally. Five-second foreground poll and repaint not observed on device.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`frontend/src/guardian-missions.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-missions.ts)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-317 · Poll suspension in background

- **Recovered proposal (p. 4):** Stop console polling when the app leaves the foreground or the view loses focus.
- **Recovered pass condition:** A mocked clock records no new polling requests in the background and a fresh read after resume.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; timer/app lifecycle not verified. Source guards background requests and aborts on blur/background. Observe request trace with mock clock and device resume.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-318 · Restore a mission from a deep link

- **Recovered proposal (p. 4):** Open the requested mission’s authorized detail after session resolution.
- **Recovered pass condition:** Cold-start with a valid owner link opens the expected mission. A foreign link offers neutral recovery.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; native cold-start case not verified. Route reads missionId and backend detail is owner-scoped; link-before-session navigation requires signed-in and foreign-account device runs.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-319 · Stale deep-link recovery

- **Recovered proposal (p. 4):** Offer a path back to the mission list when a linked mission is unavailable.
- **Recovered pass condition:** An expired or unknown link displays a recoverable state and Back returns to the console.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; recovery path not verified. Detail and fallback list resolve separately; capture neutral unavailable state and explicit return-to-list for stale links.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs), [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py)

### SH-320 · Signed-out mission boundary

- **Recovered proposal (p. 4):** Require a valid session before exposing authenticated mission actions or data.
- **Recovered pass condition:** A direct link while signed out reaches authentication without flashing a previous owner’s records.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; signed-out transition not verified. API authorization test exists. Evidence does not establish first-frame native privacy after cold opening a signed-out protected deep link.
- **Source leads:** [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py), [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`frontend/app/_layout.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/_layout.tsx)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/account-storage.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/account-storage.test.mjs)

### SH-321 · Result evidence presentation

- **Recovered proposal (p. 4):** Distinguish an unverified result from passed or failed verification using the stored evidence state.
- **Recovered pass condition:** Fixtures for missing, passed and failed evidence produce three distinct messages without a false pass.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Proposed UI criterion incomplete. Detail renders verification passed/failed only when the flag is boolean; absent evidence is not falsely passed but is not explicitly identified. Exercise three distinct fixture presentations.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mission_routes.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-322 · Result acknowledgment state

- **Recovered proposal (p. 4):** Expose the persisted mission acknowledgment timestamp after confirmation.
- **Recovered pass condition:** Reload the app after acknowledgment. The same timestamp appears and the action is no longer offered.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; reload receipt not verified. Detail reads stored acknowledgment and backend removes action after timestamp exists. App reload and timestamp persistence not observed on target build.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mongo_preview.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mongo_preview.py), [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-323 · Acknowledgment retry idempotency

- **Recovered proposal (p. 4):** Return the existing receipt when acknowledgment is repeated by the same owner.
- **Recovered pass condition:** Concurrent retries return the same timestamp and persist one mission acknowledgment.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Existing Mongo integration test located; not run here. Atomic update and fallback lookup present. Run simultaneous requests against a staging Mongo fixture and verify one durable timestamp.
- **Source leads:** [`backend/guardian_mission_routes.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/guardian_mission_routes.py)
- **Test leads:** [`backend/tests/test_guardian_mongo_preview.py`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/backend/tests/test_guardian_mongo_preview.py)

### SH-324 · Notice navigation target contract

- **Recovered proposal (p. 4):** Define a notice destination as a stable mission ID and verify the mission detail entry point accepts it.
- **Recovered pass condition:** A synthetic destination fixture opens the owner’s detail. This check does not require creating a notice.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Source present; native routing not verified. Validate synthetic notice fixture from launch through a signed-in owner detail route; no actual notice needs to be sent.
- **Source leads:** [`frontend/app/guardian-notices.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-notices.tsx), [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx)
- **Test leads:** [`frontend/tests/guardian-notices.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-notices.test.mjs)

### SH-325 · Console accessibility and safe area

- **Recovered proposal (p. 4):** Keep key mission controls reachable and clearly labeled with large text, VoiceOver and iPhone safe areas.
- **Recovered pass condition:** On device, navigate list, detail, refresh and return at an accessibility text size without clipped actions.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical accessibility check pending. Safe area and labeled/live-region controls are in source. Requires accessibility text size, VoiceOver and on-device safe-area walkthrough.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-326 · Exact build identity capture

- **Recovered proposal (p. 5):** Record the iOS app build, API revision and test run identifier before a device run.
- **Recovered pass condition:** The evidence record matches the installed build plus deployed API revision and can be correlated later.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical build/API receipt pending. Record exact signed replacement build + API revision + run ID; no correlated physical receipt found.
- **Source leads:** [`docs/guardian/757-foundation.md`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/docs/guardian/757-foundation.md)
- **Test leads:** [`frontend/tests/build220-testflight-release-gates.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/build220-testflight-release-gates.test.mjs)

### SH-327 · Physical iPhone cold start

- **Recovered proposal (p. 5):** Exercise the approved build from a terminated state on a physical iPhone.
- **Recovered pass condition:** Three cold launches reach the entry screen without a crash, white screen or indefinite boot state.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical cold-start check pending. Perform and record three terminated-state iPhone cold launches on the signed replacement.
- **Source leads:** [`frontend/app/index.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/index.tsx), [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx)
- **Test leads:** None identified for the exact physical criterion.

### SH-328 · Startup film skip and replay

- **Recovered proposal (p. 5):** Keep Skip, replay and sound controls usable on iPhone in the established startup sequence.
- **Recovered pass condition:** Skip reaches entry, replay restarts once, and sound state matches the on-screen control.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local startup cases pass; physical check pending. Local source/audio gate checks pass for replay, mute and skip-related cleanup. Validate actual control flow and media on installed iPhone.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/components/staarwardd/startup-audio-gate.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/startup-audio-gate.ts)
- **Test leads:** [`frontend/tests/startup-film-sound-default.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/startup-film-sound-default.test.mjs), [`frontend/tests/startup-audio-gate.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/startup-audio-gate.test.mjs)

### SH-329 · Signed-in homepage geometry

- **Recovered proposal (p. 5):** Hold the approved signed-in portal composition in one fixed viewport with all nine targets available.
- **Recovered pass condition:** The approved reference and supported iPhone viewport show nine tappable portals without page scrolling or clipping.
- **Working update:** Use the approved signed-in Hub composition in a fixed viewport. The home surface itself must not page-scroll; the 3D ring and an explicit native world list may independently navigate the ten registered portals. Do not replace proven simultaneous-visibility requirements with mere reachability.
- **Current acceptance:** On each supported iPhone viewport, compare the fixed Hub with the approved reference, record no clipping or page-scroll, and reach all ten targets using the approved interactions. Explicitly record whether simultaneous visibility is required and whether it passes. If no authoritative visual reference resolves that question, leave visual conformity open.
- **Baseline evidence:** Historical count conflict; physical viewport check pending. Merged contract expects 10 registered routes; the proposal expected 9 simultaneously visible. Locked layout approval and iPhone hit targets still need evidence.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/ten-portal-home-contract.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/ten-portal-home-contract.test.mjs)

### SH-330 · Portal roster and ordering

- **Recovered proposal (p. 5):** Use the owner-approved signed-in portal labels, positions and destinations.
- **Recovered pass condition:** Compare each of nine visible positions against the approved reference and verify the route it opens.
- **Working update:** Maintain ten registered routes, including DIGGITSTAAR. Match the owner-approved signed-in roster, labels, relative placement and artwork; keep the nine older visual identity records separate from current navigation.
- **Current acceptance:** Record each route and its displayed name, hit-target position, artwork and actual destination on the signed-in iPhone. Compare each to the owner-approved reference. If final ordering/placement or locked artwork is unavailable, that part is blocked rather than passed.
- **Baseline evidence:** Historical count conflict; local route parity passes. Local tests separate nine earlier design identities from ten navigable routes. Compare approved labels/positions. Device route, order and actions remain unverified.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js), [`frontend/src/locked-world-acceptance.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/locked-world-acceptance.ts)
- **Test leads:** [`frontend/tests/portal-navigation-consistency.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/portal-navigation-consistency.test.mjs), [`frontend/tests/locked-world-acceptance.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/locked-world-acceptance.test.mjs)

### SH-331 · Enter and return across portals

- **Recovered proposal (p. 5):** Keep a reliable route into each signed-in portal and back to the same Hub composition.
- **Recovered pass condition:** Enter and exit all nine. The app returns to the Hub without duplicate portal layers or a lost session.
- **Working update:** Provide reliable entry and return to the Hub for all ten portals without creating duplicate Hub or portal layers or switching the signed-in identity.
- **Current acceptance:** From a single signed-in Hub, enter and return from all ten using the intended return control and, where available, native Back. After each trip, verify one Hub layer, no duplicate screens, the same signed-in account, and the fixed approved layout. Also test a portal opened from a deep link without an existing Hub route.
- **Baseline evidence:** Historical count conflict; physical route-return check pending. Route parity is not portal entry, lifecycle or return on the device. Exercise all ten passage-and-return flows.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/portal-navigation-consistency.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/portal-navigation-consistency.test.mjs)

### SH-332 · Guardian model asset validation

- **Recovered proposal (p. 5):** Load the approved runtime rig with its skinned mesh, wings and flight animation tracks.
- **Recovered pass condition:** Inspect the loaded asset and capture motion on iPhone. The model deforms with its skeleton throughout flight.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local rig/asset evidence only; physical check pending. Earlier exact-asset harness loaded the replacement rig and checked wing motion. Record skinned deformation and flight tracks on signed replacement iPhone.
- **Source leads:** [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/approved-guardian-asset.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/approved-guardian-asset.test.mjs), [`frontend/tests/guardian-hub-arrival-idle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-hub-arrival-idle.test.mjs)

### SH-333 · Guardian armour fidelity

- **Recovered proposal (p. 5):** Apply the approved black-chrome and silver materials with illuminated details to the deployed Guardian.
- **Recovered pass condition:** Compare a neutral-frame capture against the approved concept with chest, armour and light details visible.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical armour review pending. Asset/material checks do not substitute for neutral-frame comparison to approved visual reference.
- **Source leads:** [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/guardian-armor-lock.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-armor-lock.test.mjs)

### SH-334 · Film-to-live continuity

- **Recovered proposal (p. 5):** Sequence the startup film and tunnel transformation into the wing reveal and the live Guardian entrance.
- **Recovered pass condition:** A normal launch plays the approved sequence once, then the live model takes over without a blank transition.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical cinematic continuity check pending. Observe start-to-live transition on actual approved assets; isolated stage tests cannot detect a physical visual handoff gap.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/startup-film-sound-default.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/startup-film-sound-default.test.mjs), [`frontend/tests/guardian-hub-arrival-idle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-hub-arrival-idle.test.mjs)

### SH-335 · Flight gesture acceptance

- **Recovered proposal (p. 5):** Animate arms and hands during arrival and turns, with coordinated wing, bank and gaze motion.
- **Recovered pass condition:** Review a device capture covering arrival and two turns. Arm pose shifts and wrist movement stay visible and coordinated.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical flight gesture check pending. Record arrival and two turns on device; shoulders, wrists, wing coordination, bank and gaze must be visible.
- **Source leads:** [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/guardian-hub-arrival-idle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-hub-arrival-idle.test.mjs)

### SH-336 · Guardian flight and portal hit targets

- **Recovered proposal (p. 6):** Keep the moving Guardian from blocking portal selection or system gestures.
- **Recovered pass condition:** Tap each portal while the Guardian crosses the Hub. Every target responds once and navigation stays correct.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Physical tap during movement check pending. Route/hit logic tests do not prove no occlusion or duplicate taps during an actual moving Guardian sequence.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/portal-navigation-consistency.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/portal-navigation-consistency.test.mjs), [`frontend/tests/guardian-hub-arrival-idle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-hub-arrival-idle.test.mjs)

### SH-337 · Reduced-motion entry experience

- **Recovered proposal (p. 6):** Honor the iPhone reduced-motion preference with a comfortable entry and access to every portal.
- **Recovered pass condition:** With reduced motion on, the entry settles without prolonged flight and all nine portals remain operable.
- **Working update:** Honor the native Reduce Motion setting and provide a stable entry with all ten destinations accessible. The signed-in user must not have to disable the accessibility setting to reach a portal.
- **Current acceptance:** On a signed iPhone, enable Reduce Motion before opening the app and turn it on while the app is open. Observe a settled entry without prolonged flight and open each of the ten destinations. Keep comfortable appearance, hit testing, and focus evidence from the actual device.
- **Baseline evidence:** Historical count conflict; local reduced-motion case only. Earlier exact local harness validated reduced-motion and ten navigation events; actual iPhone preference and all target interactions need capture.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/scene-src/worlds.js`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/scene-src/worlds.js)
- **Test leads:** [`frontend/tests/guardian-hub-arrival-idle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-hub-arrival-idle.test.mjs), [`frontend/tests/portal-navigation-consistency.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/portal-navigation-consistency.test.mjs)

### SH-338 · Voice across portal navigation

- **Recovered proposal (p. 6):** Keep authorized speech and the active voice session alive when the owner enters or leaves a portal.
- **Recovered pass condition:** Start a multi-sentence turn, change portals twice, and confirm speech continues from its current position.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Native continuous audio check pending. Start audible multi-sentence speech in the signed app and navigate twice while monitoring uninterrupted voice and motion.
- **Source leads:** [`frontend/lib/staarwardd/audio-provider.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/lib/staarwardd/audio-provider.tsx), [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx)
- **Test leads:** [`frontend/tests/guardian-speech-lifecycle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-speech-lifecycle.test.mjs), [`frontend/tests/guardian-playback-state.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-playback-state.test.mjs)

### SH-339 · Mute and stop semantics

- **Recovered proposal (p. 6):** Allow the user to mute or stop Guardian speech independently of mission cancellation.
- **Recovered pass condition:** Mute or Stop silences playback and mouth motion. An associated mission remains in its previous state.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local playback transitions pass; coupled device case pending. Local transitions fail silent on playback faults. Prove speech/mouth stop while independently tracking unchanged mission state.
- **Source leads:** [`frontend/lib/staarwardd/audio-provider.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/lib/staarwardd/audio-provider.tsx)
- **Test leads:** [`frontend/tests/guardian-speech-lifecycle.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-speech-lifecycle.test.mjs), [`frontend/tests/guardian-playback-state.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-playback-state.test.mjs)

### SH-340 · Opt-in proactive welcome

- **Recovered proposal (p. 6):** Deliver one welcome under the user’s saved voice preferences and honor quiet hours.
- **Recovered pass condition:** An eligible signed-in launch plays at most one welcome. A muted, quiet-hours or ineligible launch stays silent.
- **Working update:** Automatically welcome only the eligible, opted-in signed-in account: Off is silent; legacy Awake hours uses noon inclusive to 22:00 exclusive in Toronto; explicitly selected On entry bypasses only the legacy time window. Neither opt-in can bypass current consent, mute, quiet/private mode, active-account validation, or foreground/focus gates.
- **Current acceptance:** Using a signed-in iPhone, test Off, Awake hours and On entry around the Toronto boundaries and on eligible foreground return. Observe at most one welcome per eligible arrival, no unintended guest or account-switch carryover, and silence for mute, invalid or absent consent, quiet/private mode, or an ineligible session. An interrupted or missing visual cue must not bypass the privacy gates.
- **Baseline evidence:** Historical timing policy conflict; native audio check pending. Current policy distinguishes on-entry from awake-hours opt-in; awake-hours uses Toronto time. Verify disable/mute/privacy plus enabled policy on signed device.
- **Source leads:** [`frontend/src/guardian-greeting-policy.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-greeting-policy.ts), [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx)
- **Test leads:** [`frontend/tests/guardian-greeting-policy.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-greeting-policy.test.mjs)

### SH-341 · Voice interruption and recovery

- **Recovered proposal (p. 6):** Handle interruptions from calls or audio route changes without overlapping or restarting a stale turn.
- **Recovered pass condition:** Interrupt playback, then return. At most one eligible voice stream resumes and mute remains respected.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local playback state checks pass; system interruption pending. Simulated playback transitions and failures pass. Real call or route change, no overlapping stream and continued mute must be observed.
- **Source leads:** [`frontend/lib/staarwardd/audio-provider.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/lib/staarwardd/audio-provider.tsx), [`frontend/src/guardian-playback-state.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-playback-state.ts)
- **Test leads:** [`frontend/tests/guardian-playback-state.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-playback-state.test.mjs)

### SH-342 · Guest-to-owner transition

- **Recovered proposal (p. 6):** Keep sample content separate and switch to the approved signed-in experience after authentication.
- **Recovered pass condition:** Guest exploration exposes only sample content. Valid sign-in opens the owner surface without reusing guest credentials.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Guest flow source located; real sign-in pending. Guest renderer and account boundaries have code/tests. Guest→owner with verified credentials and no guest state leakage needs device proof.
- **Source leads:** [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx), [`frontend/app/_layout.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/_layout.tsx)
- **Test leads:** [`frontend/tests/ten-portal-home-contract.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/ten-portal-home-contract.test.mjs), [`frontend/tests/account-storage.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/account-storage.test.mjs)

### SH-343 · Device account switch isolation

- **Recovered proposal (p. 6):** Clear signed-in portal, mission and audio context when the active account changes.
- **Recovered pass condition:** Switch from A to B while A’s detail and voice are active. B sees only B’s data and hears no queued A audio.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Local conversation-session checks pass; account switch pending. World cache independence and clear operations pass locally; live two-account portal, mission and queued-audio isolation remain open.
- **Source leads:** [`frontend/lib/staarwardd/audio-provider.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/lib/staarwardd/audio-provider.tsx), [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx)
- **Test leads:** [`frontend/tests/account-storage.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/account-storage.test.mjs), [`frontend/tests/guardian-conversation-session.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-conversation-session.test.mjs)

### SH-344 · Offline and restore behaviour

- **Recovered proposal (p. 6):** Show an honest unavailable state and safely recover after connectivity returns.
- **Recovered pass condition:** Disable networking during a portal or mission fetch. Restore it and verify a clean retry without duplicate writes.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Network-loss/device restore case pending. Local errors are covered in parts; prove loss/reconnect on device and show no duplicate committed mutations after retry.
- **Source leads:** [`frontend/app/guardian-missions.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/app/guardian-missions.tsx), [`frontend/src/guardian-missions.ts`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/src/guardian-missions.ts), [`frontend/components/staarwardd/world-hub.tsx`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/components/staarwardd/world-hub.tsx)
- **Test leads:** [`frontend/tests/guardian-missions.test.mjs`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/frontend/tests/guardian-missions.test.mjs)

### SH-345 · Pre-notice device readiness verdict

- **Recovered proposal (p. 6):** Capture one build-matched acceptance record for the Hub, portal, account and voice checks.
- **Recovered pass condition:** Record pass/fail/blocked per applicable check with an evidence link and time. Unverified checks remain open for the SH-346 handoff.
- **Current acceptance:** Use the recovered pass condition as the working criterion.
- **Baseline evidence:** Signed device acceptance record pending. Create one correlated device receipt after applicable checks pass; do not import simulation or a prior build as evidence.
- **Source leads:** [`docs/guardian/757-foundation.md`](https://github.com/kingstvieee/cross-life-ai/blob/5fddf9fb1924d0ba472470476dfbfd744aae87db/docs/guardian/757-foundation.md)
- **Test leads:** None identified for the exact physical criterion.
