/** Pure playback transition policy for Guardian animation.
 * Silence the visual speaking state on buffering, pause, completion or failure.
 * This is an audio activity gate, not phoneme/viseme lip synchronization.
 */
export type GuardianPlaybackSnapshot = { started: boolean; playing: boolean };
export type GuardianPlaybackSignal = { playing: boolean; didJustFinish?: boolean; error?: unknown };
export function transitionGuardianPlayback(previous: GuardianPlaybackSnapshot, signal: GuardianPlaybackSignal): {
  state: GuardianPlaybackSnapshot;
  startedNow: boolean;
  changed: boolean;
} {
  if (signal.error || signal.didJustFinish) {
    const state = { started: previous.started, playing: false };
    return { state, startedNow: false, changed: previous.playing };
  }
  const startedNow = !!signal.playing && !previous.started;
  const state = {
    started: previous.started || !!signal.playing,
    playing: !!signal.playing && (previous.started || startedNow),
  };
  return { state, startedNow, changed: state.playing !== previous.playing };
}
