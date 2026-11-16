/** Duplicate renderer taps should navigate at most once per action burst.
 * This does not grant any new action permissions; sceneAction still allowlists.
 */
export type SceneDispatch = { world: string; action: string; atMs: number };
export function shouldDispatchSceneAction(
  previous: SceneDispatch | null,
  current: SceneDispatch,
  debounceMs = 650,
): boolean {
  if (!current.world || !current.action || !Number.isFinite(current.atMs)) return false;
  if (!previous || previous.world !== current.world || previous.action !== current.action) return true;
  return current.atMs < previous.atMs || current.atMs - previous.atMs >= debounceMs;
}
