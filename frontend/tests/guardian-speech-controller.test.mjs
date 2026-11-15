import assert from "node:assert/strict";
import test from "node:test";
import { createGuardianSpeechController } from "../lib/staarwardd/guardian-speech-controller.ts";

test("navigation leaves live transport uninterrupted", async () => {
  const calls = [];
  const c = createGuardianSpeechController({
    start: id => { calls.push("start:" + id); },
    cancel: () => { calls.push("cancel"); },
  });
  await c.dispatch({ type: "START", taskId: "one", utteranceId: "a" });
  await c.dispatch({ type: "NAVIGATE", portalId: "work" });
  assert.deepEqual(calls, ["start:a"]);
  assert.equal(c.snapshot().phase, "speaking");
});

test("replacing speech cancels old transport before starting new audio", async () => {
  const calls = [];
  const c = createGuardianSpeechController({
    start: id => { calls.push("start:" + id); },
    cancel: () => { calls.push("cancel"); },
  });
  await c.dispatch({ type: "START", taskId: "one", utteranceId: "a" });
  await c.dispatch({ type: "START", taskId: "two", utteranceId: "b" });
  assert.deepEqual(calls, ["start:a", "cancel", "start:b"]);
});

test("mute cancels transport and blocks playback", async () => {
  const calls = [];
  const c = createGuardianSpeechController({
    start: id => { calls.push("start:" + id); },
    cancel: () => { calls.push("cancel"); },
  });
  await c.dispatch({ type: "START", taskId: "one", utteranceId: "a" });
  await c.dispatch({ type: "MUTE" });
  await c.dispatch({ type: "START", taskId: "two", utteranceId: "b" });
  assert.deepEqual(calls, ["start:a", "cancel"]);
  assert.equal(c.snapshot().muted, true);
});

test("revocation while replacement is waiting prevents stale start", async () => {
  const calls = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const c = createGuardianSpeechController({
    start: id => { calls.push("start:" + id); },
    cancel: async () => { calls.push("cancel"); await gate; },
  });
  await c.dispatch({ type: "START", taskId: "one", utteranceId: "a" });
  const replacing = c.dispatch({ type: "START", taskId: "two", utteranceId: "b" });
  const revoking = c.dispatch({ type: "REVOKE" });
  release();
  await Promise.all([replacing, revoking]);
  assert.deepEqual(calls, ["start:a", "cancel", "cancel"]);
  assert.equal(c.snapshot().phase, "idle");
});
