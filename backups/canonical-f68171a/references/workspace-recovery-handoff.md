# STAARWARDD Workspace Recovery Handoff

## Authoritative Native Workspace

| Item | Verified value |
|---|---|
| Managed workspace path | `/home/ubuntu/extracted-product-mobile-app` |
| Git root | `/home/ubuntu/extracted-product-mobile-app` |
| Branch | `main` |
| Latest saved Hub checkpoint | `61f121b4` |
| Git revision at verification | `61f121b` |
| Expo marker | `app.config.ts` present |
| Native project markers | `app/` and `assets/` present |
| Package version | `1.2.0` |

> **Do not replace this managed workspace with `/home/ubuntu/staarwardd` or another remote clone.** That clone was reported as non-authoritative and must not be used to overwrite the approved native STAARWARDD build.

## Current Working-Tree State

The checkpoint `61f121b4` contains the approved Hub Awakening interaction. The following routine-flow work is intentionally still uncheckpointed in the authoritative workspace:

| Area | Current state |
|---|---|
| App-open Guardian routine | Implemented with consent-controlled portal narration and local routine questions. |
| Home arrival and guest boundary | Implemented as an explicit Home-only “not connected” readiness state; it does not fabricate person, guest, occupancy, room, camera, door, or sensor data. |
| Tests | Deterministic greeting and routine-briefing tests added. |
| Modified files | `components/staarwardd/cinematic-hub.tsx`, `components/staarwardd/home-safety-sheet.tsx`, `todo.md`. |
| New files | `lib/staarwardd/hub-greeting.ts`, `lib/staarwardd/routine-briefing.ts`, `tests/hub-greeting.test.ts`, `tests/routine-briefing.test.ts`. |

## Safe Continuation Procedure

First, reopen the managed STAARWARDD project instead of a connected-computer clone. If the managed workspace needs recovery, restore checkpoint `61f121b4` through the project version history, then reapply only the documented routine-flow changes above. Do not publish or deploy as part of recovery.

Before further development, verify that the active path is `/home/ubuntu/extracted-product-mobile-app`, that `app.config.ts` is present, and that the resolved native version remains `1.2.0`. Then inspect the working tree before editing so the uncheckpointed routine work is retained.
