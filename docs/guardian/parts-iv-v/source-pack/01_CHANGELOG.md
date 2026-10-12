# Changelog — Part IV Architecture Update

## Added
- Guardian Trust Kernel
- Permission Broker
- Autonomy Controller A0-A4
- Risk Engine
- Credential Vault architecture
- Network Egress Firewall
- Secure Action Executor
- Post-action Verification Layer
- Immutable Audit Trail
- Memory Governance Layer
- Emergency Safe Mode
- Connector Sandbox
- Guardian Permission Centre UI
- Simulation Mode
- Threat model and security test plan
- P0/P1/P2 engineering backlog
- Investor-facing defensibility notes

## Changed
- Guardian no longer treats model/tool access as equivalent to permission.
- External actions must pass deterministic policy checks.
- Credentials must never enter model context.
- High-risk actions require explicit approval.
- Memory is governed by source, confidence, sensitivity, permission and retention.

## Deferred
- Custom hardware
- Physical robotics/device control beyond simulated interfaces
- Broad third-party connector marketplace
- Financial execution
- Home security control
- Autonomous purchases



# Changelog — Part V Loop Engine Addition
## Added 2026-10-11.2
- Sabrina Ramonov AI systems research synthesis
- Guardian Loop Engine architecture
- Context Builder
- Skill Registry
- Loop Planner
- isolated Execution Lanes
- Trust Kernel-gated Connector Broker
- Independent Verifier
- bounded Repair Loop
- governed Memory Writeback
- loop run/lane audit model
- Part V Mermaid architecture diagram
- Part V P0/P1/P2 acceptance tests
- Part V Manus implementation order

## Security constraints reinforced
- Skills never grant permissions.
- Loops never raise autonomy.
- Verification cannot be skipped for tasks that require it.
- Retries are bounded.
- Memory writeback remains governed.
- Parallel lanes are isolated.
- Part V may not bypass unfinished Part IV requirements.
