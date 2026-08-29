import { evaluateGuardianRequest, type GuardianPolicyResult, type GuardianRequest } from "./guardian-policy";
import { buildGuardianVoiceResponse, modeForGuardianState, type GuardianVoiceMode, type GuardianVoiceResponse } from "./guardian-voice";

export type GuardianInteraction = {
  policy: GuardianPolicyResult;
  voice: GuardianVoiceResponse;
};

/**
 * Shared deterministic interaction composer. It evaluates policy before language
 * is created, so components cannot imply a capability or completion unsupported
 * by the supplied state.
 */
export function createGuardianInteraction(request: GuardianRequest, voiceMode?: GuardianVoiceMode): GuardianInteraction {
  const policy = evaluateGuardianRequest(request);
  const mode = voiceMode ?? modeForGuardianState(policy.state);
  return {
    policy,
    voice: buildGuardianVoiceResponse({ portalId: request.portalId, policy, mode, requestLabel: request.action }),
  };
}
