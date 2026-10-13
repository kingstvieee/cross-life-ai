# Network Egress Policy

Every outbound request must include:
- destination
- connector identity
- declared task
- requested data categories
- permission grant ID
- risk classification

## Decision order
1. Is destination known/allowed?
2. Does connector have permission?
3. Is requested data within scope?
4. Does the declared task match the capability grant?
5. Is the risk level permitted?
6. Does user approval exist if required?
7. If all pass, issue a short-lived execution token.

## User-facing block event
Guardian must explain:
- what was blocked
- which destination was involved
- what data category was requested
- which rule caused the block
- safe alternatives
