# STAARWAARDD Phase 2 Guardian Constitution — Rule-to-Code/Test Matrix

**Workspace:** `/home/ubuntu/staarwardd-recovered-61f121b-wip`  
**Scope:** Controlled recovery-workspace implementation only. This document records implemented local behavior, tests, and explicit limits. It does not authorize an external service, hardware connection, deployment, checkpoint, commit, or package build.

> **Operating boundary:** Guardian serves by explaining, preparing, and asking. It never represents a local preview, simulated scene, receipt, or unavailable adapter as a verified external device, account, person, sensor, communication, purchase, or completion.

## Constitution and interaction contract

| Requirement | Implementation | Deterministic evidence | Visible behavior |
|---|---|---|---|
| Service rather than control | `lib/staarwardd/guardian-policy.ts` — `GUARDIAN_CONSTITUTION.service`; `evaluateGuardianRequest` | `tests/guardian-policy.test.ts` | Guardian prepares a local proposal and leaves the decision with the user. |
| Truthful states | `GuardianActionState`; policy capability branches | `guardian-policy.test.ts` covers suggested, prepared, approval-required, unavailable, denied, executing, completed, failed | Cards and receipts name the current state rather than claiming real-world completion. |
| Suggest → explain → preview → approve → execute | Shared policy result plus `guardian-interaction.ts`; `home-routines.ts` | Policy and `home-routines.test.ts` | Consequential routines show a proposal and require a separate approval before a supported local completion. |
| Mandatory high-impact approval | `classifyGuardianRisk`, `requiresGuardianApproval`, high-impact keyword classification | `guardian-policy.test.ts` high-impact and overlapping-intent cases | Locks, cameras, alarms, purchases, accounts, communications, identity, and safety-critical language remain approval-gated. |
| Data minimization and no sensitive inference | `GUARDIAN_CONSTITUTION.privacy`; identity/occupancy denial | `guardian-policy.test.ts` | No inference of guest identity, faces, presence, relationships, emotion, or occupancy. |
| Visible opt-in/edit/delete memory | `preference-policy.ts`, `preference-memory.tsx`, `memory-sheet.tsx` | `guardian-activity.test.ts` | Local Memory is explicit, editable, disableable, and erasable. |
| Cross-portal consent boundary | `GuardianCrossPortalContext` policy gate | `guardian-policy.test.ts` consent and revocation cases | Cross-portal context is described and approval-gated when consent is missing. |
| Guest dignity | `home-routines.ts` descriptions/types; policy identity denial | `home-routines.test.ts` | Guest Arrival uses manual local mode only; it never identifies a guest or reads presence. |
| Manual override, cancel, undo/fallback | `cancelled`, `manualOverride`, failure/fallback fields; routine lifecycle | Policy and routine tests | Every routine has cancel/manual-return behavior; local preview completion is reversible by returning to manual controls. |
| Plain-language receipts | `GuardianReceipt`, `formatGuardianReceipt`, activity UI | Policy, activity, and routine tests | Activity history shows time, trigger, source, reason, proposed action, approval, outcome, and fallback/error detail. |
| Explicit uncertainty and safe degradation | `GuardianCapability` status and unavailable/failed branches | Policy and routine adapter tests | Speech, network, sensor, or integration limitations are stated; manual local preview remains available. |

## Personality and voice contract

| Requirement | Implementation | Deterministic evidence | Visible behavior |
|---|---|---|---|
| One Guardian personality | `guardian-voice.ts` — `GUARDIAN_TONE_GUARDRAILS` | `guardian-voice.test.ts` | Warm, composed, concise, protective without possession, and respectful. |
| Prohibited tone | Tone guardrail and `hasProhibitedGuardianTone` | `guardian-voice.test.ts` | No fear, shame, urgency, false intimacy, false consciousness, coercion, melodrama, or mystical pressure language. |
| Required response sequence | `GuardianVoiceResponse` exposes acknowledgement, verifiedContext, recommendation, rationale, permission, choices | `guardian-voice.test.ts` | Guardian answers with one verified recommendation and visible choices. |
| Named modes | `ARRIVAL`, `GUIDE`, `CAUTION`, `RECOVERY`, `CELEBRATION`, `SILENT/PASSIVE` | `guardian-voice.test.ts` | State-aligned language with silent mode returning no text and no speech. |
| Deterministic variation | Seeded lead selection and portal vocabulary | `guardian-voice.test.ts` | Portal context changes without changing Guardian identity. |
| Approved Hub line | Existing `hub-greeting.ts` remains unchanged | `hub-greeting.test.ts`; `guardian-voice.test.ts` | **“The field is awake. Where shall we begin?”** is preserved exactly. |

## Consent, memory, activity, and accessibility

