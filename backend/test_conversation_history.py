import asyncio
from datetime import datetime, timezone
from chat_turn import chat_turn, PrivacyChanged, EmptyReply
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


def test_chat_turn_uses_shared_history_and_persists_only_verified_complete_reply():
    rows = Rows()
    account = {"user_id": "one", "companion": "atlas"}
    captured: list[str] = []

    class TextDelta:
        def __init__(self, content): self.content = content

    class StreamDone: pass

    class Model:
        def __init__(self, **kwargs):
            captured.append(kwargs["system_message"])
        def with_model(self, *args): return self
        async def stream_message(self, message):
            yield TextDelta("The Friday launch remains in our plan.")
            yield StreamDone()

    async def current():
        return account

    async def run():
        await save_turn(rows, account, "work", "policy", "Launch on Friday", "Agreed.", "kaia", NOW)
        reply = await chat_turn(
            user=account,
            message="What did Kaia plan?",
            portal="work",
            companion="atlas",
            policy_key_of=lambda u: "policy",
            history_collection=rows,
            system_prompt="Atlas contract",
            signals=None,
            llm_factory=lambda system: Model(system_message=system),
            user_message_factory=lambda text: {"text": text},
            text_delta_type=TextDelta,
            stream_done_type=StreamDone,
            require_fresh_user=current,
            now=lambda: NOW,
        )
        assert "Friday" in captured[0] and "kaia" in captured[0]
        assert reply == rows.docs[-1]["reply"]
        assert rows.docs[-1]["companion"] == "atlas"
        assert len(rows.docs) == 2

    asyncio.run(run())


def test_privacy_and_empty_reply_failures_never_persist_history():
    import pytest

    class TextDelta:
        def __init__(self, content): self.content = content
    class StreamDone: pass

    async def scenario(*, before=None, after=None, reply="hello", provider_error=None):
        rows = Rows()
        account = {"user_id": "one", "policy": "original"}
        sent = []
        fresh_reads = iter([before or account, after or account])
        async def fresh(): return next(fresh_reads)
        class Model:
            async def stream_message(self, message):
                sent.append(message)
                if provider_error:
                    raise provider_error
                yield TextDelta(reply)
                yield StreamDone()
        arguments = dict(user=account, message="hello", portal="work", companion="atlas",
            policy_key_of=lambda u: u["policy"], history_collection=rows, system_prompt="contract",
            signals=[{"source": "authorized"}], llm_factory=lambda system: Model(),
            user_message_factory=lambda text: {"text": text}, text_delta_type=TextDelta,
            stream_done_type=StreamDone, require_fresh_user=fresh, now=lambda: NOW)
        return rows, sent, arguments

    async def run():
        rows, sent, args = await scenario(before={"user_id": "one", "policy": "revoked"})
        with pytest.raises(PrivacyChanged): await chat_turn(**args)
        assert sent == [] and rows.docs == []
        rows, sent, args = await scenario(after={"user_id": "one", "policy": "revoked"})
        with pytest.raises(PrivacyChanged): await chat_turn(**args)
        assert len(sent) == 1 and rows.docs == []
        rows, _, args = await scenario(after={"user_id": "two", "policy": "original"})
        with pytest.raises(PrivacyChanged): await chat_turn(**args)
        assert rows.docs == []
        rows, _, args = await scenario(reply=" \n ")
        with pytest.raises(EmptyReply): await chat_turn(**args)
        assert rows.docs == []
        rows, _, args = await scenario(provider_error=RuntimeError("provider unavailable"))
        with pytest.raises(RuntimeError): await chat_turn(**args)
        assert rows.docs == []
    asyncio.run(run())
