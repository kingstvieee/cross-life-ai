import type { PortalId } from "@/lib/staarwardd/types";

export type GuardianActionState =
  | "suggested"
  | "prepared"
  | "approval-required"
  | "unavailable"
  | "denied"
  | "executing"
  | "completed"
  | "failed";

export type GuardianRisk = "low" | "consequential" | "high-impact";
export type GuardianCapabilityStatus = "available" | "unavailable" | "simulated" | "pending" | "failed";

export const GUARDIAN_CONSTITUTION = {
  service: "Advise, prepare, explain, and ask; never take the user’s decision away.",
  truth: "Name unavailable, simulated, prepared, pending, failed, and completed states explicitly.",
  consent: "Use suggest, explain, preview, approve, and execute for consequential work.",
  privacy: "Use the minimum supplied context and never infer sensitive traits, relationships, emotion, identity, or guest status.",
  memory: "Keep memory opt-in, visible, editable, and erasable.",
  boundaries: "Do not move information across portals without explaining why and receiving consent.",
  guestDignity: "Never identify or infer a guest from weak signals.",
  reversibility: "Offer cancel, manual override, safe fallback, and undo for supported local work.",
  accountability: "Create a plain-language receipt for consequential proposals and outcomes.",
  safeDegradation: "Retain navigation and manual control if speech, network, sensors, or integrations are unavailable.",
} as const;
export type GuardianApprovalState = "not-needed" | "requested" | "approved" | "denied";
export type GuardianTriggerSource = "manual" | "routine" | "authorized-event" | "local-preview";

export type GuardianCapability = {
  status: GuardianCapabilityStatus;
  label: string;
  detail?: string;
};

export type GuardianCrossPortalContext = {
  from: PortalId;
  to: PortalId;
  why: string;
  consented: boolean;
};

export type GuardianRequest = {
  portalId: PortalId;
  action: string;
  risk?: GuardianRisk;
  source?: GuardianTriggerSource;
  trigger?: string;
  capability?: GuardianCapability;
  approval?: GuardianApprovalState;
  execution?: Extract<GuardianActionState, "executing" | "completed" | "failed">;
  cancelled?: boolean;
  manualOverride?: boolean;
  failureDetail?: string;
  fallbackDetail?: string;
  crossPortal?: GuardianCrossPortalContext;
  requestedAt?: string;
};

export type GuardianReceipt = {
  id: string;
  time: string;
  source: GuardianTriggerSource;
  trigger: string;
  reason: string;
  requestedAction: string;
  approvalState: GuardianApprovalState;
  outcome: GuardianActionState;
  detail: string;
  failureDetail?: string;
  fallbackDetail?: string;
  persisted: boolean;
};

export type GuardianPolicyResult = {
  state: GuardianActionState;
  risk: GuardianRisk;
  requiresApproval: boolean;
  capability: GuardianCapability;
  reason: string;
  recommendation: string;
  nextStep: string;
  receipt: GuardianReceipt;
};

const LOCAL_PREVIEW_CAPABILITY: GuardianCapability = {
  status: "available",
  label: "Local STAARWARDD preview",
  detail: "Only supported in-app preparation is available in this build.",
};

const HIGH_IMPACT_INTENT = /\b(lock|unlock|camera|alarm|siren|purchase|buy|pay|order|account|password|identity|identify|recognize|face|message|email|text|call|invite|rsvp|book|register|thermostat|heat|cool|gas|cooktop|appliance)\b/i;
const CONSEQUENTIAL_INTENT = /\b(share|publish|send|schedule|remind|save|delete|change|connect|handoff|transfer)\b/i;
const IDENTITY_INFERENCE_INTENT = /\b(who (arrived|is here|came in)|identify|recognize|face|guest name|is this person|occupancy|is anyone home)\b/i;

