import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../components/staarwardd/provider-connections.tsx', import.meta.url), 'utf8');

test('calendar events show a provider attribution only after a successful read', () => {
  assert.match(code, /const \[eventsProvider, setEventsProvider\] = useState<string \| null>\(null\)/);
  assert.match(code, /setEventsProvider\(p.id\)/);
  assert.match(code, /Showing read-only events from/);
});

test('calendar event attribution clears on user switch, inactive app and disconnect', () => {
  assert.match(code, /setProviders\(\[\]\); setEvents\(\[\]\); setEventsProvider\(null\)/);
  assert.match(code, /setEvents\(\[\]\); setEventsProvider\(null\); setBusy\(false\)/);
  assert.match(code, /setEvents\(\[\]\); setEventsProvider\(null\); setFlow\(null\); await load\(\)/);
});

test('calendar integration exposes read-only display without silent calendar modification', () => {
  assert.match(code, /Read the next seven days on demand/);
  assert.match(code, /No changes have been made/);
  assert.doesNotMatch(code, /api\('\/api\/connections.*method: 'PUT'/);
});

test('live calendar verification must succeed before UI claims connected', () => {
  assert.match(code, /Verify and finish calendar connection/);
  assert.match(code, /verified\.readback_verified !== true \|\| verified\.connected !== true/);
  assert.match(code, /Verified read-only calendar connection/);
  assert.match(code, /Connection was not completed/);
  assert.doesNotMatch(code, /setMessage\('Calendar account connected\. Choose Refresh/);
});

test('revoked calendar credentials never remain visually connected', () => {
  assert.match(code, /reconnect_required\?: boolean/);
  assert.match(code, /p\.reconnect_required \? 'Connection expired or revoked/);
  assert.match(code, /Provider calendar access expired or was revoked\. Reconnect your account/);
  assert.match(code, /catch \(error\) \{ await load\(\); throw error; \}/);
  assert.match(code, /Calendar access verified on connection/);
});
