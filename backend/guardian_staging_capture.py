"""Record Guardian service polls and assemble a validator-ready evidence bundle."""
import argparse
import asyncio
from datetime import datetime, timezone
import fcntl
from hashlib import sha256
import json
import os
from pathlib import Path
import stat
from tempfile import NamedTemporaryFile
from typing import Annotated

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import Field, TypeAdapter

from guardian_staging_evidence import ARTIFACT_BYTES, MANIFEST_BYTES, bounded_read, resolve_artifact
from guardian_staging_manifest import ARTIFACT_MODELS, Manifest, Observation, ServiceInstance, Services, Token
from guardian_staging_sampler import PollFrame, capture_frame, sampling_config, sampler_role

MAX_FRAME_BYTES = 4096
MAX_JOURNAL_BYTES = 8 * 1024 * 1024
MAX_JOURNAL_FRAMES = 5900
RUN_TOKEN = TypeAdapter(Token)


class ServiceRegistry(Observation):
    instances: Annotated[list[ServiceInstance], Field(min_length=1, max_length=25)]


def validate_continuation(previous, frame):
    if previous.run_id != frame.run_id:
        raise ValueError("The poll journal already belongs to another run")
    if frame.observed_at <= previous.observed_at:
        raise ValueError("Poll timestamps must increase strictly")


def append_frame(path, frame):
    data = frame.model_dump_json().encode() + b"\n"
    if len(data) > MAX_FRAME_BYTES:
        raise ValueError("Poll frame exceeds journal record size")
    # Opening in append mode and locking the same inode keeps a competing
    # writer from comparing against a stale tail.
    flags = os.O_CREAT | os.O_APPEND | os.O_RDWR | os.O_NOFOLLOW
    with open(os.open(path, flags, 0o600), "a+b") as journal:
        if not stat.S_ISREG(os.fstat(journal.fileno()).st_mode):
            raise ValueError("Poll journal must be a regular file")
        fcntl.flock(journal, fcntl.LOCK_EX | fcntl.LOCK_NB)
        size = journal.seek(0, os.SEEK_END)
        if size + len(data) > MAX_JOURNAL_BYTES:
            raise ValueError("Poll journal exceeds size limit")
        if size:
            journal.seek(max(0, size - MAX_FRAME_BYTES - 1))
            tail = journal.read()
            if not tail.endswith(b"\n"):
                raise ValueError("Poll journal has an interrupted last record")
            last = tail[:-1].rsplit(b"\n", 1)[-1]
            validate_continuation(PollFrame.model_validate_json(last), frame)
        journal.write(data)
        journal.flush()
        os.fsync(journal.fileno())


def load_journal(path):
    data = bounded_read(path, MAX_JOURNAL_BYTES)
    if not data or not data.endswith(b"\n"):
        raise ValueError("Poll journal is empty or has an interrupted last record")
    lines = data[:-1].split(b"\n")
    if len(lines) > MAX_JOURNAL_FRAMES or any(len(line) + 1 > MAX_FRAME_BYTES for line in lines):
        raise ValueError("Poll journal exceeds the record limit")
    frames = []
    for line in lines:
        frame = PollFrame.model_validate_json(line)
        if frames:
            validate_continuation(frames[-1], frame)
        frames.append(frame)
    return frames


def write_new_json(path, data, *, maximum):
    encoded = data.model_dump_json().encode() + b"\n"
    write_new_bytes(path, encoded, maximum=maximum)


def write_new_bytes(path, encoded, *, maximum):
    if len(encoded) > maximum:
        raise ValueError("Output exceeds the evidence file size limit")
    # A crash before publishing leaves the destination untouched. link()
    # fails if another writer already published the requested destination.
    with NamedTemporaryFile(dir=path.parent) as temp:
        temp.write(encoded)
        temp.flush()
        os.fsync(temp.fileno())
        os.link(temp.name, path)


def assemble_services(registry_file, journal_file, output):
    registry = ServiceRegistry.model_validate_json(bounded_read(registry_file, MANIFEST_BYTES))
    instances = {item.instance: item.role for item in registry.instances}
    if len(instances) != len(registry.instances):
        raise ValueError("Registry instance identifiers must be unique")
    frames = load_journal(journal_file)
    if frames[0].run_id != registry.run_id:
        raise ValueError("Registry belongs to a different run than the journal")
    samples = []
    for frame in frames:
        for role, poll in frame.polls.items():
            if poll.instance is None:
                # Unidentified failures stay in the source journal. The
                # validator will measure the resulting gap in ready polls.
                continue
            if instances.get(poll.instance) != role:
                raise ValueError("Observed instance is absent from the registry or belongs to a different role")
            samples.append({"instance": poll.instance, "observed_at": frame.observed_at, "ready": poll.state == "ready"})
    data = Services.model_validate({"run_id": registry.run_id, "instances": registry.instances, "samples": samples})
    write_new_json(output, data, maximum=ARTIFACT_BYTES)


