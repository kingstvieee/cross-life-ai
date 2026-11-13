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
| Native sign-in | Explicitly disabled until native callback/exchange is built and validated | No native OAuth claim |
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
