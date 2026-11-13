# Guardian requirement and evidence matrix

Canonical baseline: main at bc878fd5d9648cfc20418010094d1e3e76fd619c.
The recovered older v2.0 source informs this reconciliation; it does not replace
the newer v2.2 contracts. Private PDF/chat archives remain outside public Git.

| Requirement | Implemented boundary | Evidence and remaining limit |
| --- | --- | --- |
| Completion truth | HTTP clients cannot write completed/verified mission state; workflow rendering requires action/version-bound effect acceptance | Automated contract tests; no live workflow completion claimed |
| Worker authority | Ordinary bearer sessions cannot lease, checkpoint, dispatch, mark sent or reconcile; worker identity is separate and default-denied | HTTP regression tests; no production worker enrollment or SCP deployment claimed |
| Saved grants | Dispatch reads canonical scope, portal, action hash/version and revocation | Fake-provider/store regressions; grant provisioning is not exposed to clients |
| Cancellation | Task stop is distinct from operation cancellation/compensation; late known success never becomes no-effect cancellation | Contract tests; no live cancellation/readback claimed |
| Leases/retry | Expiry and fences checked; live lease cannot be stolen with a larger caller fence; cancelled worker cannot recover/checkpoint | State/store tests only; no continuous worker or 20-minute away proof |
| Cross-portal privacy | Explicit access/share/enabled checks at common retrieval; pause suppresses context; policy rechecked before model dispatch; historical model context is not reused | Tests execute production definitions with fake storage; already-dispatched provider work cannot be recalled |
| Private audio | Per-user opaque links, expiry, rotation and private no-store; missing expiry denied | Production function tests with fake TTS; live device/audio not calibrated |
| Guest access | Explicit local sample portal route; account providers never mount; no guest user/bearer mint; legacy demo sessions denied | App compile/export, source review and backend denial tests |
| Account isolation | Memory, activity and home preferences use account-specific keys; old unscoped values are not silently assigned or deleted | Pure storage-key tests; no guest access to these providers |
| Web Google/Microsoft/email | Hosted code + PKCE exchange; browser-bound single-use state; authenticated userinfo; Secure HttpOnly session; exact-origin CSRF | Fake HTTPS identity-route tests; live provider connections/redirects must still be configured |
| Native sign-in | Fixed callback, app-held PKCE, atomic one-use 60-second grant and SecureStore session; Apple configured separately | Identity-route regression tests and iOS JS export; live provider/device acceptance remains unverified |
| Coordination | Plans are labelled prepared/not executed; fixture routes do not write device state | Production source regressions; live connectors remain unavailable |
| Portal Weave | Canonical grants, typed private contributions, numeric version ordering, same-version conflict withholding, revocation recheck | Bounded deterministic contract; relevance-based minimal arbitration remains incomplete |
| Speech/execution separation | Quiet fences speech without halting execution state; Toronto consent/noon policy | Deterministic tests; voice interruption/resume on device unverified |
| Persona | Recovered 25 dialogue cases are source specifications | No model/persona pass or calibration claim |
| T01–T12 | Some contract components covered by the automated suite | Original end-to-end acceptance tests remain NOT RUN |
| Production SCP | Functional boundaries are in code | Production key management, immutable audit, distributed workers/queue and recovery deployment remain unbuilt |
| Apple/TestFlight | Existing bundle identity retained | EAS owner/project/signing and device build unverified |
| Web deployment | Existing project/repository preserved | Vercel reports account deployment blocked; backend and identity configuration absent from inspected project |

## Validation

The Guardian Release Gates workflow compiles backend modules, runs Guardian and
identity-route tests, checks account storage isolation, runs TypeScript checking,
and exports Expo web with --no-bytecode. Check the latest PR head's workflow result;
earlier counts are not evidence for later commits. The test provider and fake
storage do not establish live OAuth, database durability, or production security.

Provider and release configuration is documented in GUARDIAN_ACCESS_RELEASE.md.
No new provider account, paid subscription, purchase, live device integration or
App Store submission was made. Approved portal images, videos and bundle identity
were preserved.

## Companion and portal continuation

Atlas and Kaia share authorized account/portal-scoped chat history independently of
selected persona. Paused context is neither loaded nor stored; policy changes
withhold previous context. History expires after 30 days and is limited to 12 turns
per request. The chat UI reloads history, respects central speech Quiet, and does
not execute tools or replay actions during persona switching. Device voice
previews are explicitly labelled; studio voice acceptance remains unverified.

The approved nine black/chrome artwork files replace generic portal previews.
Seven existing life-domain IDs remain unchanged. STAARSONIC and STAARVERSE are
preview art only and create no permission, data or execution domains.

Google/Microsoft/Apple/email availability is fetched on both native and web.
Unavailable providers remain disabled with accurate status. First-account setup
requires an Atlas or Kaia choice, supports voice previews, and enters the Hub
only after a confirmed profile save. Existing Guardian profiles are preserved.
