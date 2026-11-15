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

test('every declared provider URL is explicitly classified as a website shortcut', () => {
  const providers = fs.readFileSync(path.join(__dirname, '..', 'lib', 'staarwardd', 'connections.ts'), 'utf8');
  const urlCount = (providers.match(/url: 'https:\/\//g) || []).length;
  const typedCount = (providers.match(/kind: 'external-website'/g) || []).length - 1; // minus the type declaration
  assert.ok(urlCount > 0);
  assert.equal(typedCount, urlCount);
  assert.match(source, /tool.kind === 'external-website'/);
});

test('Guardian greeting consent cannot silently override mute or voice preferences', () => {
  const guardian = fs.readFileSync(path.join(__dirname, '..', 'app', 'guardian-tools.tsx'), 'utf8');
  assert.match(guardian, /proactive-consent/);
  assert.doesNotMatch(guardian, /if\(value\)audio\.update\(\{master:true,voice:true\}\)/);
  assert.match(guardian, /Enabling greetings never overrides your master audio/);
});
