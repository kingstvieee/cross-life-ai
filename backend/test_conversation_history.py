import asyncio
from datetime import datetime, timezone
from conversation_history import load_history, save_turn, public_history

NOW = datetime.now(timezone.utc)

class Rows:
    def __init__(self): self.docs = []; self.query = None
    async def insert_one(self, row): self.docs.append(row)
    def find(self, query, projection): self.query = query; return self
    def sort(self, *args): return self
    def limit(self, n): return self
    async def to_list(self, length):
        return [r for r in reversed(self.docs) if all(r[k] > v['$gt'] if isinstance(v, dict) else r[k] == v for k,v in self.query.items())][:length]

def test_persona_switch_preserves_context_but_accounts_scopes_and_policies_do_not_mix():
    async def run():
        rows = Rows(); user = {'user_id': 'one'}
        await save_turn(rows, user, 'work', 'policy1', 'Keep the launch on Friday', 'Friday it is.', 'kaia', NOW)
        history = await load_history(rows, user, 'work', 'policy1', NOW)
        assert public_history(history)[0]['companion'] == 'kaia'
        assert 'Friday' in history[0]['message']
        assert await load_history(rows, {'user_id': 'two'}, 'work', 'policy1', NOW) == []
        assert await load_history(rows, user, 'home', 'policy1', NOW) == []
        assert await load_history(rows, user, 'work', 'revoked-policy', NOW) == []
        assert await load_history(rows, {**user, 'cross_life_paused': True}, 'work', 'policy1', NOW) == []
        assert await load_history(rows, {**user, 'is_demo': True}, 'work', 'policy1', NOW) == []
    asyncio.run(run())

def test_expiry_and_paused_storage():
    async def run():
        rows = Rows(); user = {'user_id': 'one'}
        await save_turn(rows, {**user, 'cross_life_paused': True}, None, 'p', 'private', 'reply', 'atlas', NOW)
        assert rows.docs == []
        await save_turn(rows, user, None, 'p', 'hello', 'reply', 'atlas', NOW)
        assert await load_history(rows, user, None, 'p', rows.docs[0]['expires_at']) == []
    asyncio.run(run())


def test_chat_endpoint_uses_shared_history_and_persists_only_verified_complete_reply():
    import ast
    import json
    from pathlib import Path
    from types import SimpleNamespace
    from typing import Optional, List
    import uuid
    from fastapi import Header, HTTPException

    rows = Rows(); account = {'user_id': 'one', 'companion': 'atlas'}
    captured = []
    class TextDelta:
        def __init__(self, content): self.content = content
    class StreamDone: pass
    class Model:
        def __init__(self, **kwargs): captured.append(kwargs['system_message'])
        def with_model(self, *args): return self
        async def stream_message(self, message):
            yield TextDelta('The Friday launch remains in our plan.')
            yield StreamDone()
    async def context(*args): return account, []
    async def current(*args): return account
    source = Path(__file__).with_name('server.py')
    tree = ast.parse(source.read_text())
    definitions = [n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'guardian_chat_once']
    for n in definitions: n.decorator_list = []
    namespace = dict(Optional=Optional, List=List, Header=Header, HTTPException=HTTPException, ChatIn=object,
        _context_for_dispatch=context, require_account_user=current, rate_limit=lambda *a: None,
        _context_policy_key=lambda u: 'policy', _companion_prompt=lambda *a: 'Atlas contract',
        utcnow=lambda: NOW, db=SimpleNamespace(companion_history=rows), load_history=load_history,
        save_turn=save_turn, public_history=public_history, json=json, uuid=uuid,
        LlmChat=Model, EMERGENT_LLM_KEY='test-only', TextDelta=TextDelta, StreamDone=StreamDone,
        UserMessage=lambda **kwargs: kwargs)
    exec(compile(ast.Module(body=definitions, type_ignores=[]), str(source), 'exec'), namespace)
    async def run():
        await save_turn(rows, account, 'work', 'policy', 'Launch on Friday', 'Agreed.', 'kaia', NOW)
        body = SimpleNamespace(message='What did Kaia plan?', portal='work', companion='atlas')
        result = await namespace['guardian_chat_once'](body, 'test-only')
        assert 'Friday' in captured[0] and 'kaia' in captured[0]
        assert result['reply'] == rows.docs[-1]['reply']
        assert rows.docs[-1]['companion'] == 'atlas'
        assert len(rows.docs) == 2
    asyncio.run(run())
