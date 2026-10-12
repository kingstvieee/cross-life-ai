# Credential Vault Architecture

## Principle
Guardian/model context never receives raw passwords, API secrets, refresh tokens, private keys or session secrets.

## Flow
1. User connects a service through a trusted authorization flow.
2. Credential material is stored encrypted in the vault.
3. Trust Kernel requests a scoped, short-lived capability for a specific action.
4. Executor receives only what is required to perform that action.
5. Result returns to Guardian without exposing underlying secrets.

## Required controls
- encryption at rest
- encryption in transit
- scoped token issuance
- token expiry
- revocation
- connector-specific isolation
- access logging
