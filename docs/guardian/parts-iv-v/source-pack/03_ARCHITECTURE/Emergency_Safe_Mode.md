# Emergency Safe Mode

## Goal
Provide an independent kill path that Guardian cannot override.

## On activation
Immediately revoke:
- all capability tokens
- outbound network tool calls
- background automations
- connector actions
- future physical-device control

## Safe-mode behavior
Guardian may remain visible and explain status, but cannot execute external actions.

## Recovery
Recovery requires explicit user re-authorization and should never be initiated autonomously by Guardian.
