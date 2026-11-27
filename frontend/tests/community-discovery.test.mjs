import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Community routes to real on-demand provider discovery, not the demo event fixture', () => {
  const route = read('../app/community-discovery.tsx');
  assert.match(read('../app/environment.tsx'), /button\('Toronto events', \(\) => router\.push\('\/community-discovery'/);
  assert.match(route, /api\('\/api\/community\/discovery\/toronto'/);
  assert.match(route, /body\.source !== 'ticketmaster_discovery'/);
  assert.match(route, /user && !user\.is_demo/);
  assert.doesNotMatch(route, /DEMO_EVENTS|organizeEvents|setInterval/);
});

test('provider errors clear previous listings and ticket links require explicit use', () => {
  const route = read('../app/community-discovery.tsx');
  assert.match(route, /setLast\(null\); setEvents\(\[\]\)/);
  assert.match(route, /Open event details on Ticketmaster/);
  assert.match(route, /includes\(url\.origin\)/);
  assert.match(route, /doesn’t book or guarantee tickets/);
});
