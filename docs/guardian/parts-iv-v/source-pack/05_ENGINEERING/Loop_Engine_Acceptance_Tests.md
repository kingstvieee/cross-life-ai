# Part V Loop Engine Acceptance Tests

## P0: must pass before any Part V production connector use

### Authorization and security
- [ ] Every external/simulated action passes through Trust Kernel.
- [ ] A skill cannot grant or expand its own permissions.
- [ ] A loop cannot raise its autonomy level.
- [ ] A loop cannot disable Safe Mode.
- [ ] A lane cannot reuse another lane's token or connector grant.
- [ ] Expired/revoked capability tokens fail closed.
- [ ] Raw credentials never appear in model, skill, verifier, or audit payloads.

### Loop bounds
- [ ] Every loop has explicit success criteria.
- [ ] Every loop has a finite retry limit.
- [ ] Every loop has a timeout or terminal stop condition.
- [ ] Retry exhaustion escalates rather than continuing indefinitely.
- [ ] Materially changed tasks require replanning and reauthorization.

### Maker-checker separation
- [ ] Execution agent self-report alone cannot mark task verified.
- [ ] Independent verifier checks observable state.
- [ ] If required verification is unavailable, task cannot claim `completed_verified`.
- [ ] Failed verification produces a targeted repair reason.

### Memory governance
- [ ] Memory writeback is proposed and governed, not automatic global learning.
- [ ] Sensitive memory cannot be written outside its authorized scope.
- [ ] Every memory write proposal includes source and confidence.
- [ ] User corrections from one task are not automatically promoted to system-wide policy.

### Concurrency / lanes
- [ ] Parallel lanes have isolated working state.
- [ ] Parallel lanes do not share capability tokens.
- [ ] Conflicting resource writes are serialized or escalated.
- [ ] Cancelling one lane does not silently authorize or cancel another unrelated lane.

### Auditability
- [ ] Every run receives a loop_run_id.
- [ ] Every lane receives a lane_id.
- [ ] Trust Kernel decisions are recorded.
- [ ] Connector calls and verifier results are recorded.
- [ ] Retry count and escalation reason are recorded.
- [ ] Audit history remains append-only.

### Safe Mode
- [ ] Safe Mode stops active connector execution.
- [ ] Safe Mode prevents new outbound actions.
- [ ] Active loops transition to `stopped_safe_mode` or equivalent.
- [ ] Guardian cannot persuade or reason its way around Safe Mode.

## P1
- [ ] Skill version rollback supported.
- [ ] Loop resume after recoverable interruption supported.
- [ ] Connector health state visible.
- [ ] User can inspect current plan before A2 action.
- [ ] User can stop a loop from UI.

## P2
- [ ] Performance analytics per skill.
- [ ] Failure clustering by checker criterion.
- [ ] Suggested skill improvements generated from repeated verified failures.
- [ ] Multi-agent optimization only after P0/P1 stability.
