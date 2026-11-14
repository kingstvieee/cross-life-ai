import assert from "node:assert/strict";
import { test } from "node:test";
import { launchDeadlineMs } from "../lib/staarwardd/launch-playback.ts";

test("a 20-second finale finishes before the launch deadline", () => {
  const master = 26.2 + 20;
  assert.ok(launchDeadlineMs(master) >= master * 1000 + 15000);
});
test("late or invalid metadata has a bounded fallback", () => {
  for (const duration of [0, -1, NaN, Infinity]) {
    assert.equal(launchDeadlineMs(duration), 60000);
  }
});
test("longer masters retain a full playback window", () => {
  assert.equal(launchDeadlineMs(90), 105000);
  assert.equal(launchDeadlineMs(29), 60000);
});
