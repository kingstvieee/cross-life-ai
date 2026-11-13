import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

export type FilmProps = { muted: boolean; playing: boolean; onEnd: () => void; onError: () => void; onReady: () => void };

export default function StartupFilmPlayer({ muted, playing, onEnd, onError, onReady }: FilmProps) {
  const player = useVideoPlayer(require("@/assets/videos/guardian-startup.mp4"), p => {
    p.loop = false;
    p.muted = true;
  });
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
    try { if (playing) player.play(); else player.pause(); } catch { onError(); }
  }, [player, muted, playing, onError]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} playsInline />;
}
