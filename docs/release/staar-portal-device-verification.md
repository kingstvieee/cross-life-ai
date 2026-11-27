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
- Reconcile 805 historical candidates to a signed-off 804-item roster. Record the reason for
  any supersession and the originating identifiers. Require traceable source, live/device
  receipt where relevant, ownership and outcome for each roster item.
