# Guardian 32-component delivery register

Previous scope 773 + proposed additions 32 = planning total 805. Existing 773 not independently audited.
All new items UNVERIFIED until code, automated tests and runtime proof exist.

| ID | System | Component | Status |
|---|---|---|---|
| G32-01 | Holographic Guardian | 3D asset loader | UNVERIFIED |
| G32-02 | Holographic Guardian | rig and skeletal motion | UNVERIFIED |
| G32-03 | Holographic Guardian | chrome-gold emissive shader | UNVERIFIED |
| G32-04 | Holographic Guardian | bloom and energy effects | UNVERIFIED |
| G32-05 | Holographic Guardian | idle/listening/speaking state machine | UNVERIFIED |
| G32-06 | Holographic Guardian | viseme lip-sync bridge | UNVERIFIED |
| G32-07 | Holographic Guardian | mobile graphics fallback | UNVERIFIED |
| G32-08 | Holographic Guardian | live device-state visual binding | UNVERIFIED |
| G32-09 | Voice | persistent cross-portal audio session | UNVERIFIED |
| G32-10 | Voice | speech intent parser | UNVERIFIED |
| G32-11 | Voice | speech-to-action confirmation | UNVERIFIED |
| G32-12 | Voice | mute and interruption policy | UNVERIFIED |
| G32-13 | Tuya | entity discovery | UNVERIFIED |
| G32-14 | Tuya | RGB brightness and colour commands | UNVERIFIED |
| G32-15 | Tuya | post-command state readback | UNVERIFIED |
| G32-16 | TTLock | gateway capability detection | UNVERIFIED |
| G32-17 | TTLock | read-only lock and battery status | UNVERIFIED |
| G32-18 | TTLock | protected access action policy | UNVERIFIED |
| G32-19 | Google Home and TVs | device inventory reconciliation | UNVERIFIED |
| G32-20 | Google Home and TVs | TV protocol discovery | UNVERIFIED |
| G32-21 | Google Home and TVs | TV action adapter | UNVERIFIED |
| G32-22 | Google Home and TVs | TV state verification | UNVERIFIED |
| G32-23 | Digital twin | telemetry schema | UNVERIFIED |
| G32-24 | Digital twin | event ingestion | UNVERIFIED |
| G32-25 | Digital twin | stale/offline detection | UNVERIFIED |
| G32-26 | Digital twin | dashboard binding | UNVERIFIED |
| G32-27 | One screen | persistent Guardian shell | UNVERIFIED |
| G32-28 | One screen | ten-portal navigation | UNVERIFIED |
| G32-29 | One screen | unified status and routine panel | UNVERIFIED |
| G32-30 | Assurance | role-based authorization | UNVERIFIED |
| G32-31 | Assurance | command audit log | UNVERIFIED |
| G32-32 | Assurance | integration release-gate tests | UNVERIFIED |

## Evidence gates
- Preserve existing Guardian voice and ten portals.
- Confirm physical device readback; never infer success from an issued command.
- TTLock remains status-only until explicit authorization and gateway verification.
- Keep credentials server-side.
- Pass release tests before merge or deployment.

## Existing repository findings
- `frontend/tests/home-assistant.test.mjs` tests readback and rejects lock actuation.
- `frontend/components/staarwardd/portal-screen.tsx` uses shared Guardian audio.
- `.github/workflows/guardian-release-gates.yml` already runs extensive tests.