// Persistent, app-root launch soundtrack. Lives outside React so route
// transitions and re-renders can never destroy playback. Loops seamlessly.
let el: HTMLAudioElement | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;

function keepAlive() {
  if (!el || document.hidden) return;
  // Mobile Safari can leave a looping element paused after a video finishes or
  // React swaps the entrance for the Hub. Resume the same soundtrack instead
  // of allowing the second half of the experience to become silent.
  if (el.paused || el.ended) {
    if (el.ended) el.currentTime = 0;
    void el.play().catch(() => {});
  }
}

export function startLaunchSoundtrack() {
  if (typeof window === "undefined") return;
  try {
    if (!el) {
      // Enhanced full launch soundtrack (from codex main) — loops seamlessly.
      el = new window.Audio("/audio/STAARWAARDD_Full_Launch_Enhanced_v1.mp3");
      el.preload = "auto";
      el.loop = true;
      el.addEventListener("ended", () => {
        if (!el) return;
        el.currentTime = 0;
        void el.play().catch(() => {});
      });
    }
    el.volume = 0.8;
    const p = el.play();
    p?.catch?.(() => { setTimeout(() => el?.play().catch(() => {}), 500); });
    if (!watchdog) watchdog = setInterval(keepAlive, 1000);
  } catch { /* optional */ }
}

export function setLaunchSoundtrackIntensity(intensity: number) {
  if (!el) return;
  // Preserve headroom for the portal impacts while letting the score build
  // perceptibly across the seven-beat summoning ritual.
  el.volume = Math.max(0.48, Math.min(0.92, intensity));
}

export function stopLaunchSoundtrack() {
  try { el?.pause(); } catch { /* noop */ }
  if (watchdog) { clearInterval(watchdog); watchdog = null; }
}
