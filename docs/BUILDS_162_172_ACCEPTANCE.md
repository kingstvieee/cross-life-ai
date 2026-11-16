# STAARWAARDD — Builds 162–172 verification ledger
Review sequence: PR #103 (162) → PR #104 (163) → PR #105 (164–172)
Repository: kingstvieee/cross-life-ai
Owner: STAARWAARDD implementation
This document records **development commits**, not signed iOS build numbers or founder approval.

| Build | Implemented code | Verifiable evidence / caveat |
|---|---|---|
| 162 | STARVERSE unique offline 3D gateway scene instead of reused Dreams | Separate game-islands, gateway, navigation; still marked DEVELOPMENT PREVIEW |
| 163 | Server-authorized daily iOS reminder consent, native cancellation and private mode | Checks before device scheduling, foreground reconciliation; no autonomous mic |
| 164 | Isolated session tag for every renderer load | Both native WebView and browser iframe reject stale ready/select events |
| 165 | Generation-based protection against stale Guardian consent responses | Foreground/account changes invalidate pending verification |
| 166 | Live check-in consent verified immediately before the native schedule call | Fails closed when account, check-in permission or private mode changes |
| 167 | Validated calendar payload shape on connection and token-refresh response | Malformed OAuth calendar responses cannot claim verified access |
| 168 | Stop native Guardian speech upon app background without background-audio permission | A notification is not unattended voice narration |
| 169 | Verified Watch handshake reported only if recent and correctly paired/installed | Pairing or Watch install alone is insufficient to claim readback |
| 170 | Refresh provider status upon app return to foreground | Clears stale connected badges while revalidating |
| 171 | Eight independent release sign-off requirements enforced in code | No production-ready status for missing assets, providers, devices or IPA |
| 172 | Aggregate 164–171 regression suites in Guardian Release Gates | Final CI and native simulator status must be read live from GitHub |

## Locked assets
- Existing 29-second startup MP4 remains in place and must match SHA256 `1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c`.
- All eleven locked approved PNG visual masters must retain their repository blob hashes. Preview geometry must never be presented as accepted final scenes.
- A precise 3D Guardian face matching the founder's approved identity is required. The current source includes viseme data validation and an audio-bound alignment handoff, **not an approved facial blendshape mesh**.

## Non-negotiable release gates
1. Nine of nine visually approved production-quality immersive 3D worlds, correct interactions and real-device captures.
2. Identity-approved Guardian 3D face rig and phoneme-aligned mouth/eye/head animation tested on actual iPhone.
3. Background permissions, user consent, native check-in delivery and Apple Watch pairing/readback on real devices.
4. Live Google/Microsoft calendar credentials and permission readback; all other advertised provider APIs must be connected or clearly labelled external websites. Google/Microsoft/Yahoo native sign-in may require deployment registration.
5. Fresh current-branch unsigned simulator compile, signed production IPA after explicit release authorization, and founder-controlled TestFlight acceptance.

**Verdict:** A green CI result is a **development check**, never acceptance of absent assets or live provider connectivity. No paid generation, production merge, or TestFlight submission is authorized by this PR.
