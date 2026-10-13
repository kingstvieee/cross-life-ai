# Guardian Autonomy State Model

| Level | Name | Guardian May | Requires Approval |
|---|---|---|---|
| A0 | Observe | Read permitted data and report | No for permitted reads |
| A1 | Suggest | Recommend actions and prepare plans | No execution |
| A2 | Confirm-to-Act | Prepare a real action | Yes, before execution |
| A3 | Bounded Auto | Execute pre-approved low/medium-risk rules | Only outside defined bounds |
| A4 | Scheduled/Delegated | Execute a named recurring task under fixed policy | Changes to scope/risk require approval |

## Rule
Autonomy is attached to a **capability + resource + risk boundary**, not to Guardian globally.
