# STAARWAARDD — Builds 217–219 verification and release record
Date: 2026-11-16/17 (Toronto)

## 217 — Guardian audio-to-face integration
- Existing 16 named morph target controller remains bound to separately validated 3D skinned GLB.
- New `guardian-speech-bridge.js` accepts host playback frames only for the exact per-render session, loaded GLB model SHA, approved audio SHA and nonempty clip alignment evidence identifier. Bad/muted/stale input resets all facial influences to neutral.
- `worlds.js` now consumes the host frame pathway, resets on visibility loss and disposes cleanly.
- Added tests for actual mouth movement, muted/expired playback, bad model, audio or session.
- **Not certified:** No new user-approved final textured GLB with a model-specific hash exists in private staging, and no real aligned speech clip/device readback was submitted. Retain the locked 2D Guardian, block historical rejected 3D assets. The new bridge is an implementation interface, not fabricated speech evidence.

## 218 — Actual independent StarCenttinel deployed security change
- Supabase ca-central-1 project `khpprzhqovzhgxdltarq`, Edge Function `sentinel-control` version 2, `verify_jwt=true`, read-only live health challenge route, fail-closed JWT/nonce-bound optional HMAC proof.
- Deployed `public.starcenttinel_security_snapshot()` as SECURITY INVOKER restricted to service_role. Actual role permission readback: anon=false, authenticated=false, service_role=true.
- Registered dedicated live readback source in backend/starcenttinel_deployment/ (no keys).
- Actual database: `LOCKDOWN` revision 0; one Supabase Auth account exists but 0 owner challenges, 0 provider revocation receipts, 0 audit events and no independently verified owner WebAuthn. No false emergency credential-revocation claim.
- Current `STARCENTTINEL_PROOF_KEY` server-side secret has not been verified as provisioned. An unsigned LOCKDOWN response will be rejected by existing backend release gate, as intended.
- Supabase security advisor: leaked-password protection disabled (provider settings control, no silent authentication-policy change); four private RLS tables have no client policies (intentional deny-by-default).

## 219 — Private EAS inspected-archive boundary
- Verified original user-approved startup soundtrack remains in private Build 209 staging; not committed to public GitHub.
- Existing EAS include-list gate verifies local `.easignore` bytes.
- New signed-build preflight **requires** `STAAR_INSPECTED_EAS_ARCHIVE_DIR` when approved soundtrack bytes are present. This must refer to actual `eas build:inspect --stage archive` output, and verifies AAC bytes plus native Metro alias against the locked source SHA.
- A local ZIP or generated ignore file cannot substitute for actual EAS archive or Apple signing. Browser connector exposes no authenticated Expo profile; no EAS cloud upload was performed.
- Existing signed release remains blocked without final GLB + ten rights/visual/device evidence pairs, live provider/StarCenttinel proof, real-device acceptance, signed IPA and TestFlight report.

**Direct additional spend:** CAD $0. **Release verdict:** NO-GO until independently verified final private asset/device/security/Apple requirements have been met.
