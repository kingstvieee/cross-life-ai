import { Asset } from "expo-asset";
import { useEffect, useRef } from "react";
import type { FilmProps } from "./startup-film-player";

export default function StartupFilmPlayer({ muted, playing, onEnd, onError, onReady }: FilmProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
    if (playing) void video.play().catch(() => { /* Start button remains available. */ });
    else video.pause();
  }, [playing, muted]);
  return <video ref={ref} src={Asset.fromModule(require("@/assets/videos/guardian-startup.mp4")).uri} playsInline muted={muted}
    autoPlay={playing} loop={false} preload="auto" onEnded={onEnd} onError={onError} onCanPlay={onReady}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />;
}
