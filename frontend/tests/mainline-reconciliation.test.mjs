import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hub = readFileSync(path.join(root, 'components/staarwardd/world-hub.tsx'), 'utf8');
const chat = readFileSync(path.join(root, 'app/chat.tsx'), 'utf8');
const presence = readFileSync(path.join(root, 'components/staarwardd/guardian-presence.tsx'), 'utf8');

test('latest mainline polish preserves release guardian server consent and owner control', () => {
  assert.match(hub, /setServerGreetingConsent\(/);
  assert.match(hub, /setServerConsentReady\(/);
  assert.match(hub, /serverPrivate \|\| serverSpeechQuiet/);
  assert.match(hub, /shouldRearmArrival/);
  assert.match(hub, /permitsArrivalTime/);
  assert.match(hub, /accountStorageKey\(/);
  assert.match(hub, /setArrivalComplete\(/);
  // Motion now lives in the 3D scene; the hub still waits for Reduce Motion before mounting it.
  assert.match(hub, /reduceMotion !== null/);
  assert.match(hub, /lockedPortalArtwork\[world\.id\]/);
});

test('mainline input safety and consent render guard kept', () => {
  assert.match(chat, /combined\.slice\(0, MAX_CHAT_CHARS\)/);
  assert.match(chat, /r\.status === 413 \|\| r\.status === 422/);
  assert.match(presence, /if \(alive\) setQuietMotion/);
});
