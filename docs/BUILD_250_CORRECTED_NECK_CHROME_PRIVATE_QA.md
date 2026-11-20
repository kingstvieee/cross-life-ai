# Build 250 — real GLB neck/chrome repair, protected identity, release hold

**Date:** 2026-11-20 Toronto. **Owner project:** STAARWAARDD Guardian. **Cost:** CAD $0 incremental. **EAS builds:** 0.

## Actual private model and provenance

Source: Build249 exact SHA-256 `f2465c2a670af1e22d884689253bffc6ade39094313d11be7269f00e26774114`.

Build250 private corrected model: SHA-256 `057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134`, 12,646,332 bytes.

**Technical visual correction:** The raw B249 GLB already contained the properly oriented locked-reference portrait texture; the inverted appearance in an earlier review was caused by a stale stand-alone scratch projection image / comparison, not the real B249 file. Exact GLB textures were inspected and fresh comparison images were rendered to remove that inconsistency. Build250 changes the exposed reddish lower-neck mesh (node 176, mesh 172) to a new charcoal ballistic undersuit material and lowers metallic reflections for two previously added chrome materials (slots 27, 28) so the silver armor is legible in low-IBL scenes.

**Protected:** The *entire original binary chunk* is identical, including existing locked face atlas, 16 facial morph targets, skin/weights, all original geometry and meshes except the neck primitive material pointer, all 11 animation clips, all nodes, original approved visual source, ear shell cleanup, and approved startup film/audio.

**Independent validation:** 268/268 fine-grained structural assertions pass against the exact B249 GLB; offline VTK renderer loads 57 actors and 11 animation clips in both versions; front, three-quarter, side, full-body and walk-loop comparison images are generated from the actual two GLBs. Verifier + builder are bundled with the owner's private B250 ZIP in their Library `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/`.

## Unresolved, never pretend cleared
- Full cinematic facial geometry and collar/armor detail **do not yet exactly reproduce** the locked photo. A single front reference and texture re-projection cannot supply missing 3D anatomy or independently certify likeness.
- The user has not given **exact B250 final-asset acceptance**, legal provenance release record, or signed physical-device art/voice evidence.
- Actual hardware iPhone walk/run and 16-viseme face speech calibration, full ten-world 3D collision QA, independently verified runtime provider connections, signed Apple IPA and authenticated TestFlight install remain unverified.
- Source-only GitHub checks and unsigned simulator compilation are **not** equivalent to a successful live iPhone or Apple submission.

## Production actions
- Offline asset importer and native activation explicitly deny exact B250 SHA; a forged all-true receipt cannot release it.
- No private GLB/user image/atlas committed publicly; no EAS build requested, no new TestFlight publication.
- Keep using the previously approved startup experience and Guardian fallback until independently accepted final GLB and device evidence exist.
