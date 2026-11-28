# STAAR Hub replacement: evidence required before readiness

- Sign only against an identified source SHA and the existing internal app target. This is
  not permission to publish publicly, merge to main, or deploy provider changes. Existing
  build 122 failed the owner check and is not a retest target.
- Provision the exact owner-approved private DIGGITSTAAR JPEG as a protected file on the
  internal macOS runner, not as a public repository file or publicly shared URL. Set
  STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED=1 and STAAR_DIGGITSTAAR_MASTER_PATH only for the
  authorized job. The workflow aborts before signing when the asset is not available.
- For Canva: the backend has a separate opt-in read-only app connection. The owner deploys
  the tested backend and configures CONNECT_CANVA_CLIENT_ID, CONNECT_CANVA_CLIENT_SECRET,
  exact HTTPS CONNECT_CALLBACK_ORIGIN, and PROVIDER_TOKEN_ENCRYPTION_KEY in its secret
  manager, not in chat or Git. Register the exact callback path /api/connections/canva/callback.
  Confirm account eligibility, consent, one metadata read against an authorized Canva
  account, disconnect, and no access after disconnect. No images, private edit URLs,
  provider tokens, or account contents belong in verification logs.
- References: https://www.canva.dev/docs/apps/rest-apis/reference/authentication/generate-access-token/
  and https://www.canva.dev/docs/apps/rest-apis/reference/designs/list-designs/
- Check on an iPhone while signed in: cold launch, fly-in, landing, audible welcome with
  the configured Atlas provider and measured lip sync; device mute, account quiet and
  private mode suppress automatic playback. Opening a portal must not interrupt a requested
  utterance. Guests must only see read-only portal artwork.
- For each of ten portals, capture correct entry artwork and test every visible action,
  its live account setup, error/empty/loading states, and a successful real read/write as
  applicable. A shortcut, mock fixture or screen push alone is not acceptance.
- On paired hardware, verify the authorized Tuya readback can distinguish a successful
  physical change from a mismatch. Do not test entry unlocking unless specifically scoped
  to the owner's device and separately confirmed. Verify supported TTLock read-only status,
  Google Home inventory and TV state through authorized device accounts.
- Preserve all 805 historical candidate IDs as 805 one-to-one components. Record the
  owner-approved scope and require traceable source, ownership and applicable same-build
  runtime receipts for every row. Do not merge away an ID or use a replacement roster.
- SH-751 through SH-757 each represent two separately tested requirements, not two new
  roster entries. Declare both `<ID>-PRODUCT` and `<ID>-STAGING-CLOSEOUT` in the row's
  `verification_criteria` as objects with `id` and `verification_lanes`. The row's lanes must
  equal the union of its criteria's lanes. Each receipt under these rows must name the
  row's `component_id` and its exact `criterion_id`; provide one unambiguous, passing runtime
  receipt per criterion and lane. Do not reuse the same evidence reference for both meanings.
  Qualify every receipt against the exact candidate build and source commit. Product
  evidence must reflect the required signed device, provider or application/API behavior;
  staging closeout evidence requires backend runtime proof for the candidate, not a
  synthetic fixture. The validator enforces the required minimum lanes. Approvals and
  receipt authenticity must still be reviewed separately.
- For Community Discovery: a new local-only route uses the official Ticketmaster Discovery API:
  https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
  Deploy only on authorization and configure TICKETMASTER_DISCOVERY_API_KEY server-side.
  Check an authorized Toronto lookup and verify missing configuration, genuine empty results,
  upstream errors, cancelled-event exclusion, Toronto time, and details links. No checkout is
  implemented. If multiple backend instances share a key, enforce shared quota at deployment.
- For exact component evidence: run scripts/check-staar-component-receipts.py against the
  preserved candidate CSV plus the approved review ledger. Its structured result is not
  a substitute for examining and authenticating actual receipts.
- Signed archive verification must hash the original locked JPEG at the exact location
  written by the native Metro embed step, inside the main iPhone app. A private Expo
  export, staged input, Watch copy, or a file sitting beside the IPA is not sufficient.
- Arrival voice: once explicitly enabled, test cold launch and a foreground return after
  20 minutes away, including outside legacy Toronto hours. Confirm there is no speech on
  brief return, when muted/quiet/private, or on a guest session. Test actual audible
  playback and lip sync. Optionally show a saved Work focus on the same account's Home.
  Confirm it disappears when hidden, privacy fails, or the account changes. It must not
  be spoken or sent to the server unless separately reviewed and sent by the user.

- Simulate an unavailable visual rig in a non-release QA session. Once the signed-in Home
  has been in view for ten seconds, verify an opted-in greeting may still speak once if all
  privacy, audio and foreground checks pass. Successful audio-only playback is not proof
  of lip sync. A missing or invalid server privacy flag must suppress automatic speech.

- STAARSONIC track sheet: on the signed internal candidate, open it from the
  locked STAARSONIC portal. Save a titled session with tempo, key, and production
  notes, cold-reopen and read it back, then switch to an independently authorized
  account and confirm the first account's sheet remains hidden. Verify the Share
  button opens the native chooser only on tap; cancel without delivery. Verify
  guest and demo deep links cannot access the editor. This planning tool is not
  a recording, DAW, streaming, or release-delivery integration.

- Before marking the exact internal replacement ready, prepare four private
  files: the preserved candidate CSV, the approved component ledger, an
  action inventory reviewed against the actual device build, and the
  acceptance receipts. Run
  `python scripts/check-staar-internal-candidate.py candidates.csv components.json actions.json acceptance.json`.
  Inventory, receipts and ledger must name the same source and build. The
  ten-portal register includes both Love variants and the protected
  DIGGITSTAAR studio. A zero exit only makes the packet eligible for human
  evidence review. Check receipt authenticity and verify that the inventory
  includes every actual on-screen action; never count fixture receipts.

- Optional signed-runner transfer fallback: after specific approval, enable
  temporary remote access on only the intended manual Codemagic run, set
  the private-artwork authorization flag and manual transfer flag for just
  that run, and send the exact approved file to its temporary runner. Keep
  the handoff directory owner-only and copy to an owner-only temporary file
  before atomically renaming to `~/.staar-internal-handoff/studio.jpeg`.
  The workflow waits at most 180 seconds at staging. It still hashes the
  exact file before Xcode starts and verifies the embedded bytes inside the
  signed IPA. Do not use an SSH credential from a previous run, add a public
  storage link, use debug flags as release evidence, or share the private IPA.
  See Codemagic's [temporary runner access guidance](https://docs.codemagic.io/troubleshooting/accessing-builder-machine-via-ssh/).

- Use the manual **signed archive verification only (no upload)** workflow
  for protected-runner QA before any TestFlight distribution. This uses the
  same staging, signing and package verification as the internal upload
  workflow. It has no publishing section and exports only a receipt (source
  SHA, Codemagic run ID, IPA digest, and archive check names). It does not
  export the IPA or private assets. Verify the observed run's source SHA
  against the agreed exact candidate. Do not interpret the receipt as proof
  of TestFlight install, Apple processing, device operation or user consent.
