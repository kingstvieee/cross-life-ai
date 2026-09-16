// Persistent, app-root launch soundtrack. Lives outside React so route
// transitions and re-renders can never destroy playback. Loops seamlessly.
let el: HTMLAudioElement | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;
let rampFrame: number | null = null;

const MIN_VOLUME = 0.46;
const MAX_VOLUME = 0.94;

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

function rampVolume(target: number, duration = 420) {
  if (!el || typeof window === "undefined") return;
  const bounded = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, target));
  const from = el.volume;
  const started = performance.now();
  if (rampFrame !== null) cancelAnimationFrame(rampFrame);

  const step = (now: number) => {
    if (!el) return;
    const t = Math.min(1, (now - started) / Math.max(80, duration));
    const eased = 1 - Math.pow(1 - t, 3);
    el.volume = from + (bounded - from) * eased;
    if (t < 1) rampFrame = requestAnimationFrame(step);
    else rampFrame = null;
  };
  rampFrame = requestAnimationFrame(step);
}

export function startLaunchSoundtrack() {
  if (typeof window === "undefined") return;
  try {
    if (!el) {
      // Enhanced full launch soundtrack — one continuous creeping -> adventure
      // -> portal crescendo bed. Portal impacts and weather FX sit above this.
      el = new window.Audio("/audio/STAARWAARDD_Full_Launch_Enhanced_v1.mp3");
      el.preload = "auto";
      el.loop = true;
      el.addEventListener("ended", () => {
        if (!el) return;
        el.currentTime = 0;
        void el.play().catch(() => {});
      });
    }
    // Start with headroom so the Toronto rumble/lightning is audible, then let
    // the score grow as the Guardian takes control of the chamber.
    el.volume = 0.6;
    const p = el.play();
    p?.then?.(() => rampVolume(0.7, 1500));
    p?.catch?.(() => { setTimeout(() => {
      void el?.play().then(() => rampVolume(0.7, 1200)).catch(() => {});
    }, 500); });
    if (!watchdog) watchdog = setInterval(keepAlive, 1000);
  } catch { /* optional */ }
}

export function setLaunchSoundtrackIntensity(intensity: number) {
  if (!el) return;
  // Smooth ramps keep each clockwise portal beat theatrical instead of sounding
  // like seven abrupt volume jumps. The final gateways deliberately reach near
  // full scale while preserving headroom for portal, thunder and shield FX.
  rampVolume(intensity, intensity >= 0.88 ? 520 : 360);
}

export function stopLaunchSoundtrack() {
  if (rampFrame !== null && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(rampFrame);
    rampFrame = null;
  }
  try { el?.pause(); } catch { /* noop */ }
  if (watchdog) { clearInterval(watchdog); watchdog = null; }
}
