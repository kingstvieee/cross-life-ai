# Guardian Skill Registry
## Part V companion specification

## Purpose
Store versioned, reusable operating procedures that Guardian can invoke without re-inventing instructions every run.

## Skill object
```json
{
  "skill_id": "string",
  "version": "semver-or-date",
  "purpose": "string",
  "allowed_inputs": [],
  "required_context": [],
  "workflow_steps": [],
  "constraints": [],
  "prohibited_actions": [],
  "required_capabilities": [],
  "risk_ceiling": "green|yellow|orange|red",
  "checker_rules": [],
  "success_criteria": [],
  "retry_limit": 0,
  "timeout_seconds": 0,
  "escalation_rule": "string",
  "memory_write_policy": "none|propose|project-only|governed",
  "audit_policy": "full"
}
```

## Registry rules
- skills are versioned
- skill updates are auditable
- no skill can modify Trust Kernel policy
- no skill can reveal raw credentials
- no skill can grant itself connector access
- no skill can raise its own risk ceiling
- no skill can disable verification
- high-risk skills require explicit review before activation

## Example initial skills for simulation
1. `files.organize_preview`
2. `calendar.propose_event`
3. `creative.connector_health_check`
4. `research.source_verification`

Keep initial skills low-risk and simulation-first.
