# Devpost submission draft · STAARWAARDD Guardian

**Primary track:** Alexa+ simulated experience (web alternate path). **Mini challenge:** AWS Builder only after a successful Strands/Bedrock runtime test is captured. Do not select Bee, Ring, Fire TV, Open Source, or AWS Builder without corresponding proof.

## Project description

STAARWAARDD Guardian explores how one request could coordinate a busy day across Work, Creativity, Home, Wellbeing, Relationships, Community, and Style. In this competition demo, a judge can run an Alexa+-style request in a web interface. The Guardian preview identifies relevant domains, produces a visible preparation plan, and holds messages and other external actions for approval. The app does not send mail, alter a home device, or connect to a real Alexa account.

The built-in scenario starts with an investor meeting running late, a launch, fitting, anniversary dinner, gift delivery, wellbeing reset, and home arrival. A new message draft is held for approval. The judge can enter a different request and inspect the domains and approval state. The result is a simulation of an agentic workflow; it is not evidence of measured customer adoption or time saved.

The separate Bedrock route uses Strands Agents SDK and a Bedrock model. It should be described as an AWS integration only if a real invocation returns `verifiedExecution: true` in the deployed environment. A deterministic judge response does not verify Bedrock.

## What changed in the hackathon window

The competition branch adds a separate judge page, an API for judge and custom requests, a permission-aware planner, an optional Strands/Bedrock route, and submission documentation. Cite commit dates and show the code diff from the pre-hackathon baseline when completing the form. Do not imply the older seven-world concept was created during this contest.

## Product feedback · draft requiring founder confirmation

- **Tools used:** Node.js for the judge API; Expo web for the broader app; Strands Agents SDK and Amazon Bedrock in the optional AWS route. Claim actual Bedrock use only after a successful runtime test.
- **Worked well:** The simulated path can run without credentials and can expose approval decisions visibly. The local smoke check passed.
- **Needs work:** On this workspace, a full Expo dependency installation could not finish because the required Yarn package was unavailable in the local cache and registry retrieval stalled. This is local build friction, not evidence of an Amazon tool defect. A deployed Bedrock call and end-to-end credential handling still require verification.
- **Onboarding:** Describe your actual Strands/Bedrock setup after testing; no firsthand conclusion is available yet.
- **Build with it again?:** Give your own answer after using the AWS route successfully.

## Demo video shot list (target 2:15–2:40)

1. **0:00–0:20:** Show the real browser URL and describe the late investor review problem. State clearly that this is an Alexa+-style simulation.
2. **0:20–0:55:** Click **Run judge scenario**. Show the prepared portal list and the Relationships action marked **APPROVAL REQUIRED**.
3. **0:55–1:30:** Enter a fresh custom request in the textarea; run it and show the result changing. Point out that no external action occurs.
4. **1:30–2:05:** Show the repository planner and API source. If AWS Builder is claimed, show a real successful Bedrock invocation and the matching response. Otherwise omit the AWS proof claim.
5. **2:05–2:35:** End with the improvement made during the hackathon and a clear next step for a real user trial. Do not present simulated counters as measured impact.

Record the actual functioning screen. Publish the video publicly on YouTube or Vimeo and paste its URL into Devpost. Ensure the judge can access the repository and app through the end of judging. The contest requires a code repository with setup instructions and an under-three-minute public demo video; this draft is **not a submitted entry**.

## Required links to fill

- Live judge page: `https://<stable-judge-accessible-host>/amazon-judge.html`
- GitHub source: `https://github.com/kingstvieee/cross-life-ai/tree/amazon-2026/competition/Amazon2026` (confirm the final submitted ref contains the approved fixes)
- Public YouTube/Vimeo demo: **PENDING**
- Devpost entry URL and Submitted status: **PENDING**
- Reviewer repository access or public licensed source: **PENDING**
- Optional Bedrock success record: **PENDING**
