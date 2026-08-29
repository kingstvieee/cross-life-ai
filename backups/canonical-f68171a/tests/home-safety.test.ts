import { describe, expect, it } from "vitest";

import { canPresentProactiveAlert, DEFAULT_SAFETY_PREFERENCES, DEMO_FINDINGS, needsApproval } from "../lib/staarwardd/home-safety";

describe("Home Safety Guardian policy", () => {
  it("keeps proactive safety review disabled until explicit consent", () => {
    expect(canPresentProactiveAlert({ ...DEFAULT_SAFETY_PREFERENCES, proactiveInAppAlerts: true })).toBe(false);
  });

  it("suppresses non-critical proactive review during quiet hours", () => {
    expect(canPresentProactiveAlert({ ...DEFAULT_SAFETY_PREFERENCES, consented: true, proactiveInAppAlerts: true, quietHours: true })).toBe(false);
  });

  it("requires approval for urgent and high-impact safety remediation", () => {
    expect(needsApproval(DEMO_FINDINGS[0])).toBe(true);
    expect(needsApproval(DEMO_FINDINGS[2])).toBe(true);
  });
});
