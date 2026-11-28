import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { followsMissionStatus, guardianMissionClient, mergeMissionPages, missionProposal, optionalMissionTime, updateMissionInPage } from '../src/guardian-missions.ts';

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

test('live mission details update the current page and respect its filter', () => {
  const queued = { mission_id: 'a', status: 'queued' };
  const completed = { mission_id: 'a', status: 'completed' };
  assert.equal(followsMissionStatus(queued.status), true);
  assert.equal(followsMissionStatus('retry_wait'), true);
  assert.equal(followsMissionStatus(completed.status), false);
  assert.equal(followsMissionStatus(undefined), false);
  assert.deepEqual(updateMissionInPage([queued], completed, ''), [completed]);
  assert.deepEqual(updateMissionInPage([queued], completed, 'queued'), []);
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
  assert.equal(calls[0].path, '/api/guardian/missions?limit=15&status=queued&after=page%26cursor&order=newest');
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

test('private search is normalized and retained across pagination and sort', async () => {
  const paths = [];
  const client = guardianMissionClient(async path => {
    paths.push(path);
    return Response.json({ missions: [], next_cursor: null });
  });
  await client.list('completed', undefined, undefined, '  CAD [quote]  ', 'oldest');
  await client.list('completed', 'next/1', undefined, '  CAD [quote]  ', 'oldest');
  assert.equal(paths[0], '/api/guardian/missions?limit=15&status=completed&search=CAD+%5Bquote%5D&order=oldest');
  assert.equal(paths[1], '/api/guardian/missions?limit=15&status=completed&after=next%2F1&search=CAD+%5Bquote%5D&order=oldest');
  assert.throws(() => client.list('', undefined, undefined, 'x'.repeat(121)), /120 characters/);
});


test('mission screen keeps search, empty-state and cancellation safeguards', () => {
  const screen = readFileSync(new URL('../app/guardian-missions.tsx', import.meta.url), 'utf8');
  assert.match(screen, /maxLength=\{120\}/);
  assert.match(screen, /if \(term === search\) \{\s*void perform\(reload\)/);
  assert.match(screen, /if \(search === ''\) \{\s*void perform\(reload\)/);
  assert.match(screen, /resultsLoaded && !busy && !notice && missions\.length === 0/);
  assert.match(screen, /accessibilityLiveRegion="polite"/);
  assert.match(screen, /missions displayed\{cursor \? '; more available' : ''\}/);
  assert.match(screen, /Search: \$\{search\}/);
  assert.match(screen, /Loading mission results/);
  assert.match(screen, /Retry loading missions/);
  assert.match(screen, /!resultsLoaded && !busy && !!notice/);
  assert.match(screen, /page\.next_cursor === cursor/);
  assert.match(screen, /Pagination stopped because the server repeated its cursor/);
  assert.match(screen, /request\.current\?\.abort\(\);\s*request\.current = null;\s*setBusy\(false\)/);
});

test('date range and derived proposal requests preserve mission ownership routing', async () => {
  const calls = [];
  const client = guardianMissionClient(async (path, init) => {
    calls.push({ path, ...init });
    return Response.json({});
  });
  await client.list('completed', 'page', undefined, '', 'oldest', {
    from: '2099-01-01T00:00:00Z', before: '2099-02-01T00:00:00Z',
  });
  const query = new URL(calls[0].path, 'https://example.test').searchParams;
  assert.equal(query.get('created_from'), '2099-01-01T00:00:00Z');
  assert.equal(query.get('created_before'), '2099-02-01T00:00:00Z');
  await client.propose({ objective: 'Review', criteria: 'Ready', deadline: '' }, 'stable-key', undefined,
    { id: 'source/1', operation: 'copy' });
  assert.equal(calls[1].path, '/api/guardian/missions/source%2F1/derive/copy');
  await client.action({ mission_id: 'source', not_before: '2099-01-01T00:00:00Z',
    available_actions: ['reschedule-preview'] }, 'reschedule-preview', '2099-01-02T00:00:00Z');
  assert.deepEqual(JSON.parse(calls[2].body), {
    expected_start: '2099-01-01T00:00:00Z', run_at: '2099-01-02T00:00:00.000Z',
  });
});

test('SH-307 labels the derivation and exposes only the source mission ID to the UI', async () => {
  const { missionDetailPresentation } = await import('../src/guardian-missions.ts');
  const mission = { status: 'proposed' };
  assert.equal(missionDetailPresentation(mission).origin, null);
  assert.deepEqual(missionDetailPresentation({ ...mission,
    derived_from: { mission_id: 'source', operation: 'copy' },
  }).origin, { id: 'source', label: 'Copied from an earlier mission' });
  assert.deepEqual(missionDetailPresentation({ ...mission,
    derived_from: { mission_id: 'source', operation: 'revise' },
  }).origin, { id: 'source', label: 'Revised from an earlier proposal' });
  assert.equal(missionDetailPresentation({ ...mission,
    derived_from: { mission_id: '', operation: 'copy' },
  }).origin, null);
});

test('SH-312 distinguishes disabled preview from expired and unknown, without granting actions', async () => {
  const { missionDetailPresentation } = await import('../src/guardian-missions.ts');
  const mission = { status: 'proposed', available_actions: ['revise'] };
  const display = options => missionDetailPresentation({ ...mission, ...options }).preview;
  assert.equal(display({ preview_readiness: 'disabled' }), 'Preview execution is disabled in this environment.');
  assert.equal(display({ preview_readiness: 'deadline_passed' }), 'The proposal deadline has passed. Revise the proposal before scheduling.');
  assert.equal(display({}), 'Preview scheduling is not available for this proposal.');
  assert.equal(display({ available_actions: ['queue-preview'] }), 'Ready to schedule a zero-cost preview.');
  assert.equal(display({ preview_readiness: 'available' }), 'Preview scheduling is not available for this proposal.');
  assert.equal(display({ status: 'queued', preview_readiness: 'available' }), null);
});

test('SH-321 verifies that missing, failed and passed evidence never look alike', async () => {
  const { missionDetailPresentation } = await import('../src/guardian-missions.ts');
  const display = evidence => missionDetailPresentation({ status: 'completed', evidence });
  assert.equal(display(undefined).verification, 'Not yet verified');
  assert.equal(display({ result_digest: 'digest-without-verdict' }).verification, 'Not yet verified');
  assert.equal(display({ passed: 'true' }).verification, 'Not yet verified');
  assert.equal(display({ passed: false }).verification, 'Verification failed');
  assert.equal(display({ passed: true }).verification, 'Verification passed');
  assert.equal(display({ passed: false, verified_at: 'not a date' }).verifiedAt, undefined);
  assert.equal(display({ passed: true, verified_at: '2026-11-28T00:00:00Z' }).verifiedAt, '2026-11-28T00:00:00Z');
});

test('mission detail screen displays and routes the three new presentation fields', () => {
  const source = readFileSync(new URL('../app/guardian-missions.tsx', import.meta.url), 'utf8');
  assert.match(source, /missionDetailPresentation\(selected\)/);
  assert.match(source, /selectedOrigin\.label/);
  assert.match(source, /openMission\(selectedOrigin\.id\)/);
  assert.match(source, /detailPresentation\?\.preview/);
  assert.match(source, /detailPresentation\?\.verification/);
});
