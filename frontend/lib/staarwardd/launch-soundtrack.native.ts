import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// The same bundled score as web, retained across the cinematic-to-Hub handoff.
let player: AudioPlayer | null = null;
export function startLaunchSoundtrack() {
  try {
    if (!player) {
      player = createAudioPlayer(require("@/public/audio/STAARWAARDD_Full_Launch_Enhanced_v1.mp3"));
      player.loop = true;
    }
    player.volume = 0.8;
    player.play();
  } catch { /* Optional audio must never block entry. */ }
}
export function setLaunchSoundtrackIntensity(intensity: number) {
  if (player) player.volume = Math.max(0.48, Math.min(0.92, intensity));
}
export function stopLaunchSoundtrack() {
  try { player?.pause(); } catch { /* noop */ }
}
