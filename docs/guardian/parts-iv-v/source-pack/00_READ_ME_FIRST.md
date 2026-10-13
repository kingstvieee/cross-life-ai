# STAARWAARDD Guardian Architecture Update — Parts IV + V
## Manus Implementation Pack
Version: 2026-10-11.2

This package is the implementation handoff for:

- **Part IV — Guardian Trust Kernel + Authority Engine**
- **Part V — Guardian Loop Engine**

## Purpose
Turn Guardian from an AI that can suggest or plan actions into a platform that can safely orchestrate apps, portals, files, services, recurring work, and eventually physical devices without allowing an AI model to grant itself authority.

## Core architectural rule
**No AI model, skill, loop, planner, checker, or connector may directly grant itself permission or bypass the Trust Kernel.**

Models may propose. Loops may coordinate. The Guardian Trust Kernel decides whether an action is permitted, requires approval, is blocked, or must enter Safe Mode.

## Part V operating rule
**The model proposes. The loop coordinates. The Trust Kernel authorizes. The connector executes. The verifier checks. Memory records only what policy allows.**

## Preserve existing STAARWAARDD identity
Do not redesign Guardian, replace the visible avatar, flatten the portal concept into a generic chatbot, or merge unrelated projects into this build.

- Guardian remains a **visible, persistent AI presence**, not a text box.
- STAARWAARDD remains separate from DIGGITSTAAR and the Milo project.
- Existing Guardian visual identity and established portal behavior are not to be silently changed.
- This update is architectural and security-focused.

## First implementation target
Part IV remains first: build **Simulation Mode** and Trust Kernel enforcement before enabling real external actions.

Then implement Part V in Simulation Mode: context, skills, loop planning, isolated lanes, verifier, bounded repair, governed memory writeback, and loop audit state.

## MVP scope
1. Files
2. Calendar
3. One external business/creative connector

Everything else stays mocked until Part IV and Part V P0 tests pass.

## Start here
Manus should first read:
1. `07_MANUS/Paste_This_First.txt`
2. `07_MANUS/Implementation_Order.md`
3. `07_MANUS/Part_V_Implementation_Order.md`
4. `05_ENGINEERING/Definition_of_Done.md`
5. `05_ENGINEERING/Loop_Engine_Acceptance_Tests.md`
6. `06_RESEARCH_AND_FUNDING/Sabrina_Ramonov_AI_Systems_Research.md`