function stableId(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function classifyGuardianRisk(action: string): GuardianRisk {
  if (HIGH_IMPACT_INTENT.test(action)) return "high-impact";
  if (CONSEQUENTIAL_INTENT.test(action)) return "consequential";
  return "low";
}

export function requiresGuardianApproval(risk: GuardianRisk) {
  return risk === "consequential" || risk === "high-impact";
}

function readableCapability(capability: GuardianCapability) {
  return capability.detail ? `${capability.label}: ${capability.detail}` : capability.label;
}

function createReceipt(request: GuardianRequest, state: GuardianActionState, reason: string, detail: string): GuardianReceipt {
  const source = request.source ?? "manual";
  const time = request.requestedAt ?? new Date().toISOString();
  const approvalState = request.approval ?? "not-needed";
  const trigger = request.trigger ?? (source === "manual" ? "You started this request" : "Guardian routine");
  return {
    id: `guardian-${stableId([request.portalId, request.action, time, state].join("|"))}`,
    time,
    source,
    trigger,
    reason,
    requestedAction: request.action.trim() || "No action was requested",
    approvalState,
    outcome: state,
    detail,
    failureDetail: request.failureDetail,
    fallbackDetail: request.fallbackDetail,
    persisted: false,
  };
}

function result(
  request: GuardianRequest,
  risk: GuardianRisk,
  state: GuardianActionState,
  reason: string,
  recommendation: string,
  nextStep: string,
  capability: GuardianCapability,
): GuardianPolicyResult {
  return {
    state,
    risk,
    requiresApproval: requiresGuardianApproval(risk),
    capability,
    reason,
    recommendation,
    nextStep,
    receipt: createReceipt(request, state, reason, `${recommendation} ${nextStep}`),
  };
}

/**
 * Evaluates a request without performing any external operation. This is the sole
 * policy gate for Hub, portal, and Home-routine Guardian interactions.
 */
export function evaluateGuardianRequest(request: GuardianRequest): GuardianPolicyResult {
  const action = request.action.trim();
  const risk = request.risk ?? classifyGuardianRisk(action);
  const capability = request.capability ?? LOCAL_PREVIEW_CAPABILITY;
  const approval = request.approval ?? "not-needed";

  if (!action) {
    return result(request, "low", "suggested", "No action has been selected yet.", "Choose one small next step.", "I can prepare it locally when you are ready.", capability);
  }

  if (request.cancelled || request.manualOverride) {
    const label = request.manualOverride ? "manual override" : "cancellation";
    return result(request, risk, "denied", `You chose ${label}.`, "Return to the available manual path.", "No external action was executed, and the prepared preview can be adjusted or dismissed.", capability);
  }

  if (IDENTITY_INFERENCE_INTENT.test(action)) {
    return result(request, "high-impact", "denied", "Guest identity and occupancy are not inferred in STAARWARDD.", "Use a manual label if you want to prepare a local routine.", "No person, guest, room, camera, or sensor state was read.", capability);
  }

  if (request.crossPortal && !request.crossPortal.consented) {
    return result(request, "consequential", "approval-required", `This would use ${request.crossPortal.from} context in ${request.crossPortal.to}.`, "Review why that context is useful before sharing it.", `Approval is required before information moves between portals: ${request.crossPortal.why}`, capability);
  }

  if (approval === "denied") {
    return result(request, risk, "denied", "You declined this request.", "Keep control with a manual alternative.", "Nothing was executed or sent.", capability);
  }

  if (request.execution === "failed" || capability.status === "failed") {
    const failure = request.failureDetail ?? readableCapability(capability);
    return result(request, risk, "failed", `This could not be completed: ${failure}`, "Use the available manual path instead.", request.fallbackDetail ?? "Navigation and local controls remain available.", capability);
  }

  if (capability.status === "unavailable" || capability.status === "pending") {
    return result(request, risk, "unavailable", `${readableCapability(capability)} is not available for this request.`, "Prepare a manual preview instead.", "No device, account, person, or service action was attempted.", capability);
  }

  if (requiresGuardianApproval(risk) && approval !== "approved") {
    return result(request, risk, "approval-required", "This request can affect another person, an account, a purchase, a device, or a safety-critical setting.", "Review the exact proposed action before deciding.", "Approval is required at action time; nothing has been executed.", capability);
  }

  if (request.execution === "executing") {
    return result(request, risk, "executing", "Your approved local action is being prepared.", "You can stop or return to manual control at any time.", "No external completion is assumed until verified state is returned.", capability);
  }

  if (request.execution === "completed") {
    return result(request, risk, "completed", "The supported local preview step is complete.", "Review the receipt before choosing another action.", "No external device, account, message, purchase, or person was affected.", capability);
  }

  if (capability.status === "simulated") {
    return result(request, risk, "prepared", `${readableCapability(capability)} is a labeled simulation.`, "Review the preview without treating it as live state.", "No real integration or device was contacted.", capability);
  }

  return result(request, risk, "prepared", "This can be prepared in the current local preview.", "Review the prepared step and decide what to do next.", "The Guardian has not taken an external action.", capability);
}

export function formatGuardianReceipt(receipt: GuardianReceipt) {
  const recovery = [receipt.failureDetail, receipt.fallbackDetail].filter(Boolean).join(" ");
  return `${receipt.outcome.replace(/-/g, " ").toUpperCase()} · ${receipt.requestedAction}. ${receipt.detail}${recovery ? ` ${recovery}` : ""}`;
}

export const LOCAL_PREVIEW = LOCAL_PREVIEW_CAPABILITY;
export const UNAVAILABLE_HOME_CAPABILITY: GuardianCapability = {
  status: "unavailable",
  label: "Authorized home-platform connection",
  detail: "No Google Home, Alexa, SmartThings, Home Assistant, or compatible device connection is authorized in this build.",
};
