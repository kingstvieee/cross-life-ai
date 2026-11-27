"""Fail-closed Guardian tool admission and evidence receipts; no provider side effects here."""
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import json
import re
from typing import Callable, Mapping

_SAFE_ID = re.compile(r'^[a-z][a-z0-9_.:-]{2,79}$')

@dataclass(frozen=True)
class ToolSpec:
    name: str
    required_scope: str
    read_only: bool = True
    requires_approval: bool = False

class GuardianToolRouter:
    def __init__(self):
        self._tools: dict[str, tuple[ToolSpec, Callable]] = {}
        self._receipts: dict[str, dict] = {}

    def register(self, spec: ToolSpec, adapter: Callable):
        if not _SAFE_ID.fullmatch(spec.name) or not _SAFE_ID.fullmatch(spec.required_scope):
            raise ValueError('invalid_tool_contract')
        if spec.name in self._tools:
            raise ValueError('duplicate_tool')
        if not spec.read_only and not spec.requires_approval:
            raise ValueError('write_tool_requires_approval')
        self._tools[spec.name] = (spec, adapter)

    def dispatch(self, *, request_id: str, actor_id: str, tool: str,
                 scopes: set[str], arguments: Mapping, approved: bool = False,
                 readback: Callable | None = None):
        if not request_id or not actor_id or not isinstance(arguments, Mapping):
            raise ValueError('invalid_request')
        digest = sha256(json.dumps([actor_id, tool, arguments], sort_keys=True, default=str).encode()).hexdigest()
        previous = self._receipts.get(request_id)
        if previous:
            if previous['requestHash'] != digest:
                raise ValueError('idempotency_conflict')
            return dict(previous)
        receipt = {'requestId': request_id, 'actorId': actor_id, 'tool': tool,
                   'requestHash': digest, 'timestamp': datetime.now(timezone.utc).isoformat(),
                   'status': 'denied', 'verified': False, 'reason': None}
        registered = self._tools.get(tool)
        if not registered:
            receipt['reason'] = 'unknown_tool'
        else:
            spec, adapter = registered
            if spec.required_scope not in scopes:
                receipt['reason'] = 'scope_denied'
            elif spec.requires_approval and not approved:
                receipt['reason'] = 'approval_required'
            else:
                receipt['status'] = 'admitted'
                try:
                    outcome = adapter(dict(arguments))
                    receipt['status'] = 'provider_reported'
                    receipt['resultHash'] = sha256(json.dumps(outcome, sort_keys=True, default=str).encode()).hexdigest()
                    if readback is not None:
                        receipt['verified'] = bool(readback(outcome))
                        receipt['status'] = 'verified' if receipt['verified'] else 'readback_failed'
                except Exception:
                    receipt['status'] = 'failed' if spec.read_only else 'unknown'
                    receipt['reason'] = 'adapter_failure' if spec.read_only else 'provider_outcome_unresolved'
        self._receipts[request_id] = dict(receipt)
        return dict(receipt)
