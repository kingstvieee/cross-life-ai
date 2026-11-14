import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { backendUrl } from './backend-config';

let generation = 0;
let player: AudioPlayer | null = null;
let cleanup: (() => void) | null = null;
export function stopServerSpeech() {
  generation++;
  cleanup?.(); cleanup = null;
  try { player?.pause(); player?.remove(); } catch { /* already disposed */ }
  player = null;
}
export async function playServerSpeech(fetchLine: () => Promise<Response>, options: { volume?: number; onDone?: () => void } = {}) {
  stopServerSpeech();
  const current = generation;
  const response = await fetchLine();
  if (current !== generation) return;
  if (!response.ok) throw new Error('Natural voice is unavailable. Text conversation remains available.');
  const line = await response.json();
  if (current !== generation) return;
  if (typeof line.url !== 'string' || !/^\/api\/tts\/[A-Za-z0-9_.-]+\.mp3$/.test(line.url)) throw new Error('Invalid voice response.');
  await setAudioModeAsync({ playsInSilentMode: true });
  if (current !== generation) return;
  const active = createAudioPlayer({ uri: backendUrl(line.url) });
  player = active;
  active.volume = options.volume ?? 0.8;
  const subscription = active.addListener('playbackStatusUpdate', status => {
    if (status.didJustFinish && current === generation) { stopServerSpeech(); options.onDone?.(); }
  });
  cleanup = () => subscription.remove();
  active.play();
}
