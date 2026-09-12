// Persistent, app-root launch soundtrack. Lives outside React so route
// transitions and re-renders can never destroy playback. Loops seamlessly.
let el: HTMLAudioElement | null = null;

export function startLaunchSoundtrack() {
  if (typeof window === "undefined") return;
  try {
    if (!el) {
      el = new window.Audio("/audio/toronto-portal.mp3");
      el.preload = "auto";
      el.loop = true;
    }
    el.volume = 0.8;
    const p = el.play();
    p?.catch?.(() => { setTimeout(() => el?.play().catch(() => {}), 500); });
  } catch { /* optional */ }
}

export function stopLaunchSoundtrack() {
  try { el?.pause(); } catch { /* noop */ }
}
