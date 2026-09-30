# STAARWAARDD Funding & Differentiation Dossier
Updated: 2026-09-30 — Toronto, Ontario, Canada

## 1. Executive positioning
STAARWAARDD is a Canadian whole-life AI coordination environment built around one persistent Guardian, seven bounded life domains, one provenance-aware context system, and a permissioned action control plane.

The product is deliberately **not** positioned as another chatbot, generic personal assistant, or always-on cloud agent. The differentiation is coordination: multiple domains can contribute context to one plan without surrendering user control, sensitive context remains scoped, consequential actions require the appropriate approval, and every executed action can produce an evidence receipt showing what changed, why, when, through which tool, and how it can be reversed where possible.

**Core sentence:** One Guardian. Seven life domains. Permissioned action. One context system.

## 2. The problem
People already use separate systems for work, home, wellbeing, relationships, community, creativity and style. Each system sees only its own fragment. New persistent agents can remain active and operate connected software, but persistence alone does not solve:
- cross-domain conflicts;
- sensitive-context boundaries;
- provenance of remembered facts;
- risk-based approval;
- action rollback and auditability;
- physical/ambient state;
- a consistent human-readable control surface across domains.

STAARWAARDD is designed around those gaps.

## 3. Differentiation beyond persistent agents
Industry benchmark products now demonstrate persistent cloud agents with connected apps, memory and long-running work. STAARWAARDD's product direction is intentionally broader and more structured:

### A. Cross-Life Context Graph
Every durable fact should carry domain, source, timestamp, confidence, sensitivity and user control. The system retrieves only the relevant slices rather than replaying an entire personal history into every model call.

### B. Guardian Control Plane
Guardian is separated from the generative model. It applies policy, risk, permission and approval rules that individual models or automations are not allowed to override.

### C. Seven bounded domain engines
Creativity, Work, Home, Wellbeing, Relationships, Community and Style provide domain-specific reasoning and tools. They are coordinated through Guardian rather than behaving as seven disconnected chatbots.

### D. Cross-domain Action Graph
Guardian can model dependencies across domains before acting. Example: a work deadline, poor sleep, a dinner commitment and a longer commute can produce a coordinated proposal rather than four unrelated notifications.

### E. Observe -> Understand -> Recommend -> Approve -> Execute -> Verify -> Log -> Learn
Human approval is treated as a trust capability. Risk tiers distinguish read-only, draft, reversible and consequential actions.

### F. Evidence receipts
Consequential actions produce a receipt: source request, context used, tool called, user approval, change made, result, timestamp and undo path when available.

### G. Ambient Context Fabric
Phone, watch, home, NFC, sensors and device state can eventually feed the same context engine through normalized capabilities rather than vendor-specific logic.

### H. Persistent Project State
The same infrastructure can track projects, blockers, completion evidence, assets, approvals and next actions across STAARWAARDD and its operating portfolio.

### I. Canadian data-residency path
The architecture should support Canadian-hosted storage/compute pathways for sensitive Guardian, Home and Wellbeing context as infrastructure matures.

## 4. Verified current foundation
The existing product foundation already includes:
- seven portal surfaces;
- authentication;
- persistence/server integration;
- approval structures;
- memory/audit structures;
- entitlement logic;
- device-pairing simulation and protocol work;
- Guardian Core persistence/authentication/server integration;
- a published product build and canonical source repository.

Important boundaries:
- the Astra evaluator was previously audited as not activated;
- physical BLE/device behaviour remains gated behind real-device testing;
- current deployed backend reachability must be verified independently of the Expo web frontend;
- cinematic work and visual proof are not substitutes for technical verification.

## 5. Target technical architecture
USER + DEVICES
-> Intent / Event Router
-> Context Graph
-> Domain Specialists / Portal Mesh
-> Guardian Policy + Risk Control Plane
-> Task / Action Graph
-> Approval State Machine
-> External Tools + Device Adapters
-> Verification
-> Audit Receipt
-> Learning / updated state

### Memory model
Use a relational source of truth plus retrieval index. Store domain, source, timestamp, sensitivity, confidence and user controls with durable context.

### Integration model
Normalize capabilities, not brands. A light is represented as dimmable/colour-capable, not as a "Google light"; a lock is secure/unsecure, not an "Apple lock." This keeps the coordination layer portable as vendors change.

## 6. Trust, privacy and safety
The funding story is not "give an AI unlimited access to your life." It is controlled delegation.

Design requirements:
- scoped portal permissions;
- least-context retrieval;
- approval rules by action risk;
- user-visible provenance;
- reversible actions where possible;
- separate sensitive-context handling;
- data-retention controls;
- incident and access logging;
- explicit device/connector authorization;
- Canadian data-residency option as the product matures.

