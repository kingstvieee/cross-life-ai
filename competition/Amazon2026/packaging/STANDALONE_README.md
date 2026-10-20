# STAARWAARDD Guardian — Amazon 2026 demonstration source

This is the isolated source package of the existing cross-life-ai PR #14
Alexa+-style simulation, not a new competition entry. It contains only the
planner, browser page, API, local runner, regression checks and optional AWS
adapter. The broader STAARWAARDD application, startup films, brand artwork,
production backend, account data and original repository history are excluded.

## Run without credentials or installation

Use Node.js 22 or newer. From this repository root:

```sh
node competition/Amazon2026/src/aws-smoke.mjs
node competition/Amazon2026/judge-server.mjs
```

Open http://127.0.0.1:3335/amazon-judge.html. Press **Run judge scenario**.
Then enter **Prepare my meeting notes** and press **Run Guardian**: this
preparation-only request needs no approval. Change the request to **Email my
family and buy my outfit**: all planned domains are held for approval. No
email, purchase or device operation occurs. The local runner blocks AWS mode.
The original-prototype link on this preserved page returns to the same judge
page in this isolated package; the proprietary prototype is not distributed.

Judges can run this free of charge without accounts, keys or access to the
broader application. Keep this repository accessible through the end of judging.
Local HTTP is for evaluation; hosted deployment uses HTTPS.

## Accurate scope

This is a deterministic keyword planner with an HTTPS JSON API handler, not a
live Alexa integration or an MCP server. It has no real calendar, email,
shopping or home-device connectors. Exchanges and counters illustrate the
scenario; they are not independent agents, measured time savings or adoption.
The approval state is a simulation, not an execution service.

The separate optional Strands/Bedrock adapter is included as source only.
Ordinary simulation modes never invoke AWS. AWS Builder must not be claimed
without a separately verified successful real invocation. The default judge
path requires no dependencies; installing the optional dependencies alone does
not verify AWS. The original Vercel/Expo deployment configuration is intentionally
excluded because it builds the broader application.

## Source and licensing boundary

The root MIT LICENSE applies to the software and documentation in this isolated
repository. It does not license other files or history in kingstvieee/cross-life-ai,
the broader STAARWAARDD product, or excluded films/artwork. No trademark license
is granted. Optional third-party dependencies retain their own licenses and are
not bundled in this package.

Origin: kingstvieee/cross-life-ai PR #14, commit
0ac39edc87717ec0f5af7df88d27fb55fb74e3f8. The nine demo source files are copied
unchanged from that commit. Packaging does not change the video production.

## Submission status

This source package does not establish that a Devpost entry is submitted.
Update the existing Amazon entry with this repository's actual published URL,
these testing instructions and the existing functioning demo video after it is
publicly available on YouTube or Vimeo. Do not create a duplicate entry.
The video should be under three minutes and match the demonstrated build.
Product feedback, track selections, hackathon-period improvements and the actual
Devpost submission status still require final verification.
