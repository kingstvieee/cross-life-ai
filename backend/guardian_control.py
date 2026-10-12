"""Deterministic Parts IV/V runtime. All adapters are simulation-only.

No model/tool callbacks, network clients, filesystem writes or credentials exist
here. Owner controls and untrusted plans have separate, closed operations.
"""
from copy import deepcopy
from hashlib import sha256
import json
import re
import secrets
import time
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal


class ClosedModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class GrantInput(ClosedModel):
    connector: Literal["files", "calendar", "creative"]
    capability: Literal["read", "write", "create_draft", "modify_event", "health_check"]
    resource: str = Field(min_length=1, max_length=96, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_./-]*$")
    autonomy: Literal["A0", "A1", "A2", "A3", "A4"] = "A2"
    max_risk: Literal["green", "yellow", "orange"] = "yellow"
    sensitivity: Literal["public", "business"] = "business"
    expires_in_seconds: int = Field(default=3600, ge=60, le=86400)

    @field_validator("resource")
    @classmethod
    def no_traversal(cls, value):
        if ".." in value or "//" in value:
            raise ValueError("invalid_resource")
        return value


class PlanInput(ClosedModel):
    skill_id: str = Field(min_length=1, max_length=80)
    resource: str = Field(min_length=1, max_length=96, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_./-]*$")
    value: str = Field(default="", max_length=2000)
    request_key: str = Field(min_length=8, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    trigger: Literal["user", "schedule"] = "user"

    @field_validator("resource")
    @classmethod
    def no_traversal(cls, value):
        return GrantInput.no_traversal(value)

    @field_validator("value")
    @classmethod
    def reject_credentials(cls, value):
        if re.search(r"(?i)(password|api[_ -]?key|secret|bearer|refresh[_ -]?token)\s*[:=]|\b(?:sk-|ghp_|github_pat_)|-----BEGIN.*PRIVATE KEY", value):
            raise ValueError("credential_material_not_accepted")
        return value


class ApprovalInput(ClosedModel):
    plan_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


class SafeModeInput(ClosedModel):
    enabled: bool
    confirm_resume: bool = False


RISK = {"green": 0, "yellow": 1, "orange": 2, "red": 3, "black": 4}
TERMINAL = {"completed_verified", "blocked_permission", "blocked_risk", "failed_verification", "stopped_safe_mode", "timed_out", "retry_exhausted", "cancelled"}
MAX_RUNS = 100
MAX_GRANTS = 100

# Immutable server-owned registry, never loaded from user prompts or webpage text.
SKILLS = {
    "files.write_preview": {"connector": "files", "capability": "write", "risk": "yellow", "retry_limit": 1, "timeout_seconds": 60},
    "files.read_preview": {"connector": "files", "capability": "read", "risk": "green", "retry_limit": 0, "timeout_seconds": 60},
    "calendar.propose_event": {"connector": "calendar", "capability": "create_draft", "risk": "yellow", "retry_limit": 1, "timeout_seconds": 60},
    "calendar.modify_preview": {"connector": "calendar", "capability": "modify_event", "risk": "orange", "retry_limit": 1, "timeout_seconds": 60},
    "creative.connector_health_check": {"connector": "creative", "capability": "health_check", "risk": "green", "retry_limit": 0, "timeout_seconds": 60},
}


def digest(value: Any) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def initial_state():
    return {"safe_mode": False, "policy_epoch": 0, "grants": {}, "runs": {}, "resources": {}, "memory_proposals": {}, "audit_head": "0" * 64}


class GuardianControl:
    def __init__(self, subject: str, state=None, *, clock=time.time):
        if not subject:
            raise ValueError("authenticated_subject_required")
        self.subject = subject
        self.state: Dict[str, Any] = deepcopy(state or initial_state())
        self.events = []
        self.clock = clock
        # Tokens never cross the HTTP/model boundary or survive a state transition.
        self._tokens = {}

    def audit(self, kind, *, run=None, reason=None):
        entry = {"id": secrets.token_hex(16), "subject": self.subject, "mode": "SIMULATED", "timestamp": self.clock(), "kind": kind, "reason": reason, "run_id": run.get("run_id") if run else None, "lane_id": run.get("lane_id") if run else None, "plan_hash": run.get("plan_hash") if run else None, "previous_hash": self.state["audit_head"]}
        entry["hash"] = digest(entry)
        self.state["audit_head"] = entry["hash"]
        self.events.append(entry)

    def purge_expired_memory(self):
        expired = [key for key, record in self.state["memory_proposals"].items() if self.clock() >= record["expires_at"]]
        for key in expired:
            del self.state["memory_proposals"][key]
            self.audit("memory_expired")
        return {"expired_count": len(expired)}

    def status(self):
        return {"mode": "SIMULATED", "production_actions_enabled": False, "safe_mode": self.state["safe_mode"], "policy_epoch": self.state["policy_epoch"], "grants": deepcopy(list(self.state["grants"].values())), "runs": deepcopy(list(self.state["runs"].values())), "memory_proposals": deepcopy(list(self.state["memory_proposals"].values())), "skills": [{"skill_id": k, "version": "1.0.0", **v} for k, v in SKILLS.items()]}

    def grant(self, body: GrantInput):
        if self.state["safe_mode"]:
            raise ValueError("safe_mode_active")
        if not any(s["connector"] == body.connector and s["capability"] == body.capability for s in SKILLS.values()):
            raise ValueError("unsupported_capability")
        if len(self.state["grants"]) >= MAX_GRANTS:
            raise ValueError("grant_capacity_reached")
        grant = {**body.model_dump(exclude={"expires_in_seconds"}), "grant_id": secrets.token_hex(16), "subject": self.subject, "project": "STAARWAARDD", "created_at": self.clock(), "expires_at": self.clock() + body.expires_in_seconds, "revoked_at": None}
        self.state["grants"][grant["grant_id"]] = grant
        self.audit("grant_created")
        return deepcopy(grant)

    def revoke(self, grant_id):
        grant = self.state["grants"].get(grant_id)
        if not grant:
            raise KeyError("grant_not_found")
        grant["revoked_at"] = self.clock()
        self.state["policy_epoch"] += 1
        self._tokens.clear()
        self.audit("grant_revoked")
        return {"revoked": True}

    def safe_mode(self, body: SafeModeInput):
        if not body.enabled and not body.confirm_resume:
            raise ValueError("explicit_resume_required")
        self.state["safe_mode"] = body.enabled
        self.state["policy_epoch"] += 1
        self._tokens.clear()
        # Resume never revives permissions or interrupted tasks.
        for grant in self.state["grants"].values():
            grant["revoked_at"] = self.clock()
        for run in self.state["runs"].values():
            if run["status"] not in TERMINAL:
                run["status"] = "stopped_safe_mode"
                run["approval"] = None
                self.audit("loop_stopped", run=run, reason="safe_mode")
        self.audit("safe_mode_enabled" if body.enabled else "safe_mode_resumed")
        return {"safe_mode": body.enabled}

    def plan(self, body: PlanInput):
        spec = SKILLS.get(body.skill_id)
        if not spec:
            raise ValueError("unknown_or_prohibited_skill")
        if spec["capability"] not in ("read", "health_check") and not body.value.strip():
            raise ValueError("nonempty_value_required")
        fingerprint = digest(body.model_dump(exclude={"request_key"}))
        for run in self.state["runs"].values():
            if run["request_key"] == body.request_key:
                if run["request_fingerprint"] != fingerprint:
                    raise ValueError("idempotency_key_conflict")
                return deepcopy(run)
        if len(self.state["runs"]) >= MAX_RUNS:
            raise ValueError("run_capacity_reached")
        now = self.clock()
        run = {"run_id": secrets.token_hex(16), "lane_id": secrets.token_hex(16), "skill_id": body.skill_id, "skill_version": "1.0.0", "objective": f"Verify {body.skill_id} on {body.resource}", "request_key": body.request_key, "request_fingerprint": fingerprint, "action": {**spec, "resource": body.resource, "value": body.value, "destination": "simulation://" + spec["connector"], "sensitivity": "business", "project": "STAARWAARDD"}, "trigger": body.trigger, "status": "planned", "created_at": now, "deadline": now + spec["timeout_seconds"], "attempts": 0, "retry_limit": spec["retry_limit"], "approval": None, "evidence": None, "reason": None, "expected_resource_version": self.state["resources"].get(spec["connector"] + ":" + body.resource, {}).get("version", 0)}
        run["plan_hash"] = digest({"subject": self.subject, "run_id": run["run_id"], "lane_id": run["lane_id"], "action": run["action"], "trigger": run["trigger"], "resource_version": run["expected_resource_version"]})
        run["approval_preview"] = {"what": run["objective"], "data": body.value, "destination": run["action"]["destination"], "reversible": True, "reason": "Confirm this exact simulated action; no service will be contacted.", "plan_hash": run["plan_hash"]}
        self.state["runs"][run["run_id"]] = run
        self.audit("loop_planned", run=run)
        if self.state["safe_mode"]:
            self.finish(run, "stopped_safe_mode", "safe_mode")
        return deepcopy(run)

    def get_run(self, run_id):
        run = self.state["runs"].get(run_id)
        if not run:
            raise KeyError("run_not_found")
        return run

    def approve(self, run_id, body: ApprovalInput):
        run = self.get_run(run_id)
        if run["status"] != "approval_needed" or self.state["safe_mode"]:
            raise ValueError("run_not_awaiting_approval")
        if body.plan_hash != run["plan_hash"]:
            raise ValueError("approval_plan_mismatch")
        if self.clock() >= run["deadline"]:
            self.finish(run, "timed_out", "deadline_expired")
            return deepcopy(run)
        run["approval"] = {"plan_hash": body.plan_hash, "epoch": self.state["policy_epoch"], "expires_at": min(self.clock() + 60, run["deadline"]), "consumed": False}
        run["status"] = "planned"
        self.audit("action_approved", run=run)
        return deepcopy(run)

    def finish(self, run, status, reason):
        run["status"], run["reason"] = status, reason
        self.audit("loop_state", run=run, reason=status + ":" + reason)
        return deepcopy(run)

    def authorize(self, run):
        if self.state["safe_mode"]:
            return "stopped_safe_mode", "safe_mode", None
        action = run["action"]
        expected_hash = digest({"subject": self.subject, "run_id": run["run_id"], "lane_id": run["lane_id"], "action": action, "trigger": run["trigger"], "resource_version": run["expected_resource_version"]})
        if expected_hash != run["plan_hash"]:
            return "blocked_permission", "plan_changed_replan_required", None
        spec = SKILLS.get(run["skill_id"])
        if not spec or any(action.get(k) != spec[k] for k in ("connector", "capability", "risk", "retry_limit", "timeout_seconds")):
            return "blocked_risk", "untrusted_action_definition", None
        if action["destination"] != "simulation://" + action["connector"] or action["project"] != "STAARWAARDD":
            return "blocked_permission", "egress_or_project_mismatch", None
        if RISK.get(action["risk"], 4) >= RISK["red"]:
            return "blocked_risk", "prohibited_mvp_risk", None
        grants = [g for g in self.state["grants"].values() if g["subject"] == self.subject and g["project"] == action["project"] and g["connector"] == action["connector"] and g["capability"] == action["capability"] and g["resource"] == action["resource"] and g["revoked_at"] is None and self.clock() < g["expires_at"] and RISK[g["max_risk"]] >= RISK[action["risk"]] and (g["sensitivity"] == "business" or action["sensitivity"] == "public")]
        grants = [g for g in grants if g["autonomy"] != "A1" and (g["autonomy"] != "A0" or action["capability"] in ("read", "health_check")) and (run["trigger"] != "schedule" or g["autonomy"] == "A4")]
        if not grants:
            return "blocked_permission", "no_matching_active_grant", None
        # Prefer the most restrictive applicable grant; policy never relies on a model's risk estimate.
        grant = sorted(grants, key=lambda g: (g["autonomy"] != "A2", g["expires_at"]))[0]
        approval = run["approval"]
        needs_approval = grant["autonomy"] == "A2" or action["risk"] == "orange"
        if needs_approval and not (approval and approval["plan_hash"] == run["plan_hash"] and approval["epoch"] == self.state["policy_epoch"] and not approval["consumed"] and self.clock() < approval["expires_at"]):
            return "approval_needed", "exact_action_confirmation_required", None
        token = secrets.token_hex(32)
        self._tokens[token] = {"subject": self.subject, "run_id": run["run_id"], "lane_id": run["lane_id"], "plan_hash": run["plan_hash"], "action_hash": digest(action), "grant_id": grant["grant_id"], "epoch": self.state["policy_epoch"], "expires_at": self.clock() + 5}
        self.audit("kernel_authorized", run=run)
        return "authorized", "within_granted_scope", token

    def _consume(self, token, run):
        authority = self._tokens.pop(token, None)
        if not authority or authority["subject"] != self.subject or authority["run_id"] != run["run_id"] or authority["lane_id"] != run["lane_id"] or authority["plan_hash"] != run["plan_hash"] or authority["action_hash"] != digest(run["action"]) or authority["epoch"] != self.state["policy_epoch"] or self.clock() >= authority["expires_at"] or self.state["safe_mode"]:
            raise ValueError("invalid_execution_token")
        grant = self.state["grants"].get(authority["grant_id"])
        action = run["action"]
        if not grant or grant["revoked_at"] is not None or self.clock() >= grant["expires_at"] or any(grant[k] != action[k] for k in ("connector", "capability", "resource", "project")) or grant["subject"] != self.subject or RISK[grant["max_risk"]] < RISK[action["risk"]]:
            raise ValueError("invalid_execution_token")
        if run["approval"]:
            run["approval"]["consumed"] = True

    def _execute(self, token, run):
        self._consume(token, run)
        action = run["action"]
        key = action["connector"] + ":" + action["resource"]
        previous = self.state["resources"].get(key)
        if action["capability"] in ("read", "health_check"):
            self.audit("connector_simulated", run=run)
            return {"simulated": True, "resource_key": key}
        if previous and previous["origin_run"] == run["run_id"] and previous["origin_lane"] == run["lane_id"] and previous["value"] == action["value"]:
            self.audit("connector_retry_observed", run=run)
            return {"simulated": True, "resource_key": key}
        if (previous or {}).get("version", 0) != run["expected_resource_version"]:
            raise ValueError("resource_changed_replan_required")
        # All simulated effects and audit are committed together by the store CAS.
        self.state["resources"][key] = {"version": run["expected_resource_version"] + 1, "value": action["value"], "origin_run": run["run_id"], "origin_lane": run["lane_id"], "project": "STAARWAARDD", "simulated": True}
        self.audit("connector_simulated", run=run)
        return {"simulated": True, "resource_key": key}

    def _verify(self, run):
        """Read independently from state, never accept an executor's success flag."""
        action = run["action"]
        key = action["connector"] + ":" + action["resource"]
        observed = self.state["resources"].get(key)
        if action["capability"] == "health_check":
            return {"criterion": "registered_simulation_adapter", "passed": action["connector"] == "creative", "mode": "SIMULATED"}
        if action["capability"] == "read":
            return {"criterion": "scoped_resource_exists", "passed": bool(observed and observed["project"] == "STAARWAARDD"), "mode": "SIMULATED"}
        return {"criterion": "stored_value_and_origin_match", "passed": bool(observed and observed["value"] == action["value"] and observed["origin_run"] == run["run_id"] and observed["origin_lane"] == run["lane_id"]), "observed_version": (observed or {}).get("version"), "mode": "SIMULATED"}

    def advance(self, run_id):
        run = self.get_run(run_id)
        if run["status"] in TERMINAL or run["status"] == "verifying":
            return deepcopy(run)
        if self.state["safe_mode"]:
            return self.finish(run, "stopped_safe_mode", "safe_mode")
        if self.clock() >= run["deadline"]:
            return self.finish(run, "timed_out", "deadline_expired")
        if run["attempts"] >= run["retry_limit"] + 1:
            return self.finish(run, "retry_exhausted", "retry_budget_exhausted")
        decision, reason, token = self.authorize(run)
        if decision != "authorized":
            return self.finish(run, decision, reason)
        run["attempts"] += 1
        try:
            self._execute(token, run)
        except ValueError as exc:
            return self.finish(run, "blocked_permission", str(exc))
        run["status"] = "verifying"
        return deepcopy(run)

    def verify(self, run_id):
        run = self.get_run(run_id)
        if run["status"] in TERMINAL:
            return deepcopy(run)
        if self.state["safe_mode"]:
            return self.finish(run, "stopped_safe_mode", "safe_mode")
        if run["status"] != "verifying":
            raise ValueError("run_not_awaiting_verification")
        if self.clock() >= run["deadline"]:
            return self.finish(run, "timed_out", "deadline_expired")
        evidence = self._verify(run)
        run["evidence"] = evidence
        self.audit("verification_checked", run=run, reason=evidence["criterion"])
        if not evidence["passed"]:
            status = "retry_exhausted" if run["attempts"] >= run["retry_limit"] + 1 else "repair_needed"
            return self.finish(run, status, "observable_state_mismatch")
        proposal_id = secrets.token_hex(16)
        self.state["memory_proposals"][proposal_id] = {"proposal_id": proposal_id, "source": run["run_id"], "lane_id": run["lane_id"], "project": "STAARWAARDD", "confidence": 1.0, "sensitivity": "business", "expires_at": self.clock() + 86400, "status": "proposed", "summary": run["objective"], "evidence": deepcopy(evidence)}
        self.audit("memory_proposed", run=run)
        return self.finish(run, "completed_verified", "simulated_result_verified")

    def cancel(self, run_id):
        run = self.get_run(run_id)
        if run["status"] in TERMINAL:
            return deepcopy(run)
        run["approval"] = None
        return self.finish(run, "cancelled", "stopped_by_owner")

    def context(self, run_id):
        run = self.get_run(run_id)
        # No arbitrary user history, raw grant payloads, audit text or secrets.
        return {"project": "STAARWAARDD", "objective": run["objective"], "skill_id": run["skill_id"], "skill_version": run["skill_version"], "allowed_destination": run["action"]["destination"], "success_criterion": "independent_simulation_state_check", "deadline": run["deadline"]}

    def resolve_memory(self, proposal_id, retain: bool):
        proposal = self.state["memory_proposals"].get(proposal_id)
        if not proposal:
            raise KeyError("memory_proposal_not_found")
        if self.state["safe_mode"] or self.clock() >= proposal["expires_at"]:
            raise ValueError("memory_write_not_permitted")
        if proposal["status"] != "proposed":
            raise ValueError("memory_already_resolved")
        proposal["status"] = "retained_project_only" if retain else "discarded"
        self.audit("memory_resolved", reason=proposal["status"])
        result = deepcopy(proposal)
        if not retain:
            del self.state["memory_proposals"][proposal_id]
        return result
