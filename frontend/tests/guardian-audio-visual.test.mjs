import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('server transport marks speaking only after actual playback starts', () => {
  const transport = read('../src/server-speech.ts');
  assert.match(transport, /onStart\?: \(\) => void/);
  assert.match(transport, /transitionGuardianPlayback\(playback, status\)/);
  assert.match(transport, /options\.onStart\?\.\(\)/);
  assert.match(transport, /publish\(playback\.playing \? 'speaking' : 'loading'\)/);
  assert.match(transport, /options\.onPlaybackChange\?\.\(playback\.playing\)/);
});

test('Guardian avatar speaking state follows actual voice, not speech requests', () => {
  const provider = read('../lib/staarwardd/audio-provider.tsx');
  const hub = read('../components/staarwardd/world-hub.tsx');
  assert.match(provider, /voicePlaybackActive: boolean/);
  assert.match(provider, /onPlaybackChange: playing => \{/);
  assert.match(provider, /requestId===speechRequest\.current&&!speechQuietRef\.current/);
  assert.match(provider, /setVoicePlaybackActive\(playing\)/);
  assert.match(provider, /if\(!playing\)setGuardianAudioFrame\(null\)/);
  assert.match(provider, /onStart:\(\)=>\{if\(requestId===speechRequest\.current && !speechQuietRef\.current\)setVoicePlaybackActive\(true\)/);
  assert.match(provider, /setVoicePlaybackActive\(false\)/);
  assert.match(provider, /\[user\?\.user_id\]/);
  const scene = read('../components/staarwardd/world-scene.tsx');
  assert.match(hub, /<WorldScene world="hub" embedded onAction=/);
  assert.match(scene, /const allowed=audio.master&&audio.voice&&!audio.speechQuiet&&audio.voicePlaybackActive/);
  assert.match(scene, /guardianWireFrame\(allowed\?\(guardianAudioFrame\?\?audio.guardianAudioFrame\):null,session\)/);
  assert.match(hub, /audio\.voicePlaybackActive/);
  assert.match(scene, /audio\.voicePlaybackActive/);
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
  assert.match(transport, /let playback = \{ started: false, playing: false \}/);
  assert.match(transport, /if \(transition\.changed\)/);
  assert.match(transport, /playback = transition\.state/);
  assert.match(transport, /options\.onPlaybackChange\?\.\(playback\.playing\)/);
  assert.match(transport, /if \(status\.didJustFinish\)/);
  assert.match(provider, /onPlaybackChange: playing =>/);
  assert.match(provider, /setVoicePlaybackActive\(playing\)/);
});

test('Guardian voice stops on background and cannot narrate without native playback entitlement',()=>{
 const provider=read('../lib/staarwardd/audio-provider.tsx');
 assert.match(provider,/AppState\.addEventListener\('change', next =>/);
 assert.match(provider,/if \(next !== 'active'\) stopSpeech\(\)/);
 const config=read('../app.json');
 assert.match(config,/"enableBackgroundPlayback": false/);
 assert.match(config,/"enableBackgroundRecording": false/);
});
