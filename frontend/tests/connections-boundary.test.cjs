const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'connections.tsx'), 'utf8');

test('external websites are not represented as authenticated tool connections', () => {
  assert.match(source, /External websites — not connected/);
  assert.match(source, /website shortcuts, not STAARWAARDD integrations/);
  assert.match(source, /External website · no API connection/);
  assert.doesNotMatch(source, />Open your tools<\/Text>/);
});

test('existing Home Assistant component remains mounted separately', () => {
  assert.match(source, /world === 'home' && <HomeConnection/);
});

test('external website launch does not claim provider authorization', () => {
  assert.match(source, /No account, data or tool permissions were connected/);
});
