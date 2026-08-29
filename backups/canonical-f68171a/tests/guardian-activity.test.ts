import { describe, expect, it } from "vitest";

import { clearGuardianReceipts, GUARDIAN_RECEIPTS_STORAGE_KEY, nextGuardianReceipts, shouldClearGuardianReceipts, shouldPersistGuardianReceipts } from "../lib/staarwardd/guardian-activity-policy";
import { DEFAULT_MEMORY } from "../lib/staarwardd/preference-policy";
import type { GuardianReceipt } from "../lib/staarwardd/guardian-policy";

const receipt = (id: string): GuardianReceipt => ({
  id,
  time: "2026-08-26T21:40:00.000Z",
  source: "manual",
  trigger: "Test trigger",
  reason: "Test reason",
  requestedAction: "Test action",
  approvalState: "not-needed",
  outcome: "prepared",
  detail: "Test detail",
  persisted: false,
});

describe("Guardian activity receipt history", () => {
  it("requires both local-memory consent and the explicit activity-history setting before persistence", () => {
    expect(shouldPersistGuardianReceipts(DEFAULT_MEMORY)).toBe(false);
    expect(shouldPersistGuardianReceipts({ ...DEFAULT_MEMORY, consented: true })).toBe(false);
    expect(shouldPersistGuardianReceipts({ ...DEFAULT_MEMORY, consented: true, activityHistoryEnabled: true })).toBe(true);
  });

  it("keeps visible receipts ordered, bounded, and editable by receipt id", () => {
    const first = nextGuardianReceipts([], receipt("one"));
    const second = nextGuardianReceipts(first, receipt("two"));
    const replaced = nextGuardianReceipts(second, { ...receipt("one"), outcome: "completed" });
    expect(second.map((item) => item.id)).toEqual(["two", "one"]);
    expect(replaced.map((item) => item.id)).toEqual(["one", "two"]);
    expect(replaced[0].outcome).toBe("completed");
  });

  it("does not turn a session-only receipt into retained history without permission", () => {
    const sessionReceipt = { ...receipt("session"), persisted: false };
    expect(shouldPersistGuardianReceipts({ ...DEFAULT_MEMORY, consented: true, activityHistoryEnabled: false })).toBe(false);
    expect(sessionReceipt.persisted).toBe(false);
  });

  it("clears retained receipt state when either opt-in is revoked after it was enabled", () => {
    const enabled = { ...DEFAULT_MEMORY, consented: true, activityHistoryEnabled: true };
    const memoryRevoked = { ...enabled, consented: false };
    const historyRevoked = { ...enabled, activityHistoryEnabled: false };
    expect(shouldPersistGuardianReceipts(enabled)).toBe(true);
    expect(shouldClearGuardianReceipts(memoryRevoked)).toBe(true);
    expect(shouldClearGuardianReceipts(historyRevoked)).toBe(true);
  });

  it("clears only Guardian receipts and exposes one dedicated storage key", () => {
    const existing = [receipt("one"), receipt("two")];
    const unrelated = { theme: "night", preferredPortal: "work" };
    expect(clearGuardianReceipts()).toEqual([]);
    expect(existing).toHaveLength(2);
    expect(unrelated).toEqual({ theme: "night", preferredPortal: "work" });
    expect(GUARDIAN_RECEIPTS_STORAGE_KEY).toBe("staarwardd.v13.guardian-receipts");
  });
});
