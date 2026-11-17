# STAARWAARDD Build 239 — Canonical Ten-World QA and Private Evidence Review

**Change scope:** Internal QA evidence validation and a pre-release bug fix. No new 3D GLB, model approval, user audio, iPhone signature, TestFlight or paid product.

## 1. Fix a real Build238 world telemetry mismatch

The React Native `WorldScene` passes `variant='realm'` for every non-Relationships world. The renderer loads actual canonical GLB variants: `home-residence`, `work-command`, `creativity-dream`, `wellbeing-health`, `events-village`, `style-closet`, `staarverse-universe` and `staarsonic-studio`; Relationships has `relationships-realm` and `relationships-singles`.

The earlier `normalizeIphoneQa()` erroneously compared the renderer's `metrics.worldKey` to `scene+'-'+hostVariant`. Thus a correctly captured Home world returned `home-residence` and would be rejected as a different-world payload because the host was `home-realm`.

**Correction:** `resolveCanonicalWorldQaKey()` now constrains and resolves the renderer's true world key. It rejects unknown worlds or an invalid variant and tests every one of the ten keys against the unchanged private capture archive map. Session binding, SHA checks and false Apple/owner attestation remain intact.

## 2. Evidence review tool

`frontend/scripts/build239-review-qa-bundle.mjs` independently reads a privately exported Build238 ten-world QA JSON bundle and optional Guardian capture. It prints a redacted per-world readiness report with no device identifier or source media.

Run from the `frontend` folder, with exports you deliberately downloaded and are authorized to inspect:

```bash
node scripts/build239-review-qa-bundle.mjs /path/private/ten-world-export.json /path/private/guardian-export.json
```

The optional Guardian file may be omitted. Neither file is uploaded, and private exports must **not** be placed in the public repository.

Checks in the gate:
- Exactly ten world IDs; bundle counters and missing lists reconcile.
- Local reports retain `UNVERIFIED` and `physicalIphoneOwnerAttestation=false`.
- Canonical world identity, SHA syntax, renderer model binding and rejection of all known review-only 201–237 GLB hashes.
- Real render-frame sample count, p95 frame interval at or below the suggested 30 FPS budget (33.34 ms), walking and running samples, attempted blocked-wall contact, positive movement distance, actual tagged triangle geometry, successful route preflight and absence of WebGL context loss.
- For Guardian, requires a bound hash not on the known rejected/private QA list, at least 300 frames, valid speech-packet counts and p95 render intervals at or below the suggested 30 FPS budget.

**Important distinction:** Passing these numeric tests only makes the report a candidate for **human review**. Neither a JSON export nor its p95 value attests that measurements came from a real iPhone, that the walk/run looks natural, that a capsule cannot penetrate walls, that portals go to the correct endpoints, that a floor is visually safe, or that the face and audio remain synchronized. Even the successful evaluation returns `finalWorldsAccepted=0`, `deviceCertified=false` and `releasePermitted=false`. The 30 FPS threshold is a proposed QA review budget, not a measured result.

## 3. Source build implications

The internal preview workflow started earlier was pinned to Git SHA `097d32aa01b6980f71e8f1ce33d1887d4a61518d`; that queued run **does not automatically contain** this Build239 change, even if a future GitHub branch is merged. The old workflow must not be represented as testing Build239.

If the corrected QA data path is required for physical-world acceptance, a **new uniquely pinned internal preview run** must be selected following Expo's preflight and owner approval. Cancel or otherwise close the older queued run first to avoid duplicate EAS work. Apple signing, on-device QA and founder acceptance remain separate.

## 4. Remaining real device criteria

Owner and external reviewers must independently witness live walks and runs, wall stops and floor support, true portal endpoint routing, 16 facial visemes and speech timing, correct Guardian likeness/armour, scene thermal/performance samples, no crashes, and certified 3D model rights/geometry. Every 3D GLB must be independently eligible; all known private QA candidate hashes remain quarantined.

**Additional direct development cost:** CAD $0. The cloud EAS Free plan currently showed 6/30 monthly builds, but cloud quota and prices must be rechecked before another EAS signing build.