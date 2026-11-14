import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { backendUrl } from './backend-config';

export type SpeechState = 'idle' | 'loading' | 'speaking' | 'failed';
let state: SpeechState = 'idle';
const listeners = new Set<(value: SpeechState) => void>();
function publish(value: SpeechState) { state = value; listeners.forEach(fn => fn(value)); }
export function observeSpeech(fn: (value: SpeechState) => void) { listeners.add(fn); fn(state); return () => { listeners.delete(fn); }; }
let generation = 0;
let requestController: AbortController | null = null;
let player: AudioPlayer | null = null;
let cleanup: (() => void) | null = null;
let cancelled: (() => void) | null = null;
export function stopServerSpeech() {
  generation++; requestController?.abort(); requestController = null;
  cleanup?.(); cleanup = null;
  try { player?.pause(); player?.remove(); } catch { /* already disposed */ }
  player = null; cancelled?.(); cancelled = null; publish('idle');
}
export async function playServerSpeech(fetchLine: (signal: AbortSignal) => Promise<Response>, options: { volume?: number; onDone?: () => void } = {}) {
  stopServerSpeech();
  const current = generation;
  publish('loading');
  try {
    const controller = new AbortController(); requestController = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response: Response;
    try { response = await fetchLine(controller.signal); } finally { clearTimeout(timeout); }
    if (current !== generation) return;
    if (!response.ok) throw new Error('Natural voice is unavailable. Text conversation remains available.');
    const line = await response.json();
    if (current !== generation) return;
    if (typeof line.url !== 'string' || !/^\/api\/tts\/[A-Za-z0-9_.-]+\.mp3$/.test(line.url)) throw new Error('Invalid voice response.');
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (current !== generation) return;
    const active = createAudioPlayer({ uri: backendUrl(line.url) });
    player = active; active.volume = options.volume ?? 0.8;
    await new Promise<void>((resolve, reject) => {
      cancelled = resolve;
      let started = false;
      const loadingTimer = setTimeout(() => { if (!started) reject(new Error('Voice playback did not start.')); }, 20000);
      const maximumTimer = setTimeout(() => reject(new Error('Voice playback timed out.')), 240000);
      const subscription = active.addListener('playbackStatusUpdate', status => {
        if (current !== generation) return;
        if (status.error) reject(new Error('Voice playback failed.'));
        if (status.playing) { started = true; clearTimeout(loadingTimer); publish('speaking'); }
        if (status.didJustFinish) { options.onDone?.(); resolve(); }
      });
      cleanup = () => { clearTimeout(loadingTimer); clearTimeout(maximumTimer); subscription.remove(); };
      active.play();
    });
    if (current === generation) stopServerSpeech();
  } catch (e) {
    if (current !== generation) return;
    stopServerSpeech(); publish('failed'); throw e;
  }
}
