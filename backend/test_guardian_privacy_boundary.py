"""Exercise production functions directly, without network/provider credentials."""
import ast
import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import json
import logging
import os
from pathlib import Path
import secrets
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

import pytest
from fastapi import Header, HTTPException, Request
from fastapi.responses import Response

SOURCE = Path(__file__).with_name("server.py")
NAMES = {
    "_portal_share_allowed", "_authorized_portal_states", "_gather_signals",
    "_context_policy_key", "_context_for_dispatch", "_tts_cached_line", "get_tts",
    "auth_demo", "auth_session", "reseed_demo", "load_scenario", "cookie_session_boundary",
}


def production(**overrides):
    # Compile the actual production definitions, stripping only HTTP decorators.
    tree = ast.parse(SOURCE.read_text())
    definitions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in NAMES]
    for node in definitions:
        node.decorator_list = []
    namespace = dict(globals(), utcnow=lambda: datetime.now(timezone.utc),
                     SessionExchange=Any, ScenarioIn=Any,
                     PORTALS=[{"id": p} for p in ("work", "home", "wellbeing", "community")],
                     DEMO_EVENTS=[], logger=logging.getLogger("test"))
    namespace.update(overrides)
    exec(compile(ast.Module(body=definitions, type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace


def run(coro):
    return asyncio.run(coro)


def account(**patch):
    return {"user_id": "u", "portals_enabled": ["work", "home"],
            "portal_privacy": {"work": {"access": True, "share": True}},
            "cross_life_paused": False, **patch}


class Rows:
    def __init__(self, docs=()):
        self.docs = list(deepcopy(docs))
        self.reads = []

    async def find_one(self, query, projection=None):
        self.reads.append(query)
        return next((deepcopy(d) for d in self.docs if all(d.get(k) == v for k, v in query.items())), None)

    async def insert_one(self, doc):
        self.docs.append(deepcopy(doc))

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(deepcopy(update["$set"]))
                return


@pytest.mark.parametrize("patch", [
    {"cross_life_paused": True},
    {"portal_privacy": {}},
    {"portals_enabled": []},
    {"is_demo": True},
    {"portal_privacy": {"work": {"access": False, "share": True}}},
    {"portal_privacy": {"work": {"access": True, "share": False}}},
])
def test_production_privacy_denies_before_portal_read(patch):
    rows = Rows([{"user_id": "u", "portal": "work", "data": {"stress": 10}}])
    ns = production(db=SimpleNamespace(portal_state=rows))
    assert run(ns["_authorized_portal_states"](account(**patch))) == {}
    assert rows.reads == []


def test_authorized_source_yields_signal_and_private_source_does_not():
    rows = Rows([{"user_id": "u", "portal": "work", "data": {"stress": 10}}])
    ns = production(db=SimpleNamespace(portal_state=rows))
    result = run(ns["_gather_signals"]("u", account()))
    assert result[0]["sourcePortal"] == "work"
    assert "confidence" not in result[0]
    assert run(ns["_gather_signals"]("u", account(portal_privacy={}))) == []


def test_revocation_during_retrieval_blocks_provider_context():
    users = iter([account(), account(cross_life_paused=True)])

    async def auth(_):
        return next(users)

    rows = Rows()
    ns = production(db=SimpleNamespace(portal_state=rows), require_account_user=auth)
    with pytest.raises(HTTPException) as error:
        run(ns["_context_for_dispatch"]("Bearer u"))
    assert error.value.status_code == 409


def test_guest_creation_and_fixture_mutations_are_disabled(monkeypatch):
    monkeypatch.delenv("ENABLE_LEGACY_EMERGENT_AUTH", raising=False)

    async def auth(_):
        return account()

    ns = production(require_account_user=auth)
    for name, args in (("auth_demo", [None]), ("reseed_demo", [None]), ("load_scenario", [SimpleNamespace(scenario="morning"), None])):
        with pytest.raises(HTTPException) as error:
            run(ns[name](*args))
        assert error.value.status_code == 410
    with pytest.raises(HTTPException) as error:
        run(ns["auth_session"](SimpleNamespace(session_id="forged")))
    assert error.value.status_code == 503


@pytest.mark.parametrize("expiry", [None, datetime(2000, 1, 1, tzinfo=timezone.utc)])
def test_private_audio_without_live_expiry_is_denied(expiry):
    rows = Rows([{"key": "private", "visibility": "private", "expires_at": expiry, "audio": b"x"}])
    ns = production(db=SimpleNamespace(tts_cache=rows))
    with pytest.raises(HTTPException) as error:
        run(ns["get_tts"]("private"))
    assert error.value.status_code == 403


def test_expired_audio_rotates_and_isolates_users():
    content = hashlib.sha256(b"hello|onyx|1.0|tts-1|mp3").hexdigest()[:32]
    rows = Rows([{"key": "expired", "content_key": content, "private_user_id": "u", "visibility": "private",
                  "expires_at": datetime(2000, 1, 1, tzinfo=timezone.utc), "audio": b"old"}])

    class TTS:
        async def generate_speech(self, **_):
            return b"new"

    ns = production(db=SimpleNamespace(tts_cache=rows), _tts=lambda: TTS())
    a = run(ns["_tts_cached_line"]("hello", private_user_id="u"))
    b = run(ns["_tts_cached_line"]("hello", private_user_id="other"))
    assert a["url"] != b["url"]
    assert "expired" not in a["url"]
    assert run(ns["get_tts"](a["url"].split("/")[-1][:-4])).headers["cache-control"] == "private, no-store"


def test_coordination_does_not_simulate_device_state_writes():
    tree = ast.parse(SOURCE.read_text())
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name in ("coordinate_evening", "coordinate_morning"):
            calls = [n for n in ast.walk(node) if isinstance(n, ast.Call)]
            assert not any(isinstance(n.func, ast.Attribute) and n.func.attr == "update_one" for n in calls)

@pytest.mark.parametrize("origin", [None, "https://attacker.example.test"])
def test_cookie_mutations_require_configured_origin(origin):
    scope = {"type": "http", "method": "POST", "path": "/api/user/privacy", "headers": [(b"cookie", b"__Host-staar_session=test-token")]}
    if origin:
        scope["headers"].append((b"origin", origin.encode()))
    request = Request(scope)
    called = []

    async def next_handler(_):
        called.append(True)
        return Response("ok")

    ns = production(SESSION_COOKIE="__Host-staar_session", app_origin=lambda: "https://app.example.test")
    assert run(ns["cookie_session_boundary"](request, next_handler)).status_code == 403
    assert called == []


def test_cookie_auth_is_forwarded_only_for_exact_app_origin():
    request = Request({"type": "http", "method": "POST", "path": "/api/user/privacy",
                       "headers": [(b"cookie", b"__Host-staar_session=test-token"), (b"origin", b"https://app.example.test")]})

    async def next_handler(req):
        assert req.headers["authorization"] == "Bearer test-token"
        return Response("ok")

    ns = production(SESSION_COOKIE="__Host-staar_session", app_origin=lambda: "https://app.example.test")
    assert run(ns["cookie_session_boundary"](request, next_handler)).status_code == 200