def seal_bundle(output, *, run_id, environment, fixture_only, build_commit, device_build):
    root = output.parent.resolve()
    references = {}
    seen = set()
    if fixture_only and environment == "staging":
        raise ValueError("Fixture bundles must be kept in the local environment")
    for name, model in ARTIFACT_MODELS.items():
        filename = f"{name}.json"
        path = resolve_artifact(root, filename)
        if path in seen:
            raise ValueError("Observation files must be distinct")
        seen.add(path)
        content = bounded_read(path, ARTIFACT_BYTES)
        if model.model_validate_json(content).run_id != run_id:
            raise ValueError("Every observation must share the manifest run ID")
        references[name] = {"path": filename, "sha256": sha256(content).hexdigest()}
    manifest = Manifest.model_validate({
        "version": 1, "run_id": run_id, "environment": environment,
        "fixture_only": fixture_only, "build_commit": build_commit, "device_build": device_build,
        "recorded_at": datetime.now(timezone.utc), "artifacts": references,
    })
    write_new_json(output, manifest, maximum=MANIFEST_BYTES)


async def journal_services(journal, *, run_id, api_instance, count, interval):
    RUN_TOKEN.validate_python(run_id, strict=True)
    RUN_TOKEN.validate_python(api_instance, strict=True)
    if not 1 <= count <= MAX_JOURNAL_FRAMES or not 30 <= interval <= 60:
        raise ValueError("Use 1–5900 polls and a 30–60 second interval")
    uri, database, api_url = sampling_config()
    client = AsyncIOMotorClient(uri, tz_aware=True, serverSelectionTimeoutMS=5000)
    try:
        async with httpx.AsyncClient(follow_redirects=False, trust_env=False, timeout=5) as api:
            loop = asyncio.get_running_loop()
            next_poll = loop.time()
            for index in range(count):
                frame = await capture_frame(client[database], api, run_id=run_id, api_url=api_url,
                                            api_instance=api_instance)
                append_frame(journal, frame)
                if index + 1 < count:
                    next_poll += interval
                    await asyncio.sleep(max(0, next_poll - loop.time()))
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    live = commands.add_parser("sample", help="Append read-only service observations")
    live.add_argument("journal", type=Path)
    live.add_argument("--run-id", required=True)
    live.add_argument("--api-instance", required=True)
    live.add_argument("--count", type=int, default=1)
    live.add_argument("--interval", type=int, default=60)
    assemble = commands.add_parser("assemble-services", help="Export typed service evidence")
    assemble.add_argument("registry", type=Path)
    assemble.add_argument("journal", type=Path)
    assemble.add_argument("output", type=Path)
    seal = commands.add_parser("seal", help="Hash the seven observation files beside the manifest")
    seal.add_argument("output", type=Path)
    seal.add_argument("--run-id", required=True)
    seal.add_argument("--build-commit", required=True)
    seal.add_argument("--device-build", required=True)
    seal.add_argument("--environment", choices=["local", "staging"], default="local")
    # Local is always fixture-only. Selecting staging is an explicit
    # declaration by the operator, not authenticated provenance.
    role = commands.add_parser("sampler-role", help="Print the read-only MongoDB role definition")
    role.add_argument("database")
    args = parser.parse_args()
    try:
        if args.command == "sample":
            asyncio.run(journal_services(args.journal, run_id=args.run_id, api_instance=args.api_instance,
                                         count=args.count, interval=args.interval))
        elif args.command == "assemble-services":
            assemble_services(args.registry, args.journal, args.output)
        elif args.command == "seal":
            seal_bundle(args.output, run_id=args.run_id, environment=args.environment,
                        fixture_only=args.environment == "local", build_commit=args.build_commit,
                        device_build=args.device_build)
        else:
            print(json.dumps(sampler_role(args.database), indent=2))
    except (OSError, ValueError, RuntimeError):
        # Validation exceptions can include captured values. Keep stdout free
        # of mission content, service credentials and provider details.
        parser.exit(2, "Capture could not complete. Check evidence inputs, configuration and destination.\n")


if __name__ == "__main__":
    main()
