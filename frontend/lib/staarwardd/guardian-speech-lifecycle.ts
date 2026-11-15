/**
 * Build 111: navigation-independent Guardian speech lifecycle.
 * This is a pure state machine; the app's audio transport must consume its effects.
 * Navigation never cancels speech. Mute, explicit stop, and revocation do.
 */
export type GuardianSpeechState = {
  muted: boolean;
  activeTaskId: string | null;
  utteranceId: string | null;
  phase: "idle" | "speaking" | "waiting" | "muted";
};
export type GuardianSpeechEvent =
  | { type: "START"; taskId: string; utteranceId: string }
  | { type: "UTTERANCE_ENDED"; utteranceId: string }
  | { type: "TASK_COMPLETED"; taskId: string }
  | { type: "NAVIGATE"; portalId: string }
  | { type: "MUTE" | "STOP" | "REVOKE" }
  | { type: "UNMUTE" };
export type GuardianSpeechEffect = "cancel-audio" | "start-audio" | "none";
export const initialGuardianSpeechState: GuardianSpeechState = {
  muted: false, activeTaskId: null, utteranceId: null, phase: "idle",
};
export function transitionGuardianSpeech(
  state: GuardianSpeechState,
  event: GuardianSpeechEvent,
): { state: GuardianSpeechState; effect: GuardianSpeechEffect } {
  switch (event.type) {
    case "NAVIGATE":
      return { state, effect: "none" };
    case "MUTE":
      return {
        state: { muted: true, activeTaskId: null, utteranceId: null, phase: "muted" },
        effect: state.utteranceId ? "cancel-audio" : "none",
      };
    case "STOP":
    case "REVOKE":
      return {
        state: { ...state, activeTaskId: null, utteranceId: null, phase: state.muted ? "muted" : "idle" },
        effect: state.utteranceId ? "cancel-audio" : "none",
      };
    case "UNMUTE":
      return { state: { ...state, muted: false, phase: "idle" }, effect: "none" };
    case "START":
      if (state.muted || !event.taskId || !event.utteranceId) return { state, effect: "none" };
      // A new utterance replaces the old one only after the transport cancels it.
      // The caller must stop the prior audio before honoring start-audio.
      return {
        state: { ...state, activeTaskId: event.taskId, utteranceId: event.utteranceId, phase: "speaking" },
        effect: "start-audio",
      };
    case "UTTERANCE_ENDED":
      if (state.utteranceId !== event.utteranceId) return { state, effect: "none" };
      return {
        state: { ...state, utteranceId: null, phase: state.activeTaskId ? "waiting" : "idle" },
        effect: "none",
      };
    case "TASK_COMPLETED":
      if (state.activeTaskId !== event.taskId) return { state, effect: "none" };
      return {
        state: { ...state, activeTaskId: null, phase: state.utteranceId ? "speaking" : "idle" },
        effect: "none",
      };
  }
}
