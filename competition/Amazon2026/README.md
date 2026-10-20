# STAARWAARDD Guardian · Amazon 2026 competition lane

## What this entry demonstrates

This is an **Alexa+-style simulated experience** under the contest's alternate Alexa+ path. The web UI at `/amazon-judge.html` calls `POST /api/amazon-guardian` with `mode: "judge"` or `mode: "plan"`. It builds a deterministic preview of relevant life domains and holds external actions behind an approval state. It does **not** connect to an Alexa device or implement MCP Streamable HTTP. Its metrics describe the simulated request, not observed customer outcomes.

An optional separate `mode: "bedrock"` route invokes `@strands-agents/sdk` with an Amazon Bedrock model. Only a successful response with `verifiedExecution: true` demonstrates that AWS was actually called. The ordinary judge and plan modes do not use AWS and must not be presented as proof of AWS Builder eligibility. Run the Bedrock route with configured AWS credentials and record its successful output before claiming that mini challenge.

## Source and setup

### Isolated public-source packaging

Do not add a repository-wide open-source license to the broader product.
Export only this existing demo using the explicit allowlist:

```sh
node competition/Amazon2026/packaging/export-demo.mjs /absolute/new/path/amazon-guardian-demo
```

The destination must not exist and must be outside this repository. The export
contains nine unchanged demo source files, standalone setup instructions, a root
MIT license and a credential/dependency ignore file. It contains no Git history,
Expo application, production backend or film assets. The license is granted to
the exported demo software and packaging documentation only; it does not extend
to the broader product or other repository contents.

Publish the export as the default branch of a separate demo-only repository,
without copying this repository's history. Verify GitHub detects the root MIT
license and that an anonymous fresh clone runs the smoke check and local server.
Then update the **existing** Devpost entry with that actual repository URL.
This packaging change alone does not satisfy the public-source route for the
current mixed repository, whose default-branch license remains unresolved.

Private source remains an allowed alternative, but share only an isolated
demo repository with the administrator and designated Amazon reviewers; do not
grant access to the broader product merely to avoid public licensing.

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
