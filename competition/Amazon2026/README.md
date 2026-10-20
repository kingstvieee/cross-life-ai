# STAARWAARDD Guardian · Amazon 2026 competition lane

## What this entry demonstrates

This is an **Alexa+-style simulated experience** under the contest's alternate Alexa+ path. The web UI at `/amazon-judge.html` calls `POST /api/amazon-guardian` with `mode: "judge"` or `mode: "plan"`. It builds a deterministic preview of relevant life domains and holds external actions behind an approval state. It does **not** connect to an Alexa device or implement MCP Streamable HTTP. Its metrics describe the simulated request, not observed customer outcomes.

An optional separate `mode: "bedrock"` route invokes `@strands-agents/sdk` with an Amazon Bedrock model. Only a successful response with `verifiedExecution: true` demonstrates that AWS was actually called. The ordinary judge and plan modes do not use AWS and must not be presented as proof of AWS Builder eligibility. Run the Bedrock route with configured AWS credentials and record its successful output before claiming that mini challenge.

## Current judge source — verified October 19, 2026

Use the existing isolated public repository:
https://github.com/kingstvieee/staarwaardd-guardian-amazon-demo

Its default branch has a detected root MIT license scoped to that demo repository.
A fresh anonymous clone at 477c01c passed `npm ci --ignore-scripts`, `npm test`
and `npm run build`. The current demo consolidates the original PR #14 planner
with the `staarwardd_plan` MCP tool from staarwardd PR #3. Hosted browser checks
verified initialize, notification acceptance, tools/list and tools/call at
https://staarwaardd-guardian-amazon-demo.vercel.app/ . No Alexa device connection,
AI-model invocation or AWS runtime use is established by those checks.

The existing Devpost project is 1191047, STAARWAARDD Guardian for Alexa+.
It references that isolated repository and remains DRAFT (3/5 steps done),
with no video URL supplied. Judge testing instructions and stale MCP descriptions
were corrected in that same draft. Do not create another repository or entry.
The user explicitly instructed that no competition entry be submitted yet.
Preserve the existing editorial demo, audio tour and video production.

This PR remains the historical simulation implementation; its setup and scope
below describe this branch, not all subsequent changes in the canonical demo repo.
Do not add a repository-wide license to cross-life-ai. Public visibility of this
original repository is unchanged; proprietary ownership and visibility are distinct.

## Source and setup

- `src/guardian-core.mjs`: deterministic planning, domain selection, approval gate, and sample scenario.
- `src/aws-strands-adapter.mjs`: Strands agent and Bedrock invocation.
- `../../api/amazon-guardian.mjs`: Vercel API handler.
- `../../frontend/public/amazon-judge.{html,js,css}`: browser demo.

Use Node.js 22 or newer. From the repository root, run `node competition/Amazon2026/src/aws-smoke.mjs`, then `node competition/Amazon2026/judge-server.mjs`. Open `http://127.0.0.1:3335/amazon-judge.html`. These simulation commands require no npm install, AWS account, or Expo build. The local runner rejects Bedrock mode so the judge demo cannot incur AWS charges. Optional AWS mode requires a separate dependency install (`npm install` in this directory) and configured AWS access. From the repository root, configure the Vercel project with `vercel.json`; its build exports the Expo web app and public judge files. The API's default `GET` response describes the available modes. To verify AWS, provide valid Bedrock credentials and model access through the normal AWS provider chain, then send:

```sh
curl -sS -X POST https://YOUR-PREVIEW.example/api/amazon-guardian \
  -H 'content-type: application/json' \
  -d '{"mode":"bedrock","input":"Guardian, prepare my meeting and hold external sends for approval"}'
```

The expected success response includes `mode: "bedrock"` and `verifiedExecution: true`. A 502 with `verifiedExecution: false` means the AWS integration has **not** been verified; do not substitute the deterministic judge response. Never put credentials in the repository, browser UI, demo video, or Devpost description.

## Judge run

Open `/amazon-judge.html`, press **Run judge scenario**, then try a custom request mentioning an email or purchase. Show the resulting approval state and the fact that no message or purchase occurs. The simulated API response is immediate. There is no live integration with a personal calendar, email, store, or home device.

For a Devpost submission, capture an actual screen recording under three minutes, publicly host it on YouTube or Vimeo, give judges repository access, and include the link and testing instructions. Explain the features added during the hackathon period. The repository was public when inspected on October 15, 2026. Verify a detectable open-source license before using the public-repository submission route; otherwise arrange the private-repository reviewer access required by the rules. Do not submit this README as evidence that the video, reviewer access, or AWS verification already exists.

## Approval scope

This keyword-based simulation conservatively marks all domains in a request for approval whenever an external-action keyword is detected. It does not determine exactly which domain owns each action, interpret negation reliably, execute approvals, maintain session state, or resolve real calendar conflicts. The displayed inter-domain exchanges and impact counters illustrate the scenario; they are not independent agents or observed customer results.
