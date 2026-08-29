import { describe, expect, it } from "vitest";

import {
  GUARDIAN_CONSTITUTION,
  LOCAL_PREVIEW,
  UNAVAILABLE_HOME_CAPABILITY,
  evaluateGuardianRequest,
  formatGuardianReceipt,
} from "../lib/staarwardd/guardian-policy";

describe("Guardian Constitution policy engine", () => {
  const requestedAt = "2026-08-26T21:30:00.000Z";

  it("exposes a reusable Constitution instead of scattered component-only rules", () => {
    expect(GUARDIAN_CONSTITUTION.service).toContain("Advise");
    expect(GUARDIAN_CONSTITUTION.guestDignity).toContain("Never identify");
    expect(GUARDIAN_CONSTITUTION.safeDegradation).toContain("manual control");
  });

  it("returns suggested when no action has been selected", () => {
    const result = evaluateGuardianRequest({ portalId: "work", action: "", requestedAt });
    expect(result.state).toBe("suggested");
    expect(result.receipt.outcome).toBe("suggested");
  });

  it("prepares low-risk local work without claiming external execution", () => {
    const result = evaluateGuardianRequest({ portalId: "creativity", action: "Sketch a first draft", capability: LOCAL_PREVIEW, requestedAt });
    expect(result.state).toBe("prepared");
    expect(result.requiresApproval).toBe(false);
    expect(result.receipt.detail).toContain("not taken an external action");
  });

  it("requires action-time approval for high-impact work even when the user selected it", () => {
    const result = evaluateGuardianRequest({ portalId: "home", action: "Lock the front door", requestedAt });
    expect(result.state).toBe("approval-required");
    expect(result.risk).toBe("high-impact");
    expect(result.requiresApproval).toBe(true);
    expect(result.receipt.approvalState).toBe("not-needed");
  });

  it("names an unavailable capability rather than fabricating a connected home", () => {
    const result = evaluateGuardianRequest({ portalId: "home", action: "Start a cinema scene", capability: UNAVAILABLE_HOME_CAPABILITY, requestedAt });
    expect(result.state).toBe("unavailable");
    expect(result.reason).toContain("not available");
    expect(result.receipt.detail).toContain("No device");
  });

  it("denies unsupported guest or identity inference", () => {
    const result = evaluateGuardianRequest({ portalId: "home", action: "Who arrived at home?", requestedAt });
    expect(result.state).toBe("denied");
    expect(result.risk).toBe("high-impact");
    expect(result.reason).toContain("not inferred");
  });

  it("makes cross-portal information use visible and consent-gated", () => {
    const result = evaluateGuardianRequest({
      portalId: "events",
      action: "Prepare an event plan",
      crossPortal: { from: "relationships", to: "events", why: "Use a chosen availability note", consented: false },
      requestedAt,
    });
    expect(result.state).toBe("approval-required");
    expect(result.reason).toContain("relationships context");
  });

  it("records explicit cancellation and manual override without execution", () => {
    const cancelled = evaluateGuardianRequest({ portalId: "home", action: "Prepare a room handoff", cancelled: true, requestedAt });
    const override = evaluateGuardianRequest({ portalId: "home", action: "Prepare a room handoff", manualOverride: true, requestedAt });
    expect(cancelled.state).toBe("denied");
    expect(cancelled.receipt.detail).toContain("No external action");
    expect(override.reason).toContain("manual override");
  });

  it("keeps an executing state provisional until verified completion", () => {
    const result = evaluateGuardianRequest({ portalId: "work", action: "Prepare local focus plan", execution: "executing", requestedAt });
    expect(result.state).toBe("executing");
    expect(result.nextStep).toContain("No external completion is assumed");
  });

  it("uses completed only for a supported local preview outcome", () => {
    const result = evaluateGuardianRequest({ portalId: "work", action: "Mark local focus plan reviewed", execution: "completed", requestedAt });
    expect(result.state).toBe("completed");
    expect(result.receipt.detail).toContain("No external device");
  });

  it("reports failure and its safe fallback in a plain-language receipt", () => {
    const result = evaluateGuardianRequest({
      portalId: "home",
      action: "Prepare cinema scene",
      execution: "failed",
      failureDetail: "Voice output is unavailable",
      fallbackDetail: "Use the visual scene preview instead.",
      requestedAt,
    });
    expect(result.state).toBe("failed");
    expect(formatGuardianReceipt(result.receipt)).toContain("Use the visual scene preview instead.");
  });
});