## 7. Commercialization
Monetization sequence:
1. DIGGITSTAAR productized AI/creative services — near-term cash and case studies.
2. STAARWAARDD Guardian/Hub paid tiers — context depth, integrations, actions and premium reasoning.
3. Specialist capability packs — Kaia/Atlas as useful bundles, not decorative characters.
4. Physical STAAR Hub / device interfaces — after software retention validates demand.
5. B2B / white-label — employer, hospitality, residential and operator workflows after the consumer coordination layer is stable.

Existing pricing hypotheses, all CAD and not yet locked:
- Free Hub: C$0
- Guardian Plus: C$14.99/month
- Guardian Pro: C$29.99/month
- Household: C$39.99/month
- Specialist add-on: C$7–15/month
- B2B pilot: C$99–249/month

## 8. Technical work packages suitable for funding
### Work Package A — Guardian Context + Action Engine
Goal: productionize provenance-aware cross-domain context, task graphs, risk tiers, approvals, execution receipts and evaluation.
Outputs: context schema, risk engine, approval state machine, tool gateway, trace/eval suite, user-facing Why-this? receipt.

### Work Package B — AI Creative Continuity + QA
Goal: build an automated QA pipeline for long-form generative media and brand continuity.
Outputs: character/brand bibles, shot manifest, first/last-frame continuity contracts, automated identity/wardrobe/prop/motion checks, replacement-render loop, master QA.
Commercial link: DIGGITSTAAR production services and STAARWAARDD creative workflows.

### Work Package C — Ambient Hub + Device Context
Goal: normalize home/device capabilities, identity, room state, NFC/sensor events and permissioned actions.
Outputs: device capability schema, event model, Home Portal state view, Home Assistant/Matter adapter path, local-fallback rules, real-device pilot.

## 9. Canadian commercialization case
Funding narrative:
- Canadian-owned software, creative and fashion IP;
- Toronto-based product development;
- Canadian AI talent placements;
- paid work for Canadian engineers, designers, editors, suppliers and research partners as funding permits;
- exportable digital services and software;
- Canadian data-residency pathway;
- commercialization of provenance, permission and coordination infrastructure;
- potential local prototyping and fashion supplier spend through RISING STAARDFORM.

Separate current evidence from forecast impact in every application.

## 10. Funding stack — current as of 2026-09-30
### A. Mitacs AI Advantage — priority talent path
Canada announced up to C$162 million over five years beginning in 2026–27 to support 10,000 AI-related work placements through Mitacs AI Advantage.
Streams:
- ADOPT: AI adoption projects linking businesses with academic researchers/talent.
- AI+X: AI innovation and new-technology work across disciplines.
Action: engage a Mitacs advisor and map Work Packages A/B/C to an academic partner and eligible talent profile.

Official source:
https://www.canada.ca/en/innovation-science-economic-development/news/2026/09/government-of-canada-invests-in-10000-ai-related-work-placements-for-young-canadians.html

### B. Mitacs Accelerate — actionable current structure
Accelerate is open to eligible for-profit and not-for-profit partners and supports research collaborations starting at four months.
Standard model: partner contribution starts at C$7,500 per internship unit, producing a C$15,000 research award; minimum C$10,000 goes to the intern stipend/salary.
Action: prepare a one-intern Guardian Context & Action Engine proposal as the first concrete academic collaboration.

Official source:
https://www.mitacs.ca/our-programs/accelerate/

### C. NRC IRAP AI Assist — priority R&D path
NRC IRAP's 2026–27 plan says AI Assist continues, including contributions to firms developing/adapting generative AI and deep-learning solutions. NRC says AI Assist supports research, product development, testing and validation and helps SMEs build, deploy and integrate AI into core products/services.
Action: contact NRC IRAP, determine SME eligibility, request advisor intake, present Work Package A as the primary product R&D project and Work Package B as a secondary commercialization-enabling technical system.

Official sources:
https://nrc.canada.ca/en/corporate/planning-reporting/national-research-council-canadas-2026-27-departmental-plan
https://nrc.canada.ca/en/support-technology-innovation/nrc-irap-support-smes-innovating-artificial-intelligence

### D. FedDev Ontario Business Scale-Up and Productivity — scale-stage path
FedDev Ontario lists Business Scale-Up and Productivity as continuous intake for southern Ontario and describes it as support for high-growth businesses scaling innovative goods, services or technologies. For-profit business contributions are generally repayable.
Action: treat as a later-stage commercialization/scale target once corporate status, revenue/traction, financial statements, project costs and commercialization evidence are stronger.

Official source:
https://feddev-ontario.canada.ca/en/transparency/briefing-documents/feddev-ontario-101-march-2026

