# Threat Model

## Primary threats
- prompt injection via external content
- tool/connector compromise
- credential leakage
- permission escalation
- cross-connector privilege bleed
- data exfiltration
- stale approval replay
- malicious or mistaken automated action
- memory poisoning
- model hallucination used as action premise
- audit tampering
- unsafe physical-device command (future)

## Required mitigations
- deterministic policy layer outside model
- least-privilege capability grants
- connector sandboxing
- short-lived tokens
- egress controls
- explicit high-risk approval
- source/confidence metadata for memory
- append-only audit events
- emergency revocation
- action verification

## Important design assumption
The model can be wrong, confused, manipulated, or compromised. Security must remain intact anyway.