describe("Guardian policy transition resilience", () => {
  const requestedAt = "2026-08-26T21:31:00.000Z";

  it("handles an unexpected runtime execution value without inventing a completion", () => {
    const result = evaluateGuardianRequest({ portalId: "work", action: "Prepare a local focus plan", execution: "unexpected" as never, requestedAt });
    expect(result.state).toBe("prepared");
    expect(result.receipt.outcome).toBe("prepared");
  });

  it("keeps overlapping high-impact intents behind one explicit approval gate", () => {
    const result = evaluateGuardianRequest({ portalId: "home", action: "Lock the door, review camera status, and purchase a replacement", requestedAt });
    expect(result.state).toBe("approval-required");
    expect(result.risk).toBe("high-impact");
    expect(result.requiresApproval).toBe(true);
  });

  it("updates cross-portal handling when permission is revoked", () => {
    const approvedContext = { from: "relationships" as const, to: "events" as const, why: "Use a chosen availability note", consented: true };
    const prepared = evaluateGuardianRequest({ portalId: "events", action: "Prepare an event plan", crossPortal: approvedContext, requestedAt });
    const revoked = evaluateGuardianRequest({ portalId: "events", action: "Prepare an event plan", crossPortal: { ...approvedContext, consented: false }, requestedAt });
    expect(prepared.state).toBe("prepared");
    expect(revoked.state).toBe("approval-required");
  });

  it("allows cancellation or manual override to win over executing and failed requests", () => {
    const executingOverride = evaluateGuardianRequest({ portalId: "home", action: "Prepare room handoff", execution: "executing", manualOverride: true, requestedAt });
    const failedCancel = evaluateGuardianRequest({ portalId: "home", action: "Prepare cinema scene", execution: "failed", cancelled: true, failureDetail: "Offline", requestedAt });
    expect(executingOverride.state).toBe("denied");
    expect(failedCancel.state).toBe("denied");
    expect(failedCancel.reason).toContain("cancellation");
  });

  it("provides a stable safe fallback when a failure has no custom fallback detail", () => {
    const result = evaluateGuardianRequest({ portalId: "home", action: "Prepare Guest Arrival", execution: "failed", failureDetail: "Network unavailable", requestedAt });
    expect(result.state).toBe("failed");
    expect(result.nextStep).toContain("Navigation and local controls remain available");
  });
});


describe("Guardian policy recovery and concurrent request safeguards", () => {
  it("fails a high-impact request safely when a network path is unavailable", () => {
    const result = evaluateGuardianRequest({
      portalId: "home",
      action: "Lock the front door",
      execution: "failed",
      failureDetail: "Network connection is unavailable",
      fallbackDetail: "Use the physical lock or an authorized device app manually.",
      requestedAt: "2026-08-26T21:45:00.000Z",
    });
    expect(result.state).toBe("failed");
    expect(result.receipt.detail).toContain("manual path");
    expect(formatGuardianReceipt(result.receipt)).toContain("authorized device app manually");
  });

  it("evaluates simultaneous local requests independently without shared approval or receipt state", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => Promise.resolve(evaluateGuardianRequest({
      portalId: "work",
      action: `Prepare local focus step ${index + 1}`,
      requestedAt: `2026-08-26T21:46:${String(index).padStart(2, "0")}.000Z`,
    }))));
    expect(results.every((result) => result.state === "prepared")).toBe(true);
    expect(new Set(results.map((result) => result.receipt.id)).size).toBe(12);
    expect(results.every((result) => result.receipt.approvalState === "not-needed")).toBe(true);
  });

  it("keeps receipt timestamps in stable ISO form for locale-neutral storage", () => {
    const requestedAt = "2026-08-26T21:47:00.000Z";
    const result = evaluateGuardianRequest({ portalId: "work", action: "Prepare a local focus step", requestedAt });
    expect(result.receipt.time).toBe(requestedAt);
    expect(result.receipt.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
