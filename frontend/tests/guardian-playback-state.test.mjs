import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionGuardianPlayback } from '../src/guardian-playback-state.ts';

test('Guardian audio visuals follow start, pause, resume, finish in order', () => {
  let state = { started: false, playing: false };
  const idle = transitionGuardianPlayback(state, { playing: false });
  assert.deepEqual(idle, { state, startedNow: false, changed: false });
  const start = transitionGuardianPlayback(state, { playing: true });
  assert.deepEqual(start, { state: { started: true, playing: true }, startedNow: true, changed: true });
  state = start.state;
  const duplicate = transitionGuardianPlayback(state, { playing: true });
  assert.equal(duplicate.startedNow, false);
  assert.equal(duplicate.changed, false);
  const paused = transitionGuardianPlayback(state, { playing: false });
  assert.deepEqual(paused, { state: { started: true, playing: false }, startedNow: false, changed: true });
  const resume = transitionGuardianPlayback(paused.state, { playing: true });
  assert.deepEqual(resume, { state: { started: true, playing: true }, startedNow: false, changed: true });
  const done = transitionGuardianPlayback(resume.state, { playing: false, didJustFinish: true });
  assert.deepEqual(done, { state: { started: true, playing: false }, startedNow: false, changed: true });
});

test('Guardian fails silent on playback errors or early completion', () => {
  const idle = { started: false, playing: false };
  assert.equal(transitionGuardianPlayback(idle, { playing: true, error: 'failed' }).state.playing, false);
  assert.equal(transitionGuardianPlayback(idle, { playing: false, didJustFinish: true }).startedNow, false);
  assert.equal(transitionGuardianPlayback({ started: true, playing: true }, { playing: true, error: 'network' }).state.playing, false);
});
