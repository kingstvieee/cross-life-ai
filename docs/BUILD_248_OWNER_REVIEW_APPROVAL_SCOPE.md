# Guardian Build 248 — owner review decision (20 November 2026)

**Decision communicated in ChatGPT:** “Approved.”

**Interpreted approval scope:** The owner approves proceeding past the Build 248 *duplicate-ear artifact correction review*. The immediately preceding deliverable was a private comparison and package containing two alternate 3D models that remove two redundant static ear shells from the moving head while retaining the protected facial skin, earrings, joint hierarchy, and all 11 animation clips.

**This is not an unconditional release receipt.** The user did not separately specify which of the two material/color variants should become the exact final production binary, nor independently accept all remaining facial-identity, facial proportions, raised collar, detailed armor, iPhone speech/lip-sync, and device-performance conditions. The working visual direction for the next revision is **Cinematic Chrome**, following the preceding recommendation, but the **Titanium Luxe** variant remains available as an alternative. No other user approval is inferred.

Exact owner-reviewed private model SHA-256 identities:

| Model | SHA-256 | Status |
|---|---|---|
| Build 248 Cinematic Chrome duplicate-ear repair | `2a3ef97275db797daa4247297770b3c062051fcc6461adb39c4faa99a8205c8d` | Ear correction accepted for continued design; **not release-approved** |
| Build 248 Titanium Luxe duplicate-ear repair | `3b3ccefe72bd5f9dc3828fc09f8f080c06d7f9f356e771e108e57e6db9d8d525` | Kept as alternative; **not release-approved** |

Independent QA previously reported 60/60 structural tests and matching sequential walk captures showing removal of the two duplicate static ear shells. Technical QA is not evidence of final likeness approval or physical-device certification.

## Release controls — unchanged

- Keep both exact SHA values quarantined in `frontend/scene-src/approved-guardian-asset.mjs` and `frontend/src/guardian-armor-lock.ts`.
- Do not publish private GLBs, user's face photos or protected original assets into the public repository.
- Do not change the approved startup film or soundtrack.
- **No Expo EAS build, paid credits, signed IPA, App Store submission or TestFlight replacement authorized merely by this review approval.**
- Next artifact review is a new, private **facial-likeness and raised-chrome-collar revision** compared against the saved locked Guardian reference, in front/three-quarter/profile and animated walk/run views.
- Production promotion still requires exact new binary-specific artistic acceptance, verifiable rights/provenance, real-iPhone QA and signed release evidence.

This record captures the **limited current-turn decision** without changing any runtime behavior or fabricating a hardware acceptance.
