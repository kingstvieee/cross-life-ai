# Build 192 — Private Guardian facial-capture intake

**Owner-approved visuals:** Build 189 three cinematic still images. These are visual-direction references, **not** real face scans or an approved final GLB.

**Status:** Build 190 and 191 technical models are not cinematic-likeness accepted. Build 191’s standalone capture studio is available only as a conversation file; no biometric photographs or videos are committed to GitHub.

## Delivered
- `frontend/scripts/guardian_capture_intake.py` reads a user-selected Build 191 capture ZIP **locally** without extracting the files or uploading anything.
- Checks: exact seven pose roles, complete flag, file names and bytes, ZIP safety limits, duplicate names and path traversal, SHA-256, JPEG dimensions (>=720 pixels each axis), basic MOV/MP4 header signs, immutable authentic photo reference hashes and the three owner-approved visual fingerprints.
- Outputs `manualReviewReady` only to indicate **archive structure/integrity readiness**, never face identity, real device proof, cinematic likeness, authorisation or production acceptance. It does not detect synthetic/deepfake media or certify that a JPEG/video can be decoded; these require separate independent review.
- Six synthetic-regression tests cover valid structured ZIP, missing profile, altered hash, under-resolution face JPEG, unsafe path, and incomplete capture. Tests contain **no real user photos**.

## Execute on a local machine
`python frontend/scripts/guardian_capture_intake.py /path/to/STAARWAARDD_Build191_Private_Facial_Capture.zip`

The uploader/capture interface is `STAARWAARDD_Build191_Face_Capture_Studio.html`. Captures needed: front neutral, left 45°, true left profile, right 45°, true right profile, slow head turn 10–20 seconds and lips/mouth calibration video 10–20 seconds.

**Privacy:** Upload the exported ZIP to ChatGPT only if the owner actively chooses to share those facial images and videos. Videos may retain metadata even though the capture HTML re-encodes photos to JPEG. Hashes and technical metadata do not prove a person's identity.

**No-go:** This milestone does not authorize loading the rejected Build 191 GLB into production, creating founder/device evidence, treating concept portraits as a physical profile or producing a signed TestFlight IPA. The Build 181–189 approval gates remain in effect.

**Cost:** CAD $0 additional cash.
