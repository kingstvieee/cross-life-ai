# Build 205 — Original 3D archive recovered and independently fingerprinted

On November 16, 2026, the user's original Library file `STAARWAARDD_Build198_Interactive_3D_Studio.html` was materialized and its embedded **real, binary GLBs** decoded; these were not regenerated, substituted, or downloaded from a third-party stock library.

Exactly **ten original cinematic world GLBs** and **one skinned Guardian GLB** were recovered. All eleven SHA-256 fingerprints matched the previously committed `build198-cinematic-review-register.json` byte for byte.

Private output archive: `STAARWAARDD_Build205_Recovered_Private_3D_Source_Checkpoint.zip`, SHA-256 `55e0a8a7fa1d5fbd82e52c8a73f35a39097e7e3ff538e849085b943c301b7e4e`. The archive is intentionally **not** in the public GitHub repository; only hashes and the negative QA verdict are committed.

## Guardian measured from actual recovered binary
- Original Build 198 Guardian SHA-256 `da1848abf56884827abe3315a7ed2108a4301eb62be9bfd5b6d0e058354e8395`.
- 10,285 face vertices, 1 skin, 2 glTF animation clips, 16 named morph slots.
- The fourteen speech shapes have some directionally identical deformation vectors. Maximum measured absolute cosine is approximately **1.0**.
- The Build 204 independent geometry gate correctly rejects this earlier review model, even though it has sixteen correctly named targets.
- This does **not** establish final face identity, real 90° profile, fixed UV seams, spoken lip sync or Apple device rendering.

## Separate outcomes
**Passed:** original bytes recovered; all ten original world SHA-256 fingerprints verified against trusted repository register; Guardian source fingerprint and geometry decoded; no paid credits used.

**Failed/pending:** genuine improved Build 201 private model has not been recovered by this step; Build 202 experimental GLB remains explicitly rejected; ten final worlds still lack actual app physics, rights receipts and physical-device acceptance; no signed IPA/TestFlight upload.

**Release verdict: NO-GO.** Preserve the recovered originals as a private recovery checkpoint. Do not silently replace the locked Guardian, and do not set `founderApprovedRig` or `deviceCaptureVerified` true solely from the existence of these files.

No external cash spent: **CAD $0**.
