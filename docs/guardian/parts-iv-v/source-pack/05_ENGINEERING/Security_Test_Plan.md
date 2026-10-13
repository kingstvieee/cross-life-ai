# Security Test Plan

## Unit tests
- capability matching
- grant expiry
- risk scoring
- autonomy boundary checks
- safe-mode revocation

## Integration tests
- model -> kernel -> simulated connector
- connector isolation
- token issuance/expiry
- audit event completeness

## Adversarial tests
- prompt injection asking Guardian to reveal secrets
- webpage instructing agent to ignore permission rules
- malicious connector requesting unrelated memory
- repeated approval replay
- disguised destructive operation
- model attempting self-escalation

## UX safety tests
- user can understand what will happen before Orange action
- user can revoke permission in <= 3 interactions
- Safe Mode is immediately discoverable
- blocked actions explain why without exposing secrets
