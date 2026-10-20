# Amazon Guardian implementation decision — October 15, 2026

## Recommendation
Use cross-life-ai PR #14 on codex/amazon-2026-submission-ready as the primary Alexa+-style simulated experience. Reuse the existing Amazon Devpost project after identifying its live record. Do not create another project or submit both variants of the same Guardian entry. Production main remains untouched.

A is the stronger judge-facing starting point, not a verified winning or submission-ready product. Both planners are deterministic keyword prototypes. Neither proves live Alexa connectivity, real calendar conflict resolution, persisted agent state, actual message drafts, or external execution.

## Inspected baselines
- A: kingstvieee/cross-life-ai PR #14, 656ad5c8b910e3d5b72caddaafbe726b7567b0c8; open draft, targets amazon-2026.
- B: kingstvieee/staarwardd PR #3, cdadf25709ead77445cf986b568f0c4efa35dd2c; open, not draft, targets main.
- A offers a browser scenario/custom-request UI, JSON API, per-domain plan and optional Strands/Bedrock adapter.
- B offers initialize, tools/list and tools/call JSON-RPC handlers and a staarwardd_plan tool. Plans contain largely fixed text; approvalRequired is always true.
- B's existing self-test passed in this audit. Its inspected SHA also has a successful Amazon Alexa MCP Verify workflow run (35522964247).
- The PR-triggered workflow lookup returned no runs for A's inspected SHA; this does not prove no push-triggered CI exists.

## Supported repairs on A
- Mixed requests previously flagged just one domain, leaving purchases/publications displayed as safe to prepare. Conservatively hold all domains when an external-action keyword is detected. This does not pretend to reliably parse action ownership or negation.
- Load the optional AWS adapter only for Bedrock mode, so ordinary API requests do not need the SDK installed.
- Add a dependency-free local HTTP runner for the existing browser UI and simulation API; it rejects Bedrock mode.
- Add mixed-action, preparation-only and API dependency-isolation regression checks.
- Update setup and visibility guidance.

Validation: simulation smoke plus new regression checks passed; local HTTP runner returned the judge HTML, JS, CSS and a successful judge API response. No AWS call was made. Browser visual inspection and video capture remain pending.

## Eligibility and submission assessment
Official rules inspected at https://amazonappdev2026.devpost.com/rules and FAQ at https://amazonappdev2026.devpost.com/details/faqs.
- Alexa+ permits a simulated experience with no MCP-shaped surface required. A fits this implementation route in principle; organizer acceptance is not guaranteed.
- B's self-test is not a full MCP conformance test. It does not negotiate protocol versions or validate JSON-RPC envelopes, headers, origins, complete argument schemas, body limits or malformed top-level values. Do not claim full Streamable HTTP conformance from its version constant.
- A public, locally runnable repository plus demonstration video can suffice; hosting is not required.
- Public source must include an open-source license; private source must be shared with designated reviewers. Both repositories were public. A's inspected branch root has no license file. Resolve licensing deliberately before submission; do not silently license the entire pre-existing product.
- Public YouTube/Vimeo functioning demo under three minutes, description, tool/product feedback and clear hackathon-period improvements remain required.
- Do not claim AWS Builder from the deterministic demo. A contains actual invocation code but a successful runtime call was not verified; B has no AWS integration in this adapter.
- Toronto residence/age are consistent with the published geographic/age conditions, but disqualifying affiliations/conflicts were not independently checked.
- Deadline: October 23, 2026, 3 PM America/Toronto. AWS promotional-credit requests are closed per October 7 rule update.

## Judging risk
A is more coherent visually than B's protocol-only adapter. Neither yet demonstrates a sophisticated agent workflow: domain selection is keyword matching, summaries repeat the request, and inter-domain exchanges are generated labels rather than service calls. A credible demo must state this scope and show changed output on a fresh request. Do not claim measured time saved, autonomous collaboration, genuine scheduling resolution or user adoption. A materially stronger competitive feature would need real request-specific planning/state with reproducible evidence, within this same project.

## Preserve B
Keep PR #3, its branch, MCP endpoint, test and friction log intact. Reference these as reusable protocol work; do not port the endpoint merely to decorate the simulated path or create a third competing build. Its friction-log conclusions need founder verification before representing personal tool experience.

## Devpost verification blocked
whoami, list_my_projects and list_hackathons each returned internal server errors. No live account identity, registration relationship, project IDs, drafts, video URLs or submitted_at values could be established. The historical PR claim that a draft exists is not current proof. No Devpost write or submission was performed.

Next dependency: inspect the existing signed-in Devpost account via an approved browser fallback, identify the Amazon project and its current state, then update that same record with this branch and accurate claims. Do not close/delete any draft before mapping both implementations. Finish license choice, product feedback, actual demo video and final field verification before submission.
