import { describe, expect, it } from "vitest";

import { evaluateHomeRoutine, prepareRoutineFromEvent, UNAVAILABLE_HOME_EVENT_ADAPTER, type HomeEventAdapter, type VerifiedHomeEvent } from "../lib/staarwardd/home-routines";

const now = new Date("2026-08-26T22:00:00.000Z");
const verifiedEvent: VerifiedHomeEvent = {
  id: "evt-1",
  provider: "home-assistant",
  label: "User-authorized routine signal",
  occurredAt: now.toISOString(),
  verified: true,
  context: { source: "user-created" },
};

describe("Manual-first Home routines", () => {
  it("previews Guest Arrival with approval, dignity, manual trigger, and expiry", () => {
    const result = evaluateHomeRoutine({ routineId: "guest-arrival", now });
    expect(result.lifecycle).toBe("approval-required");
    expect(result.interaction.policy.state).toBe("approval-required");
    expect(result.routine.guestMode).toBe(true);
    expect(result.sourceStatement).toContain("Manual trigger");
    expect(result.sourceStatement).toContain("No sensor");
    expect(result.sessionExpiresAt).toBe("2026-08-27T00:00:00.000Z");
    expect(result.routine.description).toContain("without identifying");
  });

  it("does not allow Guest Arrival auto-approval", () => {
    const result = evaluateHomeRoutine({ routineId: "guest-arrival", autoApproval: true, now });
    expect(result.routine.autoApprovalAllowed).toBe(false);
    expect(result.interaction.policy.state).toBe("approval-required");
  });

  it("keeps Room Handoff cancellable and manually overridable", () => {
    const cancelled = evaluateHomeRoutine({ routineId: "room-handoff", cancelled: true, now });
    const override = evaluateHomeRoutine({ routineId: "room-handoff", manualOverride: true, now });
    expect(cancelled.lifecycle).toBe("cancelled");
    expect(cancelled.interaction.policy.receipt.detail).toContain("No external action");
    expect(override.lifecycle).toBe("manual-override");
    expect(override.interaction.policy.state).toBe("denied");
  });

  it("allows only the low-risk Cinema Scene preview to use explicit auto-approval", () => {
    const preview = evaluateHomeRoutine({ routineId: "cinema-scene", autoApproval: true, now });
    const completed = evaluateHomeRoutine({ routineId: "cinema-scene", autoApproval: true, execution: "completed", now });
    expect(preview.routine.autoApprovalAllowed).toBe(true);
    expect(preview.interaction.policy.requiresApproval).toBe(false);
    expect(preview.interaction.policy.capability.status).toBe("simulated");
    expect(completed.lifecycle).toBe("completed");
    expect(completed.interaction.policy.receipt.detail).toContain("No external device");
  });

  it("provides an offline fallback instead of claiming an adapter connection", () => {
    const result = prepareRoutineFromEvent(UNAVAILABLE_HOME_EVENT_ADAPTER, "cinema-scene", verifiedEvent);
    expect(result.lifecycle).toBe("failed");
    expect(result.interaction.policy.state).toBe("failed");
    expect(result.offlineFallback).toContain("local preview");
    expect(result.interaction.policy.receipt.source).toBe("authorized-event");
  });

  it("uses a verified event only as context and never as identity or presence inference", () => {
    const readyAdapter: HomeEventAdapter = {
      provider: "home-assistant",
      status: "ready",
      prepare(event) { return { status: "prepared", event, reason: "Verified user-authorized context is available for a proposal." }; },
    };
    const result = prepareRoutineFromEvent(readyAdapter, "room-handoff", verifiedEvent);
    expect(result.interaction.policy.state).toBe("approval-required");
    expect(result.sourceStatement).toContain("no identity");
    expect(result.sourceStatement).toContain("no identity, face, guest, presence, or occupancy inference");
  });

  it("captures a failure receipt and manual fallback for any routine", () => {
    const result = evaluateHomeRoutine({ routineId: "cinema-scene", execution: "failed", failureDetail: "Speech is unavailable", now });
    expect(result.lifecycle).toBe("failed");
    expect(result.interaction.policy.receipt.failureDetail).toBe("Speech is unavailable");
    expect(result.interaction.policy.receipt.fallbackDetail).toContain("manual controls");
  });
});
