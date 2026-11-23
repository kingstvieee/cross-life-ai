"""Review a Guardian staging evidence bundle offline. This command does not approve a release."""
import argparse
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from hmac import compare_digest
import json
from pathlib import Path
from typing import NamedTuple

from pydantic import ValidationError

from guardian_staging_manifest import ARTIFACT_MODELS, Manifest

MANIFEST_BYTES = 128 * 1024
ARTIFACT_BYTES = 4 * 1024 * 1024
MIN_CLOSED = timedelta(hours=48)
MAX_POLL_GAP = timedelta(minutes=2)
EXPECTED_ROLES = {"api", "worker", "verifier", "relay", "consumer"}


class Check(NamedTuple):
    id: int
    passed: bool
    description: str


def bounded_read(path, maximum):
    if not path.is_file():
        raise OSError("Expected a regular file")
    with path.open("rb") as stream:
        data = stream.read(maximum + 1)
    if len(data) > maximum:
        raise ValueError("Evidence exceeds size limit")
    return data


def resolve_artifact(root, name):
    relative = Path(name)
    if relative.is_absolute() or ".." in relative.parts or "\\" in name or ":" in name:
        raise ValueError("Evidence path must be relative to the bundle")
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Evidence path leaves the bundle")
    return path


def review_inputs(manifest, root):
    checks = []
    observations = {}
    exact_kinds = set(manifest.artifacts) == set(ARTIFACT_MODELS)
    source_paths = set()
    unique = confined = hashes = parsed = sizes = True
    for name, item in manifest.artifacts.items():
        try:
            path = resolve_artifact(root, item.path)
        except (OSError, RuntimeError, ValueError):
            confined = False
            continue
        if path in source_paths:
            unique = False
            continue
        source_paths.add(path)
        try:
            data = bounded_read(path, ARTIFACT_BYTES)
        except OSError:
            parsed = False
            continue
        except ValueError:
            sizes = False
            continue
        if not compare_digest(sha256(data).hexdigest(), item.sha256):
            hashes = False
            continue
        try:
            observations[name] = ARTIFACT_MODELS[name].model_validate_json(data)
        except ValidationError:
            parsed = False
    checks.extend([
        Check(423, exact_kinds, "All seven required observation types are present"),
        Check(424, unique, "Observation types use distinct files"),
        Check(425, confined, "Artifact paths stay inside the bundle directory"),
        Check(426, hashes, "Artifact bytes match the declared SHA-256"),
        Check(427, parsed, "Artifacts are readable and follow their typed schema"),
        Check(428, sizes, "Artifact size is within the four MiB limit per file"),
    ])
    usable = exact_kinds and len(observations) == len(ARTIFACT_MODELS)
    return checks, observations if usable else None


def timeline_checks(manifest, device, mission):
    start, end = device.closed_at, device.first_return_at
    return [
        Check(431, device.platform == "ios", "Device capture comes from the iPhone build"),
        Check(432, device.build == manifest.device_build, "Device build matches the run manifest"),
        Check(433, device.account == mission.owner, "Device account owns the mission"),
        Check(434, start < end, "App close comes before the first return"),
        Check(435, end - start >= MIN_CLOSED, "App remained closed for at least 48 hours"),
        Check(436, device.capture_started_at <= start, "Device capture covers app close"),
        Check(437, end <= device.capture_ended_at <= manifest.recorded_at, "Device capture covers the first return"),
        Check(438, not any(start < moment < end for moment in device.launches), "No app relaunch appears in the closed window"),
        Check(439, mission.scheduled_at >= start + MIN_CLOSED, "Mission is scheduled at least 48 hours after app close"),
        Check(440, mission.approved_at <= start, "Approval precedes app closure"),
        Check(441, mission.approver == mission.owner, "The mission owner approved the preview"),
        Check(442, mission.scheduled_at < mission.deadline, "Scheduled work precedes its deadline"),
    ]


def has_poll_coverage(samples, start, end):
    if end <= start:
        return False
    ready = sorted({sample.observed_at for sample in samples if sample.ready})
    if not ready or ready[0] > start or ready[-1] < end:
        return False
    return all(later - earlier <= MAX_POLL_GAP
               for earlier, later in zip(ready, ready[1:]) if earlier < end and later > start)


