import assert from 'node:assert/strict';
import test from 'node:test';
import { guardianMissionClient, mergeMissionPages, missionProposal, optionalMissionTime } from '../src/guardian-missions.ts';

test('mission drafts validate text and timestamps before sending', () => {
  assert.equal(optionalMissionTime('  '), undefined);
  assert.equal(optionalMissionTime('2026-12-01T14:00:00-05:00'), '2026-12-01T19:00:00.000Z');
  for (const value of ['tomorrow', '2026-12-01T14:00', '2026-02-30T12:00Z']) {
    assert.throws(() => optionalMissionTime(value));
  }
  assert.throws(() => missionProposal({ objective: ' ', criteria: 'Ready', deadline: '' }, 'key-012345'));
  assert.deepEqual(missionProposal({ objective: ' Review ', criteria: ' Ready ', deadline: '' }, 'key-012345'), {
    objective: 'Review', success_criteria: 'Ready', idempotency_key: 'key-012345',
    budget_cad: 0, expires_at: undefined,
  });
});

test('older pages preserve order and replace overlapping missions', () => {
  const row = (mission_id, status) => ({ mission_id, status });
  assert.deepEqual(mergeMissionPages([row('a', 'queued'), row('b', 'queued')],
    [row('b', 'completed'), row('c', 'blocked')]), [
    row('a', 'queued'), row('b', 'completed'), row('c', 'blocked'),
  ]);
});

test('authenticated transport receives status filters, paging and mutation inputs', async () => {
  const calls = [];
  const client = guardianMissionClient(async (path, init) => {
    calls.push({ path, ...init });
    return Response.json({});
  });
  const signal = new AbortController().signal;
  await client.list('queued', 'page&cursor', signal);
  await client.summary(signal);
  await client.detail('a/b', signal);
  const draft = { objective: 'Review', criteria: 'Ready', deadline: '' };
  await client.propose(draft, 'stable-key', signal);
  await client.propose(draft, 'stable-key', signal);
  const mission = { mission_id: 'a/b', preview_digest: 'reviewed', available_actions: ['queue-preview'] };
  await client.action(mission, 'queue-preview', '2026-12-01T14:00-05:00', signal);
  assert.equal(calls[0].path, '/api/guardian/missions?limit=15&status=queued&after=page%26cursor');
  assert.equal(calls[1].path, '/api/guardian/missions/summary');
  assert.equal(calls[2].path, '/api/guardian/missions/a%2Fb');
  assert.equal(calls[3].body, calls[4].body);
  assert.equal(calls[5].path, '/api/guardian/missions/a%2Fb/queue-preview');
  assert.deepEqual(JSON.parse(calls[5].body), { proposal_digest: 'reviewed', run_at: '2026-12-01T19:00:00.000Z' });
  assert.ok(calls.every(call => call.signal === signal));
  assert.throws(() => client.action(mission, 'withdraw'), /no longer available/);
  assert.throws(() => client.action({ ...mission, preview_digest: '' }, 'queue-preview'), /Refresh the proposal/);
  assert.equal(calls.length, 6);
});

test('mission transport reports owner-action rejections and conflicts accurately', async () => {
  const mission = { mission_id: 'm1', available_actions: ['withdraw', 'cancel-pending', 'acknowledge-preview'] };
  for (const action of mission.available_actions) {
    const client = guardianMissionClient(async path => {
      assert.equal(path, '/api/guardian/missions/m1/' + action);
      return Response.json({ detail: 'changed' }, { status: 409 });
    });
    await assert.rejects(() => client.action(mission, action), /Refresh and review/);
  }
  const unauthorized = guardianMissionClient(async () => Response.json({}, { status: 401 }));
  await assert.rejects(() => unauthorized.summary(), /Sign in again/);
  const disabled = guardianMissionClient(async () =>
    Response.json({ detail: 'mission_preview_disabled' }, { status: 404 }));
  await assert.rejects(() => disabled.detail('m1'), /Preview execution is disabled/);
});
