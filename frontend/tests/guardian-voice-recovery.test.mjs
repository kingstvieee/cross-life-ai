import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canStartGuardianVoice, GUEST_GUARDIAN_WELCOME, guardianQuietOnDevice } from '../src/guardian-voice-policy.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const provider = read('../lib/staarwardd/audio-provider.tsx');
const hub = read('../components/staarwardd/world-hub.tsx');
const notifications = read('../components/staarwardd/guardian-notifications.tsx');

test('remote account quiet never becomes the device preference', () => {
  for (const [local, remote, effective] of [[false, false, false], [false, true, true], [true, false, true], [true, true, true]]) {
    assert.equal(guardianQuietOnDevice(local, remote), effective);
  }
  const policy = provider.slice(provider.indexOf('const setAccountSpeechQuiet ='), provider.indexOf('const clearFade'));
  assert.doesNotMatch(policy, /AsyncStorage|QUIET_KEY/);
  assert.match(notifications, /setAccountSpeechQuiet\(state.speechQuiet === true\)/);
  assert.doesNotMatch(notifications, /setSpeechQuiet\(true\)/);
  assert.match(provider, /accountQuietRef.current = false;\s*setAccountSpeechQuietState\(false\);\s*applyEffectiveQuiet\(localQuietRef.current\);/);
});

test('voice stays off before preference loading, outside foreground, with zero volume or either mute', () => {
  const allowed = { foreground: true, audioHydrated: true, master: true, voice: true, quiet: false, volume: 0.28 };
  assert.equal(canStartGuardianVoice(allowed), true);
  for (const disabled of [{ foreground: false }, { audioHydrated: false }, { master: false }, { voice: false }, { quiet: true }, { volume: 0 }]) {
    assert.equal(canStartGuardianVoice({ ...allowed, ...disabled }), false);
  }
});

test('guest welcome is a fixed explicit on-device feature with no account API or auto playback', () => {
  assert.match(GUEST_GUARDIAN_WELCOME, /Welcome to STAAR Hub/);
  const guest = provider.slice(provider.indexOf('const speakGuestWelcome'), provider.indexOf('const speak ='));
  assert.match(guest, /if \(\(user && !user.is_demo\) \|\| !canSpeakNow\(\)\) return false/);
  assert.match(guest, /playDeviceSpeech\(GUEST_GUARDIAN_WELCOME/);
  assert.doesNotMatch(guest, /api\(|\/api\/|playServerSpeech/);
  assert.match(provider, /if \(!user \|\| user.is_demo \|\| !canSpeakNow\(\)/);
  assert.match(hub, /if \(guest && !manual\) return;/);
  assert.match(hub, /if \(!manual\) return; \/\/ Automatic welcome never un-mutes/);
  assert.match(hub, /void greet\(true\)/);
  assert.match(hub, /function openSignIn\(destination\?: string\)[\s\S]*audio.stopSpeech\(\)[\s\S]*onSignIn\(destination\)/);
});

test('manual enable applies immediately, and ordinary voice respects system mute', () => {
  assert.match(provider, /const next = \{ \.\.\.settingsRef.current, \.\.\.patch \};\s*settingsRef.current = next;/);
  assert.match(provider, /playsInSilentMode: false, shouldPlayInBackground: false/);
  assert.match(read('../src/server-speech.ts'), /playsInSilentMode: false, shouldPlayInBackground: false/);
  assert.match(hub, /if \(audio.accountSpeechQuiet\) \{/);
});