def service_checks(manifest, device, services, authorization):
    by_instance = {service.instance: service for service in services.instances}
    by_role = {role: [] for role in EXPECTED_ROLES}
    for sample in services.samples:
        instance = by_instance.get(sample.instance)
        if instance:
            by_role[instance.role].append(sample)
    principals = {}
    for service in services.instances:
        principals.setdefault(service.principal, set()).add(service.role)
    checks = [
        Check(443, {item.role for item in services.instances} == EXPECTED_ROLES, "All five service roles are recorded"),
        Check(444, all(item.commit == manifest.build_commit for item in services.instances), "Services use the recorded commit"),
        Check(445, len(by_instance) == len(services.instances), "Service instance identifiers are unique"),
        Check(446, all(len(roles) == 1 for roles in principals.values()), "Service principals are separate across roles"),
        Check(447, all(item.instance in by_instance for item in services.samples), "Each poll references a registered instance"),
        Check(448, len({(sample.instance, sample.observed_at) for sample in services.samples}) == len(services.samples),
              "Each instance has at most one poll result per timestamp"),
        Check(449, all(device.capture_started_at <= item.observed_at <= manifest.recorded_at for item in services.samples),
              "Poll times stay inside the recorded run"),
    ]
    for number, role in enumerate(("worker", "verifier", "relay", "consumer", "api"), 450):
        checks.append(Check(number, has_poll_coverage(by_role[role], device.closed_at, device.first_return_at),
                            f"{role.capitalize()} ready polls span closure with at most two minutes between samples"))
    checks.extend([
        Check(455, principals.get(authorization.relay_principal) == {"relay"}, "Permission evidence identifies the relay principal"),
        Check(456, principals.get(authorization.consumer_principal) == {"consumer"}, "Permission evidence identifies the consumer principal"),
    ])
    return checks, by_instance


def recovery_checks(device, mission, recovery, services, instances):
    before = instances.get(recovery.previous_worker)
    after = instances.get(recovery.replacement_worker)
    replacement_sample = any(
        item.instance == recovery.replacement_worker and item.ready
        and recovery.stopped_at <= item.observed_at <= recovery.replacement_ready_at
        for item in services.samples
    )
    return [
        Check(457, recovery.previous_worker != recovery.replacement_worker, "Worker restart changed process identity"),
        Check(458, bool(before and after and before.role == after.role == "worker"), "Both restart processes are registered workers"),
        Check(459, device.closed_at <= recovery.stopped_at < device.first_return_at, "Worker stopped during the closed window"),
        Check(460, recovery.stopped_at < recovery.replacement_ready_at <= mission.started_at and replacement_sample,
              "Replacement was observed ready after the stop and before execution"),
        Check(461, mission.worker_instance == recovery.replacement_worker, "The replacement worker executed the mission"),
        Check(462, any(s.instance == recovery.previous_worker and s.ready and s.observed_at < recovery.stopped_at for s in services.samples)
              and not any(s.instance == recovery.previous_worker and s.ready and s.observed_at >= recovery.stopped_at for s in services.samples),
              "Poll evidence corroborates the previous worker stopping"),
        Check(463, recovery.unstarted_lease_outcome == "requeued", "An expired unstarted lease was safely requeued"),
        Check(464, recovery.unstarted_effect_count == 0, "The unstarted lease produced zero effects"),
        Check(465, recovery.uncertain_lease_outcome == "quarantined", "An uncertain lease was quarantined"),
        Check(466, recovery.uncertain_replay_count == 0, "The uncertain effect was never replayed"),
        Check(467, recovery.checkpoint_before == recovery.checkpoint_after, "The quarantined checkpoint matches its saved digest"),
    ]