| Requirement | Implementation | Deterministic evidence | Visible behavior |
|---|---|---|---|
| Shared interaction service/component | `guardian-interaction.ts`, `guardian-interaction-card.tsx` | Policy/voice/routine suites | Hub, portals, and Home routines render the same truthful policy/voice result. |
| Local receipt history | `guardian-activity.tsx`, `guardian-activity-policy.ts`, `guardian-activity-sheet.tsx` | `guardian-activity.test.ts` | Receipt history is visible and explicitly labeled saved locally or session only. |
| Dual opt-in persistence | `shouldPersistGuardianReceipts` | `guardian-activity.test.ts` | Receipts persist only when Local Memory **and** activity history are enabled. |
| Disable/erase consequences | `shouldClearGuardianReceipts`, provider storage-key removal | `guardian-activity.test.ts` | Turning off either setting clears Guardian receipts; erase removes the dedicated activity key. |
| User-visible manual control | `guardian-interaction-card.tsx`, `home-routine-sheet.tsx` | Policy and routine suites | Approve, cancel, manual override, fallback, and return-to-manual controls are visible. |
| Accessibility labels | `memory-sheet.tsx`, `guardian-activity-sheet.tsx`, `home-routine-sheet.tsx` | TypeScript validation | New switches and buttons expose explicit screen-reader labels and states. |
| Reduced-motion compatibility | No new animation path was introduced. Existing launch reduced-motion behavior remains unchanged. | `locked-experience.test.ts`; archive hash comparison in final validation | New UI is static modal/card UI and does not add motion work. |

## Manual-first Home routines and integration boundary

| Routine or boundary | Implementation | Test evidence | Current supported outcome |
|---|---|---|---|
| Guest Arrival | `HOME_ROUTINES["guest-arrival"]`; `HomeRoutineSheet` | `home-routines.test.ts` | Consequential local welcome proposal, approval, guest-mode expiry, cancel/manual override, receipt. No guest/presence inference. |
| Room Handoff | `HOME_ROUTINES["room-handoff"]` | `home-routines.test.ts` | Consequential local handoff checklist with approval, cancellation, and manual override. No room/device state. |
| Cinema Scene | `HOME_ROUTINES["cinema-scene"]` | `home-routines.test.ts` | Low-risk local simulation only. User may explicitly enable local auto-approval after an in-app warning; no device control. |
| Offline fallback | `evaluateHomeRoutine` fallback fields and routine sheet | `home-routines.test.ts` | Local preview/manual controls remain available when offline. |
| Future event adapter | `HomeEventAdapter`, `VerifiedHomeEvent`, `UNAVAILABLE_HOME_EVENT_ADAPTER` | `home-routines.test.ts` | Default adapter is unavailable. A future authorized adapter may prepare context-only proposals; it cannot identify people by default. |
| Event privacy | `VerifiedHomeEvent` has no person, face, guest, presence, or occupancy field | `home-routines.test.ts` | “Verified” means a separately authorized context signal, not verified identity. |

## Locked experience constraints

| Locked item | Preservation mechanism | Evidence |
|---|---|---|
| Package identity / native version | No change to `app.config.ts` | `locked-experience.test.ts`; final archive hash check |
| Seven portal IDs/routes/data | No change to route or portal data modules | `locked-experience.test.ts`; final archive hash check |
| Black Guardian and approved artwork/media | No changes to character, launch sequence, or assets | `locked-experience.test.ts`; final asset/hash comparison |
| Audio and silent default | No changes to audio provider/controls | `locked-experience.test.ts`; final hash comparison |
| Reduced motion | No new animation behavior | `locked-experience.test.ts`; source/hash comparison |

## Limitations and future-integration boundary

The build has **no** Google Home, Alexa, SmartThings, Home Assistant, camera, lock, alarm, light, television, speaker, thermostat, purchase, account, communication, identity, face, guest, presence, occupancy, or sensor integration. `HomeEventAdapter` is an interface only; the supplied adapter is explicitly unavailable and executes nothing.

No background notification or operating-system task is scheduled for Guest Mode expiry. The routine sheet shows an in-app expiry reminder while it is open, offers extension/end controls, and otherwise relies on the next manual interaction. No physical Android playback validation is claimed by this document.

The existing `tests/auth.logout.test.ts` suite remains intentionally skipped because the project’s authentication feature is not implemented; its source contains the pre-existing `describe.skip` marker and TODO. Phase 2 does not introduce, alter, or bypass authentication. The Phase 2 receipt model stores locale-neutral ISO timestamps. The present UI is English-only and does not claim a localization or translation system.

## Test inventory

| Test file | Focus |
|---|---|
| `tests/guardian-policy.test.ts` | Every policy state, high-impact network failure, concurrent independent evaluation, locale-neutral receipt timestamps, cancellation, override, cross-portal consent/revocation. |
| `tests/guardian-voice.test.ts` | Every voice mode, exact Hub line, response sequence, deterministic variation, tone guardrails, silent and unavailable behavior. |
| `tests/guardian-activity.test.ts` | Dual opt-in, ordering, session-only behavior, opt-out clearing, dedicated receipt key. |
| `tests/home-routines.test.ts` | All three routines, approval, local auto-approval boundary, expiry, cancel/override, unavailable adapter, verified context, failure fallback. |
| `tests/locked-experience.test.ts` | Package/version/versionCode, route, seven portal IDs, Guardian/launch/assets/audio, reduced-motion source. |
| Existing tests | Hub greeting, routine briefing, Home Safety, planning, and previous cinematic checks remain intact. |
