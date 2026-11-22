"""Read-only service health observations for a staging evidence journal."""
import asyncio
from datetime import datetime, timedelta, timezone
import json
import os
from typing import Literal
from urllib.parse import urlsplit, urlunsplit

import httpx
from pydantic import AwareDatetime, ValidationError, model_validator
from pymongo.errors import PyMongoError

from guardian_staging_manifest import EvidenceModel, Observation, Role, Token

ROLES = ("api", "worker", "verifier", "relay", "consumer")
HEALTH_COLLECTIONS = ("guardian_service_health", "guardian_notice_relay_health", "guardian_notice_consumer_health")
FRESHNESS = timedelta(seconds=30)
PROBE_TIMEOUT = 5
MAX_API_BYTES = 4096


class Poll(EvidenceModel):
    instance: Token | None
    state: Literal["ready", "missing", "stale", "unavailable"]

    @model_validator(mode="after")
    def ready_requires_instance(self):
        if self.state == "ready" and self.instance is None:
            raise ValueError("A ready poll requires an observed instance")
        return self


class PollFrame(Observation):
    observed_at: AwareDatetime
    polls: dict[Role, Poll]

    @model_validator(mode="after")
    def require_all_roles(self):
        if set(self.polls) != set(ROLES):
            raise ValueError("A poll frame must report all five roles")
        return self


def api_probe_url(origin):
    if any(character.isspace() for character in origin):
        raise ValueError("The API origin cannot contain whitespace")
    base = urlsplit(origin)
    loopback = base.hostname in {"localhost", "127.0.0.1", "::1"}
    if (not base.hostname or base.username is not None or base.password is not None
            or base.query or base.fragment or base.path not in {"", "/"}
            or not (base.scheme == "https" or (base.scheme == "http" and loopback))):
        raise ValueError("Configure an HTTPS origin or a loopback HTTP origin")
    # Accessing port validates its shape, including range.
    _ = base.port
    return urlunsplit((base.scheme, base.netloc, "/api/", "", ""))


async def api_poll(api, url, instance):
    try:
        async with asyncio.timeout(PROBE_TIMEOUT):
            async with api.stream("GET", url, follow_redirects=False) as response:
                if response.status_code != 200:
                    return Poll(instance=instance, state="unavailable")
                body = bytearray()
                async for chunk in response.aiter_bytes(chunk_size=MAX_API_BYTES):
                    body.extend(chunk)
                    if len(body) > MAX_API_BYTES:
                        return Poll(instance=instance, state="unavailable")
            data = json.loads(body)
    except (httpx.HTTPError, TimeoutError, ValueError):
        return Poll(instance=instance, state="unavailable")
    ok = isinstance(data, dict) and data.get("app") == "STAAR Hub" and data.get("status") == "online"
    return Poll(instance=instance, state="ready" if ok else "unavailable")


async def health_poll(collection, query, *, instance_field):
    try:
        async with asyncio.timeout(PROBE_TIMEOUT):
            row = await collection.find_one(
                query, {instance_field: 1, "last_poll_at": 1},
                sort=[("last_poll_at", -1), ("_id", -1)], max_time_ms=PROBE_TIMEOUT * 1000,
            )
    except (PyMongoError, TimeoutError):
        return Poll(instance=None, state="unavailable")
    if not row or not isinstance(row.get(instance_field), str) or not isinstance(row.get("last_poll_at"), datetime):
        return Poll(instance=None, state="missing")
    observed = row["last_poll_at"]
    if observed.tzinfo is None:
        observed = observed.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - observed
    try:
        return Poll(instance=row[instance_field], state="ready" if timedelta(0) <= age < FRESHNESS else "stale")
    except ValidationError:
        return Poll(instance=None, state="missing")


async def capture_frame(db, api, *, run_id, api_url, api_instance):
    polls = await asyncio.gather(
        api_poll(api, api_url, api_instance),
        health_poll(db.guardian_service_health, {"role": "worker"}, instance_field="_id"),
        health_poll(db.guardian_service_health, {"role": "verifier"}, instance_field="_id"),
        health_poll(db.guardian_notice_relay_health, {"_id": "notice_relay"}, instance_field="instance"),
        health_poll(db.guardian_notice_consumer_health, {"_id": "notice_consumer"}, instance_field="instance"),
    )
    return PollFrame(run_id=run_id, observed_at=datetime.now(timezone.utc), polls=dict(zip(ROLES, polls)))


def sampling_config():
    if os.environ.get("GUARDIAN_STAGING_SAMPLE_ENABLED") != "true":
        raise ValueError("Staging sampling is disabled")
    uri = os.environ.get("GUARDIAN_STAGING_SAMPLE_MONGO_URL")
    database = os.environ.get("GUARDIAN_STAGING_SAMPLE_DB")
    origin = os.environ.get("GUARDIAN_STAGING_API_ORIGIN")
    if not uri or not database or not origin:
        raise ValueError("Supply a dedicated sampler URI, a staging database and an API origin")
    return uri, database, api_probe_url(origin)


def sampler_role(database):
    return {"createRole": "guardianStagingSampler", "roles": [], "privileges": [
        {"resource": {"db": database, "collection": name}, "actions": ["find"]}
        for name in HEALTH_COLLECTIONS
    ]}
