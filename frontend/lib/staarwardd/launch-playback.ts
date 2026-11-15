// Allow the entire master to play, including a 26.2s opening + 20s finale.
// Unknown metadata still has a bounded escape; skip remains available.
export function launchDeadlineMs(durationSeconds: number): number {
  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? Math.max(60_000, durationSeconds * 1000 + 15_000)
    : 60_000;
}
