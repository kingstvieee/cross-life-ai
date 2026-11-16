# STAARWAARDD — Build 187 Independent Production Evidence Gate

**Status:** Production-release safety feature. It does **not** declare the Build 186 technical studies accepted.

## What changed
The signed-iOS preflight now demands a separate external-evidence ledger after all ten individual world GLBs and the identity-approved armoured Guardian pass their existing GLB/receipt checks. Asset JSON approval flags alone no longer satisfy the production gate.

### Required delivery
Put the true approved GLBs and their founder-issued production asset receipts in the existing `frontend/scene-src/assets/` locations. Also place a separate `frontend/scene-src/assets/evidence/acceptance-ledger.json` and the actual media/evidence files it references. Do not copy the unapproved Build 186 studies into that protected production folder.

The ledger must use `schema: staar-production-evidence-ledger-v1` and contain **exactly 11 asset records** keyed by `guardian-armored-rig` and the ten keys listed by `REQUIRED_WORLD_ASSETS`. Each record requires a match to the actual approved model's SHA-256, plus:
- `founderAcceptance: {decision: "accepted", reviewerId: "actual-reviewer", acceptanceId: "actual-record-id", signedAt: "ISO-8601"}`
- Guardian only: `sourceImageSha256` exactly matching the locked original armour reference.
- `evidence` object with four required named file descriptions. Each must contain `{filename, sha256, sourceRecordId}`, pointing to a nonempty real file stored alongside the ledger, with an independently matching file hash.

Guardian evidence roles: `faceMultiAngle`, `armorCrest`, `deviceSpeechSync`, `rights`. World evidence roles: `visualComparison`, `deviceCapture`, `animationNavigation`, `rights`.

The verifier rejects duplicate or omitted assets, changed model hashes, unrecognized file names, traversal, missing media, tampered SHA-256 and incomplete acceptance fields. An ordinary production build refuses to proceed on these errors.

**Scope limitation:** File hashes establish byte integrity and continuity, not whether an image matches a human face, a reviewer is authorized, the licence is authentic, the capture came from a real device, or the user actually accepted the design. Those facts require independent human verification. This ledger does not sign or submit an IPA.

## Build 187 portable review viewer
`STAARWAARDD_Build187_3D_Approval_Review.html` presents all eleven exact technical GLB studies in an orbitable, animated viewer with a per-model decision/defect/evidence input panel, plus export/import of `staar-build-187-founder-review-v1` JSON. Its exported decisions **never** set true production receipt flags.

The founder can inspect front/profile/three-quarter views and request changes, but must not be shown a production PASS while real final assets, licences and device evidence are absent.

## Release sequence
1. Obtain an accepted *full-profile* Guardian face and armour rig, actual 16-viseme audio QA and ten visually accepted finished 3D worlds.
2. Obtain the exact locked separate `Starward Guardian(2).m4a` audio master. Verify its exact bytes, owner rights, iOS audible playback and the user mute switch; never substitute a differently titled Suno recording.
3. Complete live provider OAuth and device readbacks and a signed iPhone/Watch acceptance run. Store actual evidence files, hashes, reviewer references and results.
4. Run `node frontend/scripts/verify-production-package.mjs` at repository root. Expected **NO-GO** until all genuine assets and all evidence exist.
5. Confirm production certificate and Apple/EAS signing, then create a new iOS build **106**, retest on the actual target devices and request the independent founder approval gate before TestFlight.

## Tests
Four regression tests create *synthetic temporary fixtures only*: complete ledger, missing device proof, tampered media/model hash, and path traversal/approval refusal. None are owner proof. Guardian Release Gates runs them on each candidate PR.

**No paid credits, TestFlight submission, production deployment, or approval of studies was made by Build 187.**
