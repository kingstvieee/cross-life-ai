import assert from "node:assert/strict";
import test from "node:test";
import { initialGuardianSpeechState, transitionGuardianSpeech } from "../lib/staarwardd/guardian-speech-lifecycle.ts";

test("portal navigation never interrupts an active utterance", () => {
  const active = transitionGuardianSpeech(initialGuardianSpeechState, { type: "START", taskId: "task-1", utteranceId: "speech-1" });
  assert.equal(active.effect, "start-audio");
  const navigated = transitionGuardianSpeech(active.state, { type: "NAVIGATE", portalId: "staarsonic" });
  assert.deepEqual(navigated.state, active.state);
  assert.equal(navigated.effect, "none");
});

test("mute cancels speech and prevents further starts until unmuted", () => {
  const active = transitionGuardianSpeech(initialGuardianSpeechState, { type: "START", taskId: "task-1", utteranceId: "speech-1" });
  const muted = transitionGuardianSpeech(active.state, { type: "MUTE" });
  assert.equal(muted.effect, "cancel-audio");
  assert.equal(muted.state.phase, "muted");
  assert.equal(transitionGuardianSpeech(muted.state, { type: "START", taskId: "task-2", utteranceId: "speech-2" }).effect, "none");
  const unmuted = transitionGuardianSpeech(muted.state, { type: "UNMUTE" });
  assert.equal(unmuted.state.phase, "idle");
  assert.equal(transitionGuardianSpeech(unmuted.state, { type: "START", taskId: "task-2", utteranceId: "speech-2" }).effect, "start-audio");
});

test("completed tasks allow final speech to finish naturally", () => {
  const active = transitionGuardianSpeech(initialGuardianSpeechState, { type: "START", taskId: "task-1", utteranceId: "speech-1" });
  const done = transitionGuardianSpeech(active.state, { type: "TASK_COMPLETED", taskId: "task-1" });
  assert.equal(done.effect, "none");
  assert.equal(done.state.phase, "speaking");
  const ended = transitionGuardianSpeech(done.state, { type: "UTTERANCE_ENDED", utteranceId: "speech-1" });
  assert.equal(ended.state.phase, "idle");
});

test("stale callbacks and unrelated task completions are ignored", () => {
  const active = transitionGuardianSpeech(initialGuardianSpeechState, { type: "START", taskId: "task-1", utteranceId: "speech-1" });
  assert.deepEqual(transitionGuardianSpeech(active.state, { type: "UTTERANCE_ENDED", utteranceId: "old" }).state, active.state);
  assert.deepEqual(transitionGuardianSpeech(active.state, { type: "TASK_COMPLETED", taskId: "other" }).state, active.state);
});

test("explicit stop and revocation cancel active speech", () => {
  for (const type of ["STOP", "REVOKE"]) {
    const active = transitionGuardianSpeech(initialGuardianSpeechState, { type: "START", taskId: "task-1", utteranceId: "speech-1" });
    const stopped = transitionGuardianSpeech(active.state, { type });
    assert.equal(stopped.effect, "cancel-audio");
    assert.equal(stopped.state.phase, "idle");
    assert.equal(stopped.state.utteranceId, null);
  }
});
