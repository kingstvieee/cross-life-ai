# Simulation Mode

Simulation Mode is the first build target.

## Behavior
Guardian may:
- interpret requests
- create action plans
- run permission checks
- calculate risk
- display approvals
- simulate connector execution
- generate audit records marked `SIMULATED`

Guardian may NOT:
- send messages
- publish content
- modify external accounts
- transfer funds
- control real devices
- expose secrets

## Purpose
- safe product demos
- investor demos
- UI testing
- policy testing
- audit-system validation
- engineering before real integrations
