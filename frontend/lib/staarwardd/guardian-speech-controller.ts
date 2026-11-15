import {
  initialGuardianSpeechState,
  transitionGuardianSpeech,
  type GuardianSpeechEvent,
  type GuardianSpeechState,
} from "./guardian-speech-lifecycle";

/**
 * Transport adapter for a provider mounted above portal navigation.
 * No microphone is activated here. Callers own permissions and audio resources.
 */
export function createGuardianSpeechController(transport: {
  start: (utteranceId: string) => void | Promise<void>;
  cancel: () => void | Promise<void>;
}) {
  let state: GuardianSpeechState = { ...initialGuardianSpeechState };
  let epoch = 0;
  return {
    snapshot: () => ({ ...state }),
    async dispatch(event: GuardianSpeechEvent): Promise<GuardianSpeechState> {
      const previous = state;
      const result = transitionGuardianSpeech(state, event);
      state = result.state;
      if (result.effect === "cancel-audio") {
        epoch += 1;
        await transport.cancel();
      } else if (result.effect === "start-audio" && event.type === "START") {
        const myEpoch = ++epoch;
        // A new utterance must not overlap the previous one.
        if (previous.utteranceId) await transport.cancel();
        if (myEpoch === epoch && !state.muted && state.utteranceId === event.utteranceId) {
          await transport.start(event.utteranceId);
        }
      }
      return { ...state };
    },
  };
}
