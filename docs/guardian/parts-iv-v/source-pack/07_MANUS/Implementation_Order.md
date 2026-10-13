# Manus Implementation Order

## Phase 0 — Inspect before changing
- map current Guardian UI and portal architecture
- identify existing action/tool paths
- identify current memory/context path
- mark anything that bypasses the future Trust Kernel
- do not delete working features while refactoring

## Phase 1 — Simulation foundation
1. Trust Kernel interface
2. capability grant data model
3. A0-A4 autonomy controller
4. risk classifier
5. simulated credential vault handles
6. simulated connector sandbox
7. append-only audit events
8. Safe Mode

## Phase 2 — Guardian Permission Centre
Build visual node UI around Guardian with per-connector permission controls and activity history.

## Phase 3 — Simulated connectors
- Files
- Calendar
- One external connector

All external actions remain simulation-only.

## Phase 4 — Attack the system
Run every P0 acceptance test and adversarial case.
Fix policy bypasses before adding features.

## Phase 5 — Controlled real integration
Only after approval and P0 pass:
- production credential vault
- network egress enforcement
- one real low-risk connector
- post-action verification

## Stop conditions
Do not proceed to production actions if:
- direct model-to-tool execution remains possible
- permissions can self-escalate
- Safe Mode can be bypassed
- audit log can be rewritten
- secrets appear in model context



## Part V dependency note
After Part IV P0 is stable in Simulation Mode, continue with `Part_V_Implementation_Order.md`.
Do not use the Loop Engine as a workaround for unfinished Trust Kernel enforcement.
