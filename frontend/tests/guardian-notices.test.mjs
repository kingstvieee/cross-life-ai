import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyNoticeRead, guardianNoticeClient, mergeNoticePages, NoticeRequestError,
} from '../src/guardian-notices.ts';

test('inbox transport carries filters and checks receipts before returning', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const api = guardianNoticeClient(async (path, init) => {
    calls.push({ path, ...init });
    if (path.endsWith('/read')) return Response.json({ notice_id: 'a', read_at: '2026-11-21T23:00Z' });
    if (path.endsWith('/summary')) return Response.json({ unread: 1 });
    if (path.endsWith('/mission')) return Response.json({ mission_id: 'm1' });
    return Response.json({ notices: [], next_cursor: null });
  });
  await api.list(true, 'a&b', signal);
  assert.equal((await api.summary(signal)).unread, 1);
  assert.equal((await api.read('a', signal)).read_at, '2026-11-21T23:00Z');
  assert.equal((await api.mission('a', signal)).mission_id, 'm1');
  assert.equal(calls[0].path, '/api/guardian/notices?limit=25&unread=true&after=a%26b');
  assert.equal(calls[2].method, 'POST');
  assert.ok(calls.every(call => call.signal === signal));
});

test('duplicate pages preserve ordering and read receipts update only the matching notice', () => {
  const first = { notice_id: 'a', read_at: null };
  const second = { notice_id: 'b', read_at: null };
  const read = { ...first, read_at: '2026-11-21T23:00Z' };
  assert.deepEqual(mergeNoticePages([first, second], [read]), [read, second]);
  assert.deepEqual(applyNoticeRead([first, second], 'a', read.read_at, false), [read, second]);
  assert.deepEqual(applyNoticeRead([first, second], 'a', read.read_at, true), [second]);
});

test('stale cursors and missing missions carry distinct recovery details', async () => {
  const cursor = guardianNoticeClient(async () => Response.json({ detail: 'notice_cursor_not_found' }, { status: 404 }));
  await assert.rejects(() => cursor.list(false, 'expired'),
    error => error instanceof NoticeRequestError && error.detail === 'notice_cursor_not_found');
  const link = guardianNoticeClient(async () => Response.json({ detail: 'notice_mission_unavailable' }, { status: 404 }));
  await assert.rejects(() => link.mission('notice'), /mission for this notice is unavailable/);
  const unauthorized = guardianNoticeClient(async () => Response.json({}, { status: 401 }));
  await assert.rejects(() => unauthorized.summary(), /Sign in again/);
});