### E. SR&ED — tax recovery path
CRA says eligible SR&ED work must pursue scientific/technological advancement through systematic investigation/experiment. Experimental development and directly supporting programming/testing can qualify; routine commercial work, marketing, style changes and routine testing do not.
Basic ITC rate is 15%; some corporations may qualify for an enhanced 35% rate. Other government R&D assistance can reduce the eligible ITC amount.
Action: maintain engineering experiment logs, uncertainty/hypothesis records, test results, time/cost records and a clear separation between technical experimentation and ordinary product work.

Official sources:
https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html
https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-eligibility.html

### F. AI Compute Access Fund — watchlist, not current intake
The program remains part of Canada's sovereign compute strategy, but the previously announced call closed July 31, 2025. In May 2026, Canada announced C$66 million for 44 selected projects. Do not present this as an open application.
Action: maintain a compute budget and technical feasibility package so STAARWAARDD can move quickly if a successor intake opens.

Official source:
https://www.canada.ca/en/innovation-science-economic-development/news/2026/05/government-of-canada-supports-44-canadian-companies-using-ai-to-transform-industries-and-create-jobs.html

## 11. Funding sequence
### Immediate — 0 to 30 days
1. Verify legal applicant status before submitting any program application.
2. Build one-page technical abstracts for Work Packages A/B/C.
3. Contact Mitacs advisor.
4. Contact NRC IRAP and request eligibility/advisor intake.
5. Establish a grant evidence folder with current product screenshots, repository evidence, roadmap, founder bio, budget and Canadian-impact narrative.
6. Start engineering experiment log for future SR&ED support.
7. Track FedDev BSUP as scale-stage, not immediate cash.

### 31 to 90 days
- submit first eligible Mitacs project;
- complete NRC IRAP discovery/advisor process;
- produce measurable Guardian prototype benchmarks;
- document first paid DIGGITSTAAR proof/case study;
- quantify compute and model-cost profile;
- formalize data-residency and privacy architecture;
- build customer/partner letters of interest.

### 3 to 12 months
- use technical evidence and early revenue to pursue larger commercialization funding;
- run a small Guardian Plus pilot;
- add device/Home pilot only after software/action loop is stable;
- preserve monthly evidence snapshots for funders and tax programs.

## 12. Funding-ready metrics
Track:
- Guardian task success rate;
- percentage of actions requiring approval;
- action reversal/exception rate;
- latency and cost per coordinated workflow;
- context-retrieval precision;
- tool-call success/failure;
- number of domains used per successful workflow;
- user retention and weekly active use;
- paid conversion;
- DIGGITSTAAR revenue/case-study count;
- Canadian R&D/talent spend;
- external compute/API spend;
- Canadian suppliers/partners engaged.

## 13. Evidence pack
Required before applications:
- legal incorporation/registration proof;
- legal applicant name and jurisdiction;
- corporation/business number as applicable;
- founder bio/CV;
- ownership/cap table if required;
- current architecture diagram;
- screenshots/demo links;
- GitHub/deployment evidence;
- project roadmap and milestone ledger;
- technical work-package abstracts;
- budget and vendor quotes;
- financial statements/projections appropriate to stage;
- customer discovery / letters of interest;
- IP ownership/assignment records;
- privacy/security/data-residency architecture;
- Canadian economic-impact narrative;
- prior contest/media evidence;
- partner/supplier evidence.

## 14. Legal status gate — do not fake this
The existing incorporation manual describes **STAARWAARDD Inc. as the proposed legal name subject to approval** and explicitly warns other workstreams not to pretend incorporation is complete. No issued Certificate of Incorporation was found in the retrieved business workspace search used for this dossier.

Therefore, until an issued certificate is verified:
- use STAARWAARDD as the brand/product name;
- mark legal applicant identity as **TO VERIFY BEFORE SUBMISSION**;
- do not place an invented corporation number, BN, legal date or registered-office claim into a funding application.

This is the single administrative gap that must be resolved before a formal government submission under a corporation identity.

## 15. Paste-ready funding narrative
STAARWAARDD is developing a Canadian whole-life AI coordination environment designed to help people manage complex, cross-domain decisions without surrendering control to a single opaque autonomous agent. The system coordinates seven bounded life domains through one Guardian control plane, a provenance-aware context graph and a permissioned action loop. Rather than treating persistence or tool access as sufficient, STAARWAARDD is focused on the technical problems of context provenance, cross-domain dependency resolution, risk-based approvals, action verification, rollback, auditability and eventual integration with ambient devices and Canadian-hosted infrastructure. Funding would support applied R&D, testing and commercialization of the Guardian Context & Action Engine, evaluation infrastructure, secure tool integration and Canadian talent development. The resulting technology is intended to support a consumer coordination platform while also creating reusable infrastructure for Canadian creative-services, commerce and future B2B deployments.

## 16. One-sentence differentiator
**STAARWAARDD is not just an agent that stays on; it is a permissioned coordination layer that understands which part of your life is involved, what context may be used, what conflicts must be resolved, what requires your approval, what changed after an action, and how the whole system remains accountable.**
