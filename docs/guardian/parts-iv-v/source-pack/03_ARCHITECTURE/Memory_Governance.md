# Memory Governance

## Memory classes
- Temporary
- Personal
- Business
- Sensitive
- Restricted
- Never Remember

## Required metadata
Every memory record must have:
- source reference
- created timestamp
- last confirmed timestamp
- confidence
- sensitivity class
- allowed consumers/portals
- retention/expiry rule
- deletion state

## Guardrails
- Derived memories must be distinguishable from source facts.
- Low-confidence derived memories cannot be used to authorize actions.
- Restricted memories cannot leave the local/trusted boundary without explicit approval.
- Deleting a source does not silently preserve derived memory without informing the user.
