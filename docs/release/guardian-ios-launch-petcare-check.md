# Internal iPhone release checks: launch, Guardian and Pet Care

## Verified at source

- The checked-in startup MP4 contains the transformation, tunnel, wings opening in flight and portal arrival. Frame sampling is visual evidence for that exact film, not a recording of an installed app.
- Main includes the separate live Guardian fly-in, pedestal landing and idle animation. The renderer only loads a release-gated GLB or the exact protected internal review asset. The available source and public build inputs do not establish that the live model has animated wings; the startup film is not evidence of that.
- STAARHEALTH opens Pet Care from the Wellbeing portal. Guest and demo users cannot load account pet care data. The dashboard treats telemetry as device status only. It does not validate the animal's safety, send emergency alerts, run feeding, or play companion audio.
- Existing internal signing config is manual, exports for internal testing only, and uploads to App Store Connect without requesting beta review. Update stale tests to enforce that split. See [Codemagic publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/).
- Add the locked Home, live arrival/idle and pet policy/receipt checks to Guardian Release Gates.

## Required on the exact signed internal iOS build

- Cold launch with a fresh install, then relaunch with a saved session. Verify skip, audio, Reduce Motion and the transition into the locked Home.
- Capture the live Guardian after the film ends. If wings are part of the approved live rig, capture deployment, motion, landing, idle and speaking without clipping. Inspect the exact rig rather than substituting a still or inferring live wings from the film. Exercise a missing-model fallback separately.
- Open each of the ten destinations, return to Home, and check that the guest flow and cross-portal audio behave as approved.
- Pet Care: signed-in load and account separation; foreground/background and lost network; a confirmed emergency record and an unconfirmed response. Verify no text/alert, feeder actuation or playback was triggered. Use a test account and no live feeder.
- Record the Codemagic build URL, source SHA, Apple build number, embedded Watch identity, signed archive evidence, TestFlight processing state and physical iPhone acceptance. No source test or Linux export certifies any of those.

The 32-component register contains separate avatar, voice, device, digital-twin and assurance requirements. Passing launch and pet checks does not close unrelated physical integrations or certify the 805-component roster.
