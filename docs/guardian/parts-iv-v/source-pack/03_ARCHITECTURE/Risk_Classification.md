# Risk Classification

## Green
Examples:
- read permitted calendar
- search permitted files
- summarize documents
- check public information

Default: may execute within granted scope.

## Yellow
Examples:
- create/edit local files
- organize permitted data
- run non-destructive automation
- create content drafts

Default: permitted only under explicit capability grant.

## Orange
Examples:
- send email/message
- publish content
- share personal data
- modify appointments
- change external account state

Default: explicit approval immediately before execution.

## Red
Examples:
- move money
- sign contracts
- delete accounts/data
- change credentials
- control door/security systems
- make large purchases
- expose highly sensitive data

Default: blocked in MVP. Future support requires strong identity verification and dedicated policy.

## Black / Never Allowed
- bypass Trust Kernel
- disable audit logs
- self-expand permissions
- obtain raw passwords/secrets
- override Emergency Safe Mode
- intentionally harm a human or animal
- manipulate a user into granting authority
