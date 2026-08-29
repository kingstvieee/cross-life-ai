import { createGuardianInteraction, type GuardianInteraction } from "./guardian-interaction";
import type { GuardianApprovalState, GuardianCapability, GuardianRisk, GuardianTriggerSource } from "./guardian-policy";

export type HomeRoutineId = "guest-arrival" | "room-handoff" | "cinema-scene";
export type HomeRoutineLifecycle = "preview" | "approval-required" | "ready" | "cancelled" | "manual-override" | "unavailable" | "failed" | "completed";
export type HomeEventProvider = "home-assistant" | "smartthings" | "google-home" | "alexa";

export type HomeRoutine = {
  id: HomeRoutineId;
  title: string;
  risk: GuardianRisk;
  description: string;
  proposedScene: readonly string[];
  guestMode: boolean;
  sessionMinutes: number;
  autoApprovalAllowed: boolean;
};

export type VerifiedHomeEvent = {
  id: string;
  provider: HomeEventProvider;
  label: string;
  occurredAt: string;
  verified: boolean;
  /** Deliberately context-only: no person, face, guest, presence, or occupancy fields are permitted. */
  context?: Record<string, string | number | boolean>;
};

export type HomeEventPreparation = {
  status: "unavailable" | "prepared";
  reason: string;
  event?: VerifiedHomeEvent;
};

export interface HomeEventAdapter {
  provider: HomeEventProvider;
  status: "unavailable" | "ready";
  prepare(event: VerifiedHomeEvent): HomeEventPreparation;
}

export const UNAVAILABLE_HOME_EVENT_ADAPTER: HomeEventAdapter = {
  provider: "home-assistant",
  status: "unavailable",
  prepare(event) {
    return {
      status: "unavailable",
      event,
      reason: "No authorized home-platform event connection is available. A manual routine preview remains available.",
    };
  },
};

export const HOME_ROUTINES: Record<HomeRoutineId, HomeRoutine> = {
  "guest-arrival": {
    id: "guest-arrival",
    title: "Guest Arrival",
    risk: "consequential",
    description: "Prepare a dignified local welcome scene without identifying, locating, or inferring anything about a guest.",
    proposedScene: ["Choose a manual welcome note", "Prepare a local ambience preview", "Show a visible guest-mode timer"],
    guestMode: true,
    sessionMinutes: 120,
    autoApprovalAllowed: false,
  },
  "room-handoff": {
    id: "room-handoff",
    title: "Room Handoff",
    risk: "consequential",
    description: "Prepare a clear manual handoff between rooms without reading doors, cameras, occupancy, or device state.",
    proposedScene: ["Choose the next room manually", "Prepare a local handoff checklist", "Keep manual control available"],
    guestMode: false,
    sessionMinutes: 60,
    autoApprovalAllowed: false,
  },
  "cinema-scene": {
    id: "cinema-scene",
    title: "Cinema Scene",
    risk: "low",
    description: "Prepare a local cinema scene preview without operating televisions, lights, speakers, locks, cameras, or accounts.",
    proposedScene: ["Choose a local atmosphere preview", "Display optional manual steps", "Keep offline fallback visible"],
    guestMode: false,
    sessionMinutes: 90,
    autoApprovalAllowed: true,
  },
};

export type HomeRoutineRequest = {
  routineId: HomeRoutineId;
  source?: GuardianTriggerSource;
  trigger?: string;
  approval?: GuardianApprovalState;
  execution?: "executing" | "completed" | "failed";
  cancelled?: boolean;
  manualOverride?: boolean;
  autoApproval?: boolean;
  failureDetail?: string;
  fallbackDetail?: string;
  event?: VerifiedHomeEvent;
  now?: Date;
};

export type HomeRoutineResult = {
  routine: HomeRoutine;
  lifecycle: HomeRoutineLifecycle;
  sessionExpiresAt: string;
  interaction: GuardianInteraction;
  sourceStatement: string;
  offlineFallback: string;
};

function simulatedRoutineCapability(routine: HomeRoutine): GuardianCapability {
  return {
    status: "simulated",
    label: `Local ${routine.title} preview`,
    detail: "This preview is available on this device only; no home platform, device, sensor, person, or account is contacted.",
  };
}

function lifecycleFor(input: HomeRoutineRequest, interaction: GuardianInteraction): HomeRoutineLifecycle {
  if (input.manualOverride) return "manual-override";
  if (input.cancelled) return "cancelled";
  if (interaction.policy.state === "approval-required") return "approval-required";
  if (interaction.policy.state === "unavailable") return "unavailable";
  if (interaction.policy.state === "failed") return "failed";
  if (interaction.policy.state === "completed") return "completed";
  return "preview";
}

function sourceStatement(input: HomeRoutineRequest) {
  if (input.event?.verified) return `Verified event context: ${input.event.label}. It provides no identity, face, guest, presence, or occupancy inference.`;
  return "Manual trigger: you started this routine. No sensor, device, guest, presence, or identity data was read.";
}

export function evaluateHomeRoutine(input: HomeRoutineRequest): HomeRoutineResult {
  const routine = HOME_ROUTINES[input.routineId];
  const now = input.now ?? new Date();
  const sessionExpiresAt = new Date(now.getTime() + routine.sessionMinutes * 60_000).toISOString();
  const approvedAutomatically = routine.autoApprovalAllowed && input.autoApproval;
  const approval = approvedAutomatically ? "approved" : input.approval;
  const eventIsVerified = Boolean(input.event?.verified);
  const interaction = createGuardianInteraction({
    portalId: "home",
    action: `Prepare ${routine.title}`,
    risk: routine.risk,
    source: eventIsVerified ? "authorized-event" : input.source ?? "manual",
    trigger: input.trigger ?? sourceStatement(input),
    capability: simulatedRoutineCapability(routine),
    approval,
    execution: input.execution,
    cancelled: input.cancelled,
    manualOverride: input.manualOverride,
    failureDetail: input.failureDetail,
    fallbackDetail: input.fallbackDetail ?? "Use the local preview and manual controls; no home platform connection is required.",
  });
  return {
    routine,
    lifecycle: lifecycleFor(input, interaction),
    sessionExpiresAt,
    interaction,
    sourceStatement: sourceStatement(input),
    offlineFallback: "The routine can remain a labeled local preview while offline. No external action is assumed.",
  };
}

export function prepareRoutineFromEvent(adapter: HomeEventAdapter, routineId: HomeRoutineId, event: VerifiedHomeEvent): HomeRoutineResult {
  const prepared = adapter.prepare(event);
  if (prepared.status === "unavailable") {
    return evaluateHomeRoutine({
      routineId,
      source: "authorized-event",
      trigger: prepared.reason,
      event,
      failureDetail: prepared.reason,
      fallbackDetail: "Use the same routine with a manual trigger instead.",
      execution: "failed",
    });
  }
  return evaluateHomeRoutine({ routineId, source: "authorized-event", trigger: prepared.reason, event: prepared.event });
}
