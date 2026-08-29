import { describe, expect, it } from "vitest";

import { canAutoApplyInApp, DEFAULT_MEMORY, describeMemory } from "../lib/staarwardd/preference-policy";

describe("STAARWARDD preference memory policy", () => {
  it("does not auto-apply any setting before explicit consent", () => {
    expect(canAutoApplyInApp({ ...DEFAULT_MEMORY, preferredScene: "Cinema", autoApplyInApp: true })).toBe(false);
  });

  it("allows only opted-in in-app preference preparation", () => {
    expect(canAutoApplyInApp({ ...DEFAULT_MEMORY, consented: true, autoApplyInApp: true, preferredPortal: "home" })).toBe(true);
  });

  it("creates a human-readable local preference summary", () => {
    expect(describeMemory({ ...DEFAULT_MEMORY, consented: true, preferredRoom: "Living Room", preferredScene: "Cinema", routineWindow: "Evening" })).toBe("Living Room · Cinema · Evening");
  });
});
