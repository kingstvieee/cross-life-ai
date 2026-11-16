# STAARWAARDD — Build 200: geometry-based mobile path review

**Owner-approved baseline:** Build 199's exact ten world source GLBs and corresponding mobile variants are the approved *development* candidates. Source hashes were not changed during this review.

## Verified private technical QA
An offline Python analyzer parsed **all ten actual Build 199 source GLB files**, collected geometry instance bounding boxes using their world transforms, excluded decorative and below-foot/above-head geometry by explicit rules, and rasterized conservative XY obstacle proxies. A four-neighbor breadth-first search checked an illustrative arrival point (0, −10 m) to a rear-of-stage point (0, +10 m) on a 0.5 m grid with ~0.35 m player clearance.

- **4/10 connected under this proxy:** Creativity (38 m), Events Village (37 m), Relationships Singles (39.5 m), STARVERSE (30.5 m).
- **6/10 conservative proxy blocked:** Home, Relationships Realm, STAARSONIC Studio, Style Closet, Wellbeing, Work. Choke-object candidates and heatmaps are recorded for review.
- **0/10 certified iPhone navigation**, **0/10 real physics/collision tests**. There is no claim that the proxy endpoints represent the in-app entry or exit portals. An axis-aligned box can overblock curved/translucent/irrelevant shapes or miss detailed collisions.

## Private supporting files
The ChatGPT conversation artifact `STAARWAARDD_Build200_Navigation_QA_Package.zip` contains:
- 10 labelled actual-geometry top-down grid maps (green marker arrival, orange target, cyan test route, slate blocked proxy)
- Source and model SHA-256 anchored JSON results
- Aggregate two-row contact sheet
- Independent rerunnable `nav_proxy200.py` command line script
- Human-readable `BUILD200_NAVIGATION_REVIEW.md` with per-world findings

No private GLB or source facial photo is committed to the public GitHub repo. Their exact fingerprints are linked by `frontend/scene-src/build200-navigation-qa-register.json` to the founder-approved Build 199 asset register.

## Remediation gate
1. Confirm each real runtime portal entry, path and destination. Don't silently assume a back-wall exit.
2. Mark collisions on actual game/portal engine meshes and identify which flagged features are decorative (non-collidable) vs structural. Repair paths as new **review versions** only; do not alter approved Build 199 models in place.
3. Re-run real navmesh/pathfinding for all worlds, walk through on actual iPhone, measure FPS >=30 where feasible, memory, scene-load time, portal triggers and accessibility.
4. Independently inspect final Guardian face likeness with actual multi-angle capture and phoneme-aligned approved voice, 16-viseme deformation and device render.
5. Keep the original actor 3D/source protection, rights receipts, Build 187 independent evidence gate, and founder authorization before signed iOS/TestFlight.

**Release decision: CONDITIONAL / NO-GO.** Build 200 identifies specific navigation candidates; it does not pass the final cinematic model or mobile-device checks.

**Additional cash cost: CAD $0.**
