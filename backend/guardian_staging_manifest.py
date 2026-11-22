"""Versioned inputs for offline review of a Guardian staging run."""
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

Token = Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")]
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Commit = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Count = Annotated[int, Field(ge=0)]
Role = Literal["api", "worker", "verifier", "relay", "consumer"]
ArtifactName = Literal["device", "mission", "services", "recovery", "authorization", "inbox", "isolation"]


class EvidenceModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Artifact(EvidenceModel):
    path: Annotated[str, Field(min_length=1, max_length=240)]
    sha256: Digest


class Manifest(EvidenceModel):
    version: Annotated[int, Field(ge=1, le=1)]
    run_id: Token
    environment: Literal["staging", "local"]
    fixture_only: bool
    build_commit: Commit
    device_build: Token
    recorded_at: AwareDatetime
    artifacts: dict[ArtifactName, Artifact]


class Observation(EvidenceModel):
    run_id: Token


class Device(Observation):
    build: Token
    platform: Literal["ios", "android", "web"]
    account: Token
    closed_at: AwareDatetime
    first_return_at: AwareDatetime
    capture_started_at: AwareDatetime
    capture_ended_at: AwareDatetime
    launches: Annotated[list[AwareDatetime], Field(max_length=1000)]
    account_switch_passed: bool
    voiceover_passed: bool
    large_text_passed: bool


class Mission(Observation):
    mission_id: Token
    owner: Token
    handler: Token
    approval_digest: Digest
    executed_digest: Digest
    result_digest: Digest
    approver: Token
    approved_at: AwareDatetime
    scheduled_at: AwareDatetime
    deadline: AwareDatetime
    started_at: AwareDatetime
    verified_at: AwareDatetime
    worker_instance: Token
    verifier_instance: Token
    budget_cad_cents: Count
    actual_cad_cents: Count
    state: Token
    outcome: Literal["passed", "failed", "unknown"]
    execution_attempts: Count
    verified_result_count: Count


class ServiceInstance(EvidenceModel):
    role: Role
    instance: Token
    principal: Token
    commit: Commit
    config_version: Token


class ServiceSample(EvidenceModel):
    instance: Token
    observed_at: AwareDatetime
    ready: bool


class Services(Observation):
    instances: Annotated[list[ServiceInstance], Field(min_length=1, max_length=25)]
    samples: Annotated[list[ServiceSample], Field(max_length=30000)]


class Recovery(Observation):
    previous_worker: Token
    replacement_worker: Token
    stopped_at: AwareDatetime
    replacement_ready_at: AwareDatetime
    unstarted_lease_outcome: Literal["requeued", "blocked", "lost"]
    uncertain_lease_outcome: Literal["quarantined", "replayed", "lost"]
    unstarted_effect_count: Count
    uncertain_replay_count: Count
    checkpoint_before: Digest
    checkpoint_after: Digest


class Authorization(Observation):
    relay_principal: Token
    consumer_principal: Token
    consumer_delivery_succeeded: bool
    consumer_mission_read_code: Count
    consumer_mission_write_code: Count
    consumer_dispatch_insert_code: Count
    relay_inbox_write_code: Count
    consumer_foreign_heartbeat_code: Count


class Inbox(Observation):
    owner: Token
    mission_id: Token
    event_id: Token
    notice_id: Digest
    result_digest: Digest
    event_kind: Literal["result_ready", "needs_review"]
    dispatch_count: Count
    notice_count: Count
    delivered_at: AwareDatetime
    read_notice_id: Digest
    read_by: Token
    read_at: AwareDatetime
    acknowledged_mission_id: Token
    acknowledged_by: Token
    acknowledged_at: AwareDatetime


class Isolation(Observation):
    owner: Token
    other_account: Token
    mission_id: Token
    foreign_list_status: Count
    foreign_list_visible_count: Count
    foreign_detail_status: Count
    foreign_read_status: Count
    foreign_ack_status: Count
    owner_receipts_unchanged: bool


ARTIFACT_MODELS = {
    "device": Device, "mission": Mission, "services": Services, "recovery": Recovery,
    "authorization": Authorization, "inbox": Inbox, "isolation": Isolation,
}
