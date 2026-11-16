import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const components = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/staarwardd');
const boundary = readFileSync(path.join(components, 'startup-film.tsx'), 'utf8');
const nativePlayer = readFileSync(path.join(components, 'startup-film-player.tsx'), 'utf8');
const webPlayer = readFileSync(path.join(components, 'startup-film-player.web.tsx'), 'utf8');

test('native startup is sound-on by default, replay uses same state, and mute remains available', () => {
  assert.match(boundary, /WEB_REQUIRES_MUTED_AUTOPLAY = Platform\.OS === "web"/);
  assert.match(boundary, /useState\(WEB_REQUIRES_MUTED_AUTOPLAY\)/);
  assert.match(boundary, /setMuted\(WEB_REQUIRES_MUTED_AUTOPLAY\)/);
  assert.match(boundary, /setMuted\(value => !value\)/);
  assert.match(boundary, /accessibilityLabel=\{muted \? "Unmute startup film"/);
});

test('native player does not force the first frame muted; only approved original film is used', () => {
  assert.match(nativePlayer, /require\("@\/assets\/videos\/guardian-startup\.mp4"\)/);
  assert.match(nativePlayer, /p\.muted = approvedMusicAvailable \|\| muted/);
  assert.doesNotMatch(nativePlayer, /p\.muted = true/);
});

test('browser still has muted autoplay and explicit audible activation', () => {
  assert.match(webPlayer, /muted=\{muted\}/);
  assert.match(webPlayer, /autoPlay=\{playing\}/);
  assert.match(boundary, /Play with sound/);
});

test('native cinematic configures foreground sound before playback without microphone or background audio', () => {
  assert.match(nativePlayer, /import \{ setAudioModeAsync, useAudioPlayer \} from "expo-audio"/);
  assert.match(nativePlayer, /playsInSilentMode: true/);
  assert.match(nativePlayer, /shouldPlayInBackground: false/);
  assert.match(nativePlayer, /allowsRecording: false/);
  assert.match(nativePlayer, /if \(!audioSessionReady\) return/);
  assert.match(nativePlayer, /soundtrack\.muted = muted/);
  assert.match(nativePlayer, /if \(playing\) soundtrack\.play\(\)/);
  assert.match(nativePlayer, /soundtrack\.pause\(\)/);
  assert.match(nativePlayer, /setApprovedMusicFailed\(true\)/);
  assert.match(nativePlayer, /playbackStatusUpdate/);
  assert.match(nativePlayer, /if \(status\.error\)/);
  assert.match(nativePlayer, /subscription\.remove\(\)/);
  assert.ok(nativePlayer.indexOf("if (!audioSessionReady) return") < nativePlayer.lastIndexOf("player.play()"));
});
