import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isProactiveWelcomeTime } from '../src/guardian-greeting-policy.ts';

test('unsolicited Guardian welcome is silent before noon and after ten PM', () => {
  const at = (h, m = 0) => new Date(2026, 10, 15, h, m);
  for (const h of [0, 3, 8, 11, 22, 23]) assert.equal(isProactiveWelcomeTime(at(h)), false, String(h));
  for (const h of [12, 13, 18, 21]) assert.equal(isProactiveWelcomeTime(at(h)), true, String(h));
  assert.equal(isProactiveWelcomeTime(at(11, 59)), false);
  assert.equal(isProactiveWelcomeTime(at(12, 0)), true);
  assert.equal(isProactiveWelcomeTime(at(21, 59)), true);
  assert.equal(isProactiveWelcomeTime(at(22, 0)), false);
});

test('both first-launch and foreground-return automatic greeting paths enforce hour policy', () => {
  const hub = readFileSync(new URL('../components/staarwardd/world-hub.tsx', import.meta.url), 'utf8');
  assert.match(hub, /if \(!isProactiveWelcomeTime\(new Date\(\)\)\) return/);
  assert.match(hub, /if \(!focused\.current \|\| !isProactiveWelcomeTime\(new Date\(\)\) \|\| !preferenceReady/);
  assert.match(hub, /const greet = useCallback/);
  assert.match(hub, /onPress=\{\(\) => \{ void greet\(\); \}\}/);
  assert.match(hub, /serverPrivate \|\| serverSpeechQuiet/);
});
