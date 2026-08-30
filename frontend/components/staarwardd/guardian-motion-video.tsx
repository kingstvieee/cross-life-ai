import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

export type GuardianMotionClip = "flight" | "hover" | "summon";

const CLIPS = {
  flight: require("@/assets/videos/guardian-flight.mp4"),
  hover: require("@/assets/videos/guardian-hover.mp4"),
  summon: require("@/assets/videos/guardian-summon.mp4"),
} as const;

const LOOPING: Record<GuardianMotionClip, boolean> = {
  flight: true,
  hover: true,
  summon: false,
};

export function GuardianMotionVideo({ clip, size, onReady, onFailure }: { clip: GuardianMotionClip; size: number; onReady: () => void; onFailure: () => void }) {
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(CLIPS[clip], (nextPlayer) => {
    nextPlayer.loop = LOOPING[clip];
    nextPlayer.muted = true;
    nextPlayer.play();
  });

  useEffect(() => {
    setFailed(false);
    player.loop = LOOPING[clip];
    player.muted = true;
    try {
      player.replay();
      player.play();
    } catch {
      setFailed(true);
      onFailure();
    }
  }, [clip, onFailure, player]);

  if (failed) return null;

  return <View style={[styles.root, { width: size, height: size * 1.18, pointerEvents: "none" }]}>
    <VideoView
      style={styles.video}
      player={player}
      nativeControls={false}
      contentFit="contain"
      surfaceType="textureView"
      playsInline
      onFirstFrameRender={onReady}
    />
  </View>;
}

const styles = StyleSheet.create({
  root: { position: "absolute", justifyContent: "center", alignItems: "center" },
  video: { width: "100%", height: "100%" },
});