def outcome_checks(device, mission, inbox, authorization, isolation, instances):
    verifier = instances.get(mission.verifier_instance)
    codes = (authorization.consumer_mission_read_code, authorization.consumer_mission_write_code,
             authorization.consumer_dispatch_insert_code, authorization.relay_inbox_write_code,
             authorization.consumer_foreign_heartbeat_code)
    foreign_statuses = (isolation.foreign_detail_status, isolation.foreign_read_status, isolation.foreign_ack_status)
    return [
        Check(468, mission.handler == "mission_preview", "The run uses the zero-cost preview handler"),
        Check(469, mission.approval_digest == mission.executed_digest, "Execution matches the approved digest"),
        Check(470, mission.budget_cad_cents == 0, "Approved budget is CAD $0"),
        Check(471, mission.actual_cad_cents == 0, "Recorded cost is CAD $0"),
        Check(472, mission.scheduled_at <= mission.started_at < mission.deadline, "Execution started within the allowed window"),
        Check(473, mission.started_at <= mission.verified_at < mission.deadline, "Verification followed execution and preceded the deadline"),
        Check(474, bool(verifier and verifier.role == "verifier" and mission.verifier_instance != mission.worker_instance),
              "A registered independent verifier issued the result"),
        Check(475, mission.outcome == "passed", "Verifier outcome is passed"),
        Check(476, mission.state == "completed", "The mission is recorded as completed"),
        Check(477, mission.execution_attempts == 1, "The run has one execution attempt"),
        Check(478, mission.verified_result_count == 1, "The run has one durable verified result"),
        Check(479, inbox.owner == mission.owner, "The inbox entry belongs to the mission owner"),
        Check(480, inbox.mission_id == mission.mission_id, "The notice links to the verified mission"),
        Check(481, inbox.event_kind == "result_ready", "The inbox entry is classified as a verified result"),
        Check(482, inbox.result_digest == mission.result_digest, "The notice evidence links to the verified result digest"),
        Check(483, inbox.dispatch_count == 1, "One dispatch exists for this result"),
        Check(484, inbox.notice_count == 1, "One owner-visible notice exists for this result"),
        Check(485, sha256(inbox.event_id.encode("utf-8")).hexdigest() == inbox.notice_id
              and inbox.read_notice_id == inbox.notice_id and inbox.read_by == mission.owner,
              "The confirmed read belongs to this notice and its owner"),
        Check(486, mission.verified_at <= inbox.delivered_at <= device.first_return_at,
              "The verified notice reached the inbox before the device returned"),
        Check(487, device.first_return_at <= inbox.read_at, "Reading happened after the recorded device return"),
        Check(488, inbox.acknowledged_mission_id == mission.mission_id and inbox.acknowledged_by == mission.owner
              and inbox.read_at < inbox.acknowledged_at <= device.capture_ended_at,
              "A separate, later acknowledgment is linked to the same owner and mission"),
        Check(489, authorization.consumer_delivery_succeeded and all(code == 13 for code in codes),
              "Consumer delivery succeeded and all five MongoDB privilege probes were denied"),
        Check(490, isolation.foreign_list_status == 200 and isolation.foreign_list_visible_count == 0
              and all(status in {403, 404} for status in foreign_statuses),
              "The second account could neither see the result nor read or acknowledge it"),
        Check(491, isolation.owner == mission.owner and isolation.mission_id == mission.mission_id
              and isolation.other_account != mission.owner and isolation.owner_receipts_unchanged,
              "Foreign-account tests targeted this mission and left the owner's receipts intact"),
        Check(492, device.account_switch_passed and device.voiceover_passed and device.large_text_passed,
              "The iPhone account switch, VoiceOver and large-text checks passed"),
    ]


def review_bundle(manifest_path, *, now=None):
    try:
        manifest = Manifest.model_validate_json(bounded_read(manifest_path, MANIFEST_BYTES))
    except (OSError, ValueError):
        return {"status": "incomplete", "checks": [], "issue": "Manifest missing, unreadable or invalid"}
    return review_manifest(manifest, manifest_path.parent.resolve(), now=now)


def review_manifest(manifest, root, *, now=None):
    """Evaluate the exact manifest snapshot supplied by the caller."""
    checks = [
        Check(421, manifest.environment == "staging", "The evidence identifies a staging run"),
        Check(422, not manifest.fixture_only, "The run is not marked as a fixture"),
    ]
    inputs, data = review_inputs(manifest, root)
    checks.extend(inputs)
    if data is None:
        return report("incomplete", manifest.run_id, checks)
    checks.extend([
        Check(429, all(item.run_id == manifest.run_id for item in data.values()), "Observation files share the manifest run ID"),
        Check(430, manifest.recorded_at <= (now or datetime.now(timezone.utc)), "The recording timestamp is not in the future"),
    ])
    device, mission, services = (data[name] for name in ("device", "mission", "services"))
    authorization = data["authorization"]
    checks.extend(timeline_checks(manifest, device, mission))
    service_results, instances = service_checks(manifest, device, services, authorization)
    checks.extend(service_results)
    checks.extend(recovery_checks(device, mission, data["recovery"], services, instances))
    checks.extend(outcome_checks(device, mission, data["inbox"], authorization, data["isolation"], instances))
    return report("ready_for_review" if all(item.passed for item in checks) else "failed", manifest.run_id, checks)


def report(status, run_id, checks):
    return {"status": status, "run_id": run_id, "checks": [
        {"id": f"SH-{check.id}", "passed": check.passed, "description": check.description} for check in checks
    ]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path, nargs="?")
    parser.add_argument("--schema", action="store_true", help="Print JSON schemas for the manifest and observations")
    args = parser.parse_args()
    if args.schema:
        if args.manifest is not None:
            parser.error("Use only one of --schema or a manifest path")
        print(json.dumps({"manifest": Manifest.model_json_schema(), "observations": {
            name: model.model_json_schema() for name, model in ARTIFACT_MODELS.items()
        }}, indent=2, sort_keys=True))
        return 0
    if args.manifest is None:
        parser.error("Provide a manifest path or use --schema")
    result = review_bundle(args.manifest)
    print(json.dumps(result, indent=2, sort_keys=True))
    return {"ready_for_review": 0, "failed": 1, "incomplete": 2}[result["status"]]


if __name__ == "__main__":
    raise SystemExit(main())
