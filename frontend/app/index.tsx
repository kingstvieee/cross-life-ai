import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { CinematicHub } from "@/components/staarwardd/cinematic-hub";
import { LaunchSequence, useReturningUser } from "@/components/staarwardd/launch-sequence";

export default function IndexScreen() {
  const router = useRouter();
  const { markSeen } = useReturningUser();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  // The main URL always plays the complete canonical entrance on every fresh
  // page load â€” the opening-seen flag never short-circuits it. Direct /hub
  // stays available as the fast path.
  const [sessionEntered, setSessionEntered] = useState(false);
  const soundtrackRef = useRef<any>(null);
  const [soundtrackTail, setSoundtrackTail] = useState(false);
  const isWeb = Platform.OS === "web";

  // Keep the approved score playing across the cinematic-to-Hub handoff.
  // This owner survives LaunchSequence unmounting, but stops on navigation.
  useFocusEffect(useCallback(() => {
    const sound = soundtrackRef.current;
    return () => {
      if (sound) { sound.pause(); sound.currentTime = 0; }
      setSoundtrackTail(false);
    };
  }, []));

  // Judge Reset (native path): a fresh reset param drops session state so the
  // full entrance replays even though this screen stayed mounted.
  useEffect(() => {
    if (reset) {
      soundtrackRef.current?.pause();
      if (soundtrackRef.current) soundtrackRef.current.currentTime = 0;
      setSoundtrackTail(false);
      setSessionEntered(false);
    }
  }, [reset]);

  return <View style={{ flex: 1 }}>
    {isWeb && require("react-native-web").unstable_createElement("audio", {
      ref: soundtrackRef,
      src: "/audio/STAARWAARDD_Synced_Effects_v4.mp3",
      preload: "auto",
      onEnded: () => setSoundtrackTail(false),
      onError: () => setSoundtrackTail(false),
    })}
    {!sessionEntered ? (
      <LaunchSequence
        soundtrackRef={isWeb ? soundtrackRef : undefined}
        onComplete={() => {
          const sound = soundtrackRef.current;
          setSoundtrackTail(!!sound && !sound.paused && !sound.ended);
          markSeen(); setSessionEntered(true);
        }}
        onSelectPortal={(id) => { markSeen(); router.replace({ pathname: "/portal/[id]", params: { id } }); }}
      />
    ) : <CinematicHub greet waitForLaunchAudio={soundtrackTail} />}
  </View>;
}
