import { describe, expect, it } from "vitest";

import { getHubAwakeningGreeting } from "../lib/staarwardd/hub-greeting";

describe("getHubAwakeningGreeting", () => {
  it("uses the concise default Guardian greeting without a name", () => {
    expect(getHubAwakeningGreeting()).toBe("The field is awake. Where shall we begin?");
  });

  it("uses a trimmed consented display name", () => {
    expect(getHubAwakeningGreeting("  Sam  ")).toBe("The field is awake, Sam. Where shall we begin?");
  });
});
