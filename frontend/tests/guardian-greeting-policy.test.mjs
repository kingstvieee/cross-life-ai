import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeArrivalPreference, isProactiveWelcomeTime, permitsArrivalTime, makeArrivalCooldown } from '../src/guardian-greeting-policy.ts';

test('unsolicited Guardian welcome is silent before noon and after ten PM', () => {
  // Toronto is UTC-05 in November; constructor is independent of the CI machine timezone.
  const at = (h, m = 0) => new Date(`2026-11-15T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-05:00`);
  for (const h of [0, 3, 8, 11, 22, 23]) assert.equal(isProactiveWelcomeTime(at(h)), false, String(h));
  for (const h of [12, 13, 18, 21]) assert.equal(isProactiveWelcomeTime(at(h)), true, String(h));
  assert.equal(isProactiveWelcomeTime(at(11, 59)), false);
  assert.equal(isProactiveWelcomeTime(at(12, 0)), true);
  assert.equal(isProactiveWelcomeTime(at(21, 59)), true);
  assert.equal(isProactiveWelcomeTime(at(22, 0)), false);
});

test('first launch respects arrival preference, foreground return keeps protected hours', () => {
  const hub = readFileSync(new URL('../components/staarwardd/world-hub.tsx', import.meta.url), 'utf8');
  assert.match(hub, /if \(!isProactiveWelcomeTime\(new Date\(\)\)\) return/);
  assert.match(hub, /if \(!focused\.current \|\| !appActive \|\| !permitsArrivalTime\(new Date\(\), arrivalPreference\) \|\| !preferenceReady/);
  assert.match(hub, /setAppActive\(state === 'active'\)/);
  assert.match(hub, /if \(!focused\.current \|\| AppState\.currentState !== 'active'\) return/);
  assert.match(hub, /const greet = useCallback/);
  assert.match(hub, /onPress=\{\(\) => \{ void greet\(true\); \}\}/);
  assert.match(hub, /serverPrivate \|\| serverSpeechQuiet/);
});

test('Toronto quiet hours remain correct during travel and daylight saving time', () => {
  assert.equal(isProactiveWelcomeTime(new Date('2026-07-01T15:59:00Z')), false); // 11:59 Toronto summer
  assert.equal(isProactiveWelcomeTime(new Date('2026-07-01T16:00:00Z')), true);
  assert.equal(isProactiveWelcomeTime(new Date('2026-11-15T17:00:00Z')), true); // noon in winter
  assert.equal(isProactiveWelcomeTime(new Date('invalid')), false);
});

test('only a new deliberate foreground-arrival opt-in can allow an out-of-hours welcome', () => {
  const overnight = new Date('2026-11-27T03:00:00-05:00');
  for (const value of [null, 'disabled', 'unexpected', 'enabled']) {
    assert.equal(permitsArrivalTime(overnight, decodeArrivalPreference(value)), false);
  }
  assert.equal(permitsArrivalTime(overnight, decodeArrivalPreference('arrival-on-entry')), true);
  assert.equal(permitsArrivalTime(new Date('invalid'), 'on-entry'), false);
  assert.equal(permitsArrivalTime(new Date('2026-11-27T13:00:00-05:00'), 'off'), false);
});

test('arrival cooldown rejects remount and rapid duplicate deliveries without persisting identity', () => {
  const claim = makeArrivalCooldown();
  assert.equal(claim('account-a', 100), true);
  assert.equal(claim('account-a', 101), false);
  assert.equal(claim('account-a', 20 * 60 * 1000 + 100), true);
  assert.equal(claim('account-b', 20 * 60 * 1000 + 101), true);
  assert.equal(claim('account-b', Number.NaN), false);
  assert.equal(claim('', 20 * 60 * 1000 + 102), false);
});

test('arrival voice requires current account consent and cannot implicitly unmute or activate the microphone', () => {
  const hub = readFileSync(new URL('../components/staarwardd/world-hub.tsx', import.meta.url), 'utf8');
  const automatic = hub.slice(hub.indexOf('if (!focused.current || !appActive'), hub.indexOf('const setGreeting'));
  assert.match(automatic, /preferenceOwner !== greetingKey \|\| consentOwner !== greetingKey/);
  assert.match(automatic, /audio\.accountSpeechQuiet \|\| AppState\.currentState !== 'active'/);
  assert.match(automatic, /!audio\.master \|\| !audio\.voice \|\| audio\.speechQuiet/);
  assert.match(automatic, /serverPrivate \|\| serverSpeechQuiet/);
  assert.doesNotMatch(automatic, /speakGuestWelcome|startRecording|setSpeechQuiet/);
  assert.match(hub, /Alert\.alert\('Arrival voice'/);
  assert.match(hub, /if \(enabled && explicitlyEnableDeviceVoice\)/);
  assert.match(hub, /Enable arrival and device voice/);
  assert.match(hub, /onPress: \(\) => \{ if \(accountStillMatches\(\)\) setGreeting\(true, deviceIsSilent\); \}/);
});
