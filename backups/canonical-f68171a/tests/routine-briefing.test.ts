import { describe, expect, it } from "vitest";

import { DEFAULT_MEMORY } from "../lib/staarwardd/preference-policy";
import { getRoutineBriefing } from "../lib/staarwardd/routine-briefing";

describe("getRoutineBriefing", () => {
  it("keeps the canonical seven-portal order and questions", () => {
    const briefing = getRoutineBriefing(DEFAULT_MEMORY);
    expect(briefing.questions.map((question) => question.id)).toEqual(["creativity", "work", "home", "wellbeing", "relationships", "events", "style"]);
    expect(briefing.narration).toContain("Creativity.");
    expect(briefing.narration).toContain("Events.");
  });

  it("uses only local consented routine details in the wording", () => {
    const briefing = getRoutineBriefing({ ...DEFAULT_MEMORY, consented: true, displayName: "  Sam ", preferredPortal: "home", preferredRoom: "Kitchen", preferredScene: "Quiet Reset", routineWindow: "Evening" });
    expect(briefing.heading).toBe("EVENING ROUTINE");
    expect(briefing.prompt).toBe("Your usual starting point is Home.");
    expect(briefing.narration).toContain("Welcome, Sam.");
    expect(briefing.narration).toContain("Kitchen reset");
    expect(briefing.narration).toContain("quiet reset");
  });
});
