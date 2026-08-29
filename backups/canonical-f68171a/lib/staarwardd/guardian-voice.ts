import type { GuardianPolicyResult } from "@/lib/staarwardd/guardian-policy";
import type { PortalId } from "@/lib/staarwardd/types";

export type GuardianVoiceMode = "ARRIVAL" | "GUIDE" | "CAUTION" | "RECOVERY" | "CELEBRATION" | "SILENT/PASSIVE";

export const GUARDIAN_TONE_GUARDRAILS = {
  identity: "Warm, composed, intelligent, observant, quietly confident, protective without possession, and respectful.",
  cadence: "Concise by default; cinematic only at intentional story moments.",
  prohibited: ["parental", "scolding", "manipulative", "needy", "omniscient", "melodramatic", "falsely intimate", "coercive", "falsely conscious"],
  pressureWords: ["destiny", "chosen", "obey", "command", "must", "hurry", "fear", "shame"],
} as const;

export type GuardianVoiceResponse = {
  mode: GuardianVoiceMode;
  text: string;
  speak: boolean;
  acknowledgement: string;
  verifiedContext: string;
  recommendation: string;
  rationale: string;
  permission: string;
  choices: string[];
};

const ACKNOWLEDGEMENTS = ["Understood.", "I have that.", "I’m with you."] as const;
const GUIDE_LEADS = ["Here is the clearest next step.", "One useful move is enough.", "We can keep this simple."] as const;
const CAUTION_LEADS = ["A quick boundary first.", "This needs a clear check before it goes further.", "Let’s keep the decision in your hands."] as const;
const RECOVERY_LEADS = ["That did not complete.", "The connection is not available for that step.", "We can pause here without losing your place."] as const;
const CELEBRATION_LEADS = ["That local step is ready.", "The preparation is complete.", "That is now set in this preview."] as const;

function hash(value: string) {
  let result = 5381;
  for (const character of value) result = (result * 33) ^ character.charCodeAt(0);
  return Math.abs(result);
}

function choose<const T extends readonly string[]>(items: T, seed: string): T[number] {
  return items[hash(seed) % items.length];
}

function choicesFor(state: GuardianPolicyResult["state"]) {
  switch (state) {
    case "approval-required": return ["Review proposal", "Not now"];
    case "unavailable": return ["Use manual preview", "Return to Hub"];
    case "denied": return ["Choose another option", "Return to manual control"];
    case "failed": return ["Try available fallback", "Cancel"];
    case "completed": return ["Review receipt", "Choose next step"];
    case "executing": return ["Stop", "Keep preparing"];
    default: return ["Prepare this", "Choose another option"];
  }
}

function leadFor(mode: GuardianVoiceMode, state: GuardianPolicyResult["state"], seed: string) {
  if (mode === "SILENT/PASSIVE") return "";
  if (mode === "ARRIVAL") return choose(ACKNOWLEDGEMENTS, seed);
  if (mode === "CAUTION" || state === "approval-required" || state === "denied") return choose(CAUTION_LEADS, seed);
  if (mode === "RECOVERY" || state === "unavailable" || state === "failed") return choose(RECOVERY_LEADS, seed);
  if (mode === "CELEBRATION" || state === "completed") return choose(CELEBRATION_LEADS, seed);
  return choose(GUIDE_LEADS, seed);
}

function rationaleFor(policy: GuardianPolicyResult) {
  if (policy.state === "approval-required") return "It may affect another person, an account, a purchase, a device, or a safety-critical setting.";
  if (policy.state === "unavailable") return "The required verified capability is not available in this build.";
  if (policy.state === "failed") return "The requested path returned a failure instead of a verified outcome.";
  if (policy.state === "completed") return "Only a supported local preview outcome is complete.";
  if (policy.state === "denied") return "The Guardian does not infer identity, presence, or unsupported sensitive context.";
  return "This stays within the verified local preview boundary.";
}

/** Returns true only for prohibited pressure or false-intimacy vocabulary. */
export function hasProhibitedGuardianTone(text: string) {
  const normalized = text.toLowerCase();
  return GUARDIAN_TONE_GUARDRAILS.pressureWords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(normalized));
}

/**
 * Creates concise, verified Guardian copy. It never invents device, person,
 * account, service, or completion state; those facts come from policy only.
 */
export function buildGuardianVoiceResponse({
  portalId,
  policy,
  mode = "GUIDE",
  requestLabel,
}: {
  portalId: PortalId;
  policy: GuardianPolicyResult;
  mode?: GuardianVoiceMode;
  requestLabel?: string;
}): GuardianVoiceResponse {
  const portalName = portalId.slice(0, 1).toUpperCase() + portalId.slice(1);
  const seed = `${portalId}|${policy.state}|${requestLabel ?? policy.receipt.requestedAction}`;
  const choices = choicesFor(policy.state);
  const acknowledgement = leadFor(mode, policy.state, seed);
  const verifiedContext = policy.reason;
  const recommendation = policy.recommendation;
  const rationale = rationaleFor(policy);
  const permission = policy.nextStep;

  if (mode === "SILENT/PASSIVE") {
    return { mode, text: "", speak: false, acknowledgement, verifiedContext, recommendation, rationale, permission, choices };
  }

  const boundary = portalId === "home" ? "Home remains manual-first." : `${portalName} stays in local preview.`;
  const text = `${acknowledgement} ${verifiedContext} ${recommendation} ${rationale} ${permission} ${boundary}`.replace(/\s+/g, " ").trim();
  return { mode, text, speak: true, acknowledgement, verifiedContext, recommendation, rationale, permission, choices };
}

export function modeForGuardianState(state: GuardianPolicyResult["state"]): GuardianVoiceMode {
  if (state === "approval-required" || state === "denied") return "CAUTION";
  if (state === "unavailable" || state === "failed") return "RECOVERY";
  if (state === "completed") return "CELEBRATION";
  return "GUIDE";
}
