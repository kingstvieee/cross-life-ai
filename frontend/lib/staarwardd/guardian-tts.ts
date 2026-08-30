import { Platform } from "react-native";
import { playVoice, stopVoice } from "@/src/voice";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export type GuardianLine = { text: string; url: string };

// Fetch a cached Onyx TTS line ({url, text}) from the backend.
export async function fetchGuardianLine(path: string): Promise<GuardianLine | null> {
  try {
    const r = await fetch(`${BACKEND}${path}`);
    if (!r.ok) return null;
    const { url, text } = await r.json();
    return { text: text ?? "", url: `${BACKEND}${url}` };
  } catch {
    return null;
  }
}

// POST a short dynamic line (e.g., remembered preference) for Onyx TTS.
export async function fetchGuardianSpokenText(text: string, token: string | null): Promise<GuardianLine | null> {
  try {
    const r = await fetch(`${BACKEND}/api/guardian/speak-line`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return null;
    const { url } = await r.json();
    return { text, url: `${BACKEND}${url}` };
  } catch {
    return null;
  }
}

// Play a Guardian line. onStart fires when audio actually begins; onEnd when it
// finishes (or fails). If the browser blocks autoplay, playback (and onStart)
// defers to the user's first tap. Returns a stop() cleanup.
export function playGuardianLine(
  url: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {},
): () => void {
  const { onStart, onEnd } = handlers;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const el = new window.Audio(url);
    el.volume = 0.85;
    el.addEventListener("play", () => onStart?.());
    el.addEventListener("ended", () => onEnd?.());
    el.addEventListener("error", () => onEnd?.());
    el.play().catch(() => {
      const onTap = () => { el.play().catch(() => onEnd?.()); };
      window.addEventListener("pointerdown", onTap, { once: true });
    });
    return () => { try { el.pause(); } catch { /* noop */ } };
  }
  let stopped = false;
  void (async () => {
    try {
      const player = await playVoice(url);
      if (stopped) return;
      onStart?.();
      const sub = player.addListener("playbackStatusUpdate", (st: { didJustFinish?: boolean }) => {
        if (st?.didJustFinish) { onEnd?.(); sub.remove(); }
      });
    } catch {
      onEnd?.();
    }
  })();
  return () => { stopped = true; try { stopVoice(); } catch { /* noop */ } };
}
