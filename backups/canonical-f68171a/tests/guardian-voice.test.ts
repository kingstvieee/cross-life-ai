import { describe, expect, it } from "vitest";

import { UNAVAILABLE_HOME_CAPABILITY, evaluateGuardianRequest } from "../lib/staarwardd/guardian-policy";
import { buildGuardianVoiceResponse, hasProhibitedGuardianTone, modeForGuardianState, type GuardianVoiceMode } from "../lib/staarwardd/guardian-voice";
import { getHubAwakeningGreeting } from "../lib/staarwardd/hub-greeting";

describe("Guardian voice system", () => {
  const requestedAt = "2026-08-26T21:35:00.000Z";
  const prepared = evaluateGuardianRequest({ portalId: "work", action: "Prepare a local focus plan", requestedAt });

  it("preserves the approved post-awakening line exactly", () => {
    expect(getHubAwakeningGreeting()).toBe("The field is awake. Where shall we begin?");
  });

  it("builds every named voice mode deterministically", () => {
    const modes: GuardianVoiceMode[] = ["ARRIVAL", "GUIDE", "CAUTION", "RECOVERY", "CELEBRATION", "SILENT/PASSIVE"];
    for (const mode of modes) {
      const response = buildGuardianVoiceResponse({ portalId: "work", policy: prepared, mode, requestLabel: "Prepare a focus plan" });
      expect(response.mode).toBe(mode);
      expect(response.speak).toBe(mode !== "SILENT/PASSIVE");
      expect(response.text === "").toBe(mode === "SILENT/PASSIVE");
    }
  });

  it("keeps the acknowledge, verified context, recommendation, reason, and permission sequence visible", () => {
    const response = buildGuardianVoiceResponse({ portalId: "work", policy: prepared, mode: "GUIDE", requestLabel: "Prepare a focus plan" });
    expect(response.acknowledgement.length).toBeGreaterThan(0);
    expect(response.verifiedContext).toBe(prepared.reason);
    expect(response.recommendation).toBe(prepared.recommendation);
    expect(response.rationale).toContain("verified local preview");
    expect(response.permission).toBe(prepared.nextStep);
    expect(response.text).toContain(response.acknowledgement);
    expect(response.text).toContain(response.permission);
  });

  it("uses state-aligned modes for caution, recovery, and celebration", () => {
    const approval = evaluateGuardianRequest({ portalId: "home", action: "Lock the front door", requestedAt });
    const unavailable = evaluateGuardianRequest({ portalId: "home", action: "Prepare a cinema scene", capability: UNAVAILABLE_HOME_CAPABILITY, requestedAt });
    const completed = evaluateGuardianRequest({ portalId: "work", action: "Mark local focus plan reviewed", execution: "completed", requestedAt });
    expect(modeForGuardianState(approval.state)).toBe("CAUTION");
    expect(modeForGuardianState(unavailable.state)).toBe("RECOVERY");
    expect(modeForGuardianState(completed.state)).toBe("CELEBRATION");
  });

  it("varies concise portal vocabulary without changing the verified policy boundary", () => {
    const first = buildGuardianVoiceResponse({ portalId: "work", policy: prepared, mode: "GUIDE", requestLabel: "Prepare a focus plan" });
    const second = buildGuardianVoiceResponse({ portalId: "events", policy: prepared, mode: "GUIDE", requestLabel: "Prepare an event outline" });
    expect(first.text).not.toBe(second.text);
    expect(first.verifiedContext).toBe(second.verifiedContext);
    expect(first.text).toContain("Work stays in local preview");
    expect(second.text).toContain("Events stays in local preview");
  });

  it("rejects pressure, urgency, and mystical command language", () => {
    const response = buildGuardianVoiceResponse({ portalId: "events", policy: prepared, mode: "GUIDE", requestLabel: "Prepare a plan" });
    expect(hasProhibitedGuardianTone(response.text)).toBe(false);
    expect(hasProhibitedGuardianTone("You are chosen; obey your destiny now.")).toBe(true);
    expect(hasProhibitedGuardianTone("You must hurry before it is too late.")).toBe(true);
  });

  it("keeps unavailable Home voice truthful and manual-first", () => {
    const unavailable = evaluateGuardianRequest({ portalId: "home", action: "Prepare a cinema scene", capability: UNAVAILABLE_HOME_CAPABILITY, requestedAt });
    const response = buildGuardianVoiceResponse({ portalId: "home", policy: unavailable, mode: "RECOVERY" });
    expect(response.text).toContain("not available");
    expect(response.text).toContain("Home remains manual-first");
  });
});


describe("Guardian voice supervision safeguards", () => {
  const policy = evaluateGuardianRequest({ portalId: "home", action: "Prepare a cinema scene", capability: UNAVAILABLE_HOME_CAPABILITY, requestedAt: "2026-08-26T21:36:00.000Z" });

  it("keeps every rendered mode free of prohibited pressure language", () => {
    const modes: GuardianVoiceMode[] = ["ARRIVAL", "GUIDE", "CAUTION", "RECOVERY", "CELEBRATION"];
    for (const mode of modes) {
      const response = buildGuardianVoiceResponse({ portalId: "home", policy, mode, requestLabel: "Prepare a cinema scene" });
      expect(response.speak).toBe(true);
      expect(response.text.length).toBeGreaterThan(0);
      expect(hasProhibitedGuardianTone(response.text)).toBe(false);
      expect(response.text).toContain("Home remains manual-first");
    }
  });

  it("keeps silent/passive output visually empty and non-spoken", () => {
    const response = buildGuardianVoiceResponse({ portalId: "home", policy, mode: "SILENT/PASSIVE" });
    expect(response.text).toBe("");
    expect(response.speak).toBe(false);
  });
});
