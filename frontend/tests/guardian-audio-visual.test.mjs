import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('server transport marks speaking only after actual playback starts', () => {
  const transport = read('../src/server-speech.ts');
  assert.match(transport, /onStart\?: \(\) => void/);
  assert.match(transport, /if \(status\.playing && !started\)/);
  assert.match(transport, /options\.onStart\?\.\(\)/);
  assert.match(transport, /publish\(currentlyPlaying \? 'speaking' : 'loading'\)/);
  assert.match(transport, /options\.onPlaybackChange\?\.\(currentlyPlaying\)/);
});

test('Guardian avatar speaking state follows actual voice, not speech requests', () => {
  const provider = read('../lib/staarwardd/audio-provider.tsx');
  const hub = read('../components/staarwardd/world-hub.tsx');
  assert.match(provider, /voicePlaybackActive: boolean/);
  assert.match(provider, /onPlaybackChange: playing => \{ if \(requestId === speechRequest\.current && !speechQuietRef\.current\) setVoicePlaybackActive\(playing\)/);
  assert.match(provider, /onStart:\(\)=>\{if\(requestId===speechRequest\.current && !speechQuietRef\.current\)setVoicePlaybackActive\(true\)/);
  assert.match(provider, /setVoicePlaybackActive\(false\)/);
  assert.match(provider, /\[user\?\.user_id\]/);
  assert.match(hub, /<GuardianCharacter state=\{audio\.voicePlaybackActive \? 'speaking' : guardianState\}/);
  assert.match(hub, /GUARDIAN PREPARING VOICE/);
  assert.match(hub, /audio\.voicePlaybackActive \? 'GUARDIAN SPEAKING'/);
  assert.doesNotMatch(hub, /setGuardianState\('speaking'\); setGuardianSpeaking\(true\)/);
});

test('explicit stop and mute cannot keep audio-active visual state', () => {
  const provider = read('../lib/staarwardd/audio-provider.tsx');
  const stop = provider.slice(provider.indexOf('const stopSpeech ='), provider.indexOf('const stopAll ='));
  const quiet = provider.slice(provider.indexOf('const setSpeechQuiet ='), provider.indexOf('// Each world'));
  assert.match(stop, /setVoicePlaybackActive\(false\)/);
  assert.match(quiet, /setVoicePlaybackActive\(false\)/);
});

test('paused or buffering server audio suspends speaking animation until playback resumes', () => {
  const transport = read('../src/server-speech.ts');
  const provider = read('../lib/staarwardd/audio-provider.tsx');
  assert.match(transport, /let currentlyPlaying = false/);
  assert.match(transport, /if \(started && status\.playing !== currentlyPlaying\)/);
  assert.match(transport, /currentlyPlaying = status\.playing/);
  assert.match(transport, /options\.onPlaybackChange\?\.\(false\)/);
  assert.match(transport, /if \(status\.didJustFinish\)/);
  assert.match(provider, /onPlaybackChange: playing =>/);
  assert.match(provider, /setVoicePlaybackActive\(playing\)/);
});
