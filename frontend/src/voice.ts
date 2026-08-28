import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const player = createAudioPlayer();
let configured = false;

export async function playVoice(url: string): Promise<AudioPlayer> {
  if (!configured) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch {}
    configured = true;
  }
  player.replace({ uri: url });
  player.seekTo(0);
  player.play();
  return player;
}

export function stopVoice() {
  try {
    player.pause();
  } catch {}
}
