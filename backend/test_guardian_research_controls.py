from datetime import datetime, timezone
import pytest
from guardian_workflow import proactive_decision, set_speech_quiet, set_proactive_consent
from test_guardian_reconciliation import leased_store, dispatch, run, WORKFLOW


def test_muted_proactive_speech_is_blocked():
    state = set_proactive_consent(None, WORKFLOW, greetings=True, check_ins=True)
    state = set_speech_quiet(state, WORKFLOW, quiet=True)
    for kind in ('greetings', 'checkIns'):
        result = proactive_decision(state, WORKFLOW, kind=kind, at=datetime(2026, 11, 15, 20, tzinfo=timezone.utc))
        assert result['allowed'] is False
        assert result['reason'] == 'speech_quiet'


def test_naive_trigger_time_is_rejected():
    with pytest.raises(ValueError, match='timezone_required'):
        proactive_decision(None, WORKFLOW, kind='greetings', at=datetime(2026, 11, 15, 20))


@pytest.mark.parametrize('iteration', range(100))
def test_revocation_between_queue_and_admission_blocks_admission(iteration):
    store = leased_store()
    dispatch(store, key=f'race-{iteration}')
    run(store.revoke_workflow_authority('user-a', WORKFLOW, reason='withdrawn'))
    with pytest.raises(ValueError, match='authority_revoked_or_stale'):
        run(store.authorize_workflow_send('user-a', WORKFLOW, idempotency_key=f'race-{iteration}'))


@pytest.mark.parametrize('iteration', range(100))
def test_restart_and_replay_keeps_one_outbox_operation(iteration):
    from guardian_store import GuardianStore
    from test_guardian_reconciliation import EXECUTE_GRANT, AUTH, DISPATCH_CONTEXT
    store = leased_store()
    key = f'replay-{iteration}'
    dispatch(store, key=key)
    reopened = GuardianStore(store.collection)
    for _ in range(3):
        run(reopened.dispatch_workflow('user-a', WORKFLOW, owner='worker-a', fence=1, action=EXECUTE_GRANT['action'], action_version=EXECUTE_GRANT['actionVersion'], action_hash=EXECUTE_GRANT['actionHash'], authority=AUTH, context=DISPATCH_CONTEXT, idempotency_key=key))
    state = run(reopened.mark_workflow_sent('user-a', WORKFLOW, idempotency_key=key))
    assert len(state['dispatches']) == 1
    assert len([item for item in state['outbox'] if item['idempotencyKey'] == key]) == 1
    with pytest.raises(ValueError, match='not_queued'):
        run(reopened.mark_workflow_sent('user-a', WORKFLOW, idempotency_key=key))


def test_already_sent_operation_remains_recordable_after_revocation():
    store = leased_store()
    dispatch(store, key='crossed-boundary')
    run(store.authorize_workflow_send('user-a', WORKFLOW, idempotency_key='crossed-boundary'))
    run(store.revoke_workflow_authority('user-a', WORKFLOW, reason='late withdrawal'))
    state = run(store.mark_workflow_sent('user-a', WORKFLOW, idempotency_key='crossed-boundary'))
    assert state['dispatches'][0]['state'] == 'sent'
