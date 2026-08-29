import { describe, expect, it } from "vitest";

import { PORTAL_META } from "../lib/staarwardd/portal-meta";
import { createPreviewPlan } from "../lib/staarwardd/planner";
import { organizeEvents } from "../lib/staarwardd/event-discovery";
import { nextGuardianHandoffState } from "../lib/staarwardd/guardian-handoff";
import { guardianReply, PORTAL_EXPERIENCES } from "../lib/staarwardd/experience";

describe("STAARWARDD native preview planner", () => {
  it("keeps the seven canonical native portal IDs, including Events", () => {
    expect(PORTAL_META.map((portal) => portal.id)).toEqual(["creativity", "work", "home", "wellbeing", "relationships", "events", "style"]);
  });

  it("creates deterministic cross-portal plans with all planning horizons", () => {
    const first = createPreviewPlan("Plan work, groceries, and a walk", "work");
    const second = createPreviewPlan("Plan work, groceries, and a walk", "work");
    expect(first).toEqual(second);
    expect(first.portals).toEqual(["work", "home", "wellbeing"]);
    expect(first.now.length).toBeGreaterThan(0);
    expect(first.today.length).toBeGreaterThan(0);
    expect(first.week.length).toBeGreaterThan(0);
  });

  it("routes event and community language to the canonical Events portal", () => {
    const plan = createPreviewPlan("Compare a community event and RSVP", "events");
    expect(plan.portals).toEqual(["events"]);
    expect(plan.sensitive).toBe(true);
    expect(plan.today[0].sensitive).toBe(true);
  });

  it("keeps sensitive work prepared rather than silently executable", () => {
    const plan = createPreviewPlan("Send an email and buy groceries", "work");
    expect(plan.sensitive).toBe(true);
    expect(plan.now[0].action).toBe("Review action");
  });

  it("keeps Guardian failures recoverable and does not leave the launch state ambiguous", () => {
    expect(nextGuardianHandoffState(false, false, false, false)).toBe("loading");
    expect(nextGuardianHandoffState(false, false, false, true)).toBe("delayed");
    expect(nextGuardianHandoffState(true, true, false, false)).toBe("ready");
    expect(nextGuardianHandoffState(true, false, true, false)).toBe("error");
  });

  it("filters and sorts organized Events preview data deterministically", () => {
    expect(organizeEvents("Wellbeing", "soonest").map((event) => event.category)).toEqual(["Wellbeing"]);
    expect(organizeEvents("All", "low-cost").slice(0, 2).map((event) => event.priceLabel)).toEqual(["Free", "Free"]);
    expect(organizeEvents("Nightlife", "soonest").map((event) => event.id)).toEqual(["night-studio"]);
  });

  it("gives each canonical portal a distinct immersive world and Guardian tone", () => {
    expect(Object.keys(PORTAL_EXPERIENCES)).toEqual(["creativity", "work", "home", "wellbeing", "relationships", "events", "style"]);
    expect(PORTAL_EXPERIENCES.creativity.keepsHorizons).toBe(false);
    expect(PORTAL_EXPERIENCES.work.keepsHorizons).toBe(true);
    expect(PORTAL_EXPERIENCES.wellbeing.dataState).toMatch(/No wearable/i);
    expect(PORTAL_EXPERIENCES.creativity.entryAction).toMatch(/spark/i);
    expect(PORTAL_EXPERIENCES.work.guardianState).toBe("pointing");
    expect(PORTAL_EXPERIENCES.style.guardianMood).toBe("stylish");
  });

  it("keeps Guardian text interaction contextual and preview-local", () => {
    expect(guardianReply("style", "I need a dinner look")).toMatch(/what is already yours/i);
    expect(guardianReply("home", "")).toMatch(/Connected-device state/i);
  });
});
