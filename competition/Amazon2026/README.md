# STAARWAARDD Guardian · Amazon 2026 competition lane

## What this entry demonstrates

This is an **Alexa+-style simulated experience** under the contest's alternate Alexa+ path. The web UI at `/amazon-judge.html` calls `POST /api/amazon-guardian` with `mode: "judge"` or `mode: "plan"`. It builds a deterministic preview of relevant life domains and holds external actions behind an approval state. It does **not** connect to an Alexa device or implement MCP Streamable HTTP. Its metrics describe the simulated request, not observed customer outcomes.

An optional separate `mode: "bedrock"` route invokes `@strands-agents/sdk` with an Amazon Bedrock model. Only a successful response with `verifiedExecution: true` demonstrates that AWS was actually called. The ordinary judge and plan modes do not use AWS and must not be presented as proof of AWS Builder eligibility. Run the Bedrock route with configured AWS credentials and record its successful output before claiming that mini challenge.

## Source and setup

- `src/guardian-core.mjs`: deterministic planning, domain selection, approval gate, and sample scenario.
- `src/aws-strands-adapter.mjs`: Strands agent and Bedrock invocation.
- `../../api/amazon-guardian.mjs`: Vercel API handler.
- `../../frontend/public/amazon-judge.{html,js,css}`: browser demo.

Use Node.js 22 or newer. In this directory, run `npm install` and `npm run smoke`. From the repository root, configure the Vercel project with `vercel.json`; its build exports the Expo web app and public judge files. The API's default `GET` response describes the available modes. To verify AWS, provide valid Bedrock credentials and model access through the normal AWS provider chain, then send:

```sh
curl -sS -X POST https://YOUR-PREVIEW.example/api/amazon-guardian \
  -H 'content-type: application/json' \
  -d '{"mode":"bedrock","input":"Guardian, prepare my meeting and hold external sends for approval"}'
```

The expected success response includes `mode: "bedrock"` and `verifiedExecution: true`. A 502 with `verifiedExecution: false` means the AWS integration has **not** been verified; do not substitute the deterministic judge response. Never put credentials in the repository, browser UI, demo video, or Devpost description.

## Judge run

Open `/amazon-judge.html`, press **Run judge scenario**, then try a custom request mentioning an email or purchase. Show the resulting approval state and the fact that no message or purchase occurs. The simulated API response is immediate. There is no live integration with a personal calendar, email, store, or home device.

For a Devpost submission, capture an actual screen recording under three minutes, publicly host it on YouTube or Vimeo, give judges repository access, and include the link and testing instructions. Explain the features added during the hackathon period. The current repository's private status means the named Devpost and Amazon reviewers must receive access before submitting; see the contest rules for their current GitHub usernames. Do not submit this README as evidence that the video, reviewer access, or AWS verification already exists.
