import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { setAudioModeAsync } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";

export type FilmProps = { muted: boolean; playing: boolean; onEnd: () => void; onError: () => void; onReady: () => void };

export default function StartupFilmPlayer({ muted, playing, onEnd, onError, onReady }: FilmProps) {
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const player = useVideoPlayer(require("@/assets/videos/guardian-startup.mp4"), p => {
    p.loop = false;
    // The native player must begin in the owner's chosen startup sound state.
    // This never changes the locked film or fabricates its embedded soundtrack.
    p.muted = muted;
  });

  useEffect(() => {
    let active = true;
    // Establish the foreground playback audio session before starting video:
    // iOS silent switch is distinct from the in-app mute control.
    // No background playback or microphone authorization is requested here.
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {
      // System audio-mode errors must not strand the user on the launch screen.
      // Actual audible output still requires physical-device verification.
    }).finally(() => {
      if (active) setAudioSessionReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const end = player.addListener("playToEnd", onEnd);
    const status = player.addListener("statusChange", event => {
      if (event.status === "error") onError();
      if (event.status === "readyToPlay") onReady();
    });
    if (player.status === "readyToPlay") onReady();
    return () => { end.remove(); status.remove(); };
  }, [player, onEnd, onError, onReady]);

  useEffect(() => {
    player.muted = muted;
    if (!audioSessionReady) return;
    try { if (playing) player.play(); else player.pause(); } catch { onError(); }
  }, [player, muted, playing, audioSessionReady, onError]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} playsInline />;
}
