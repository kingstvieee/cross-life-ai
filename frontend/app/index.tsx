import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { CinematicHub } from "@/components/staarwardd/cinematic-hub";
import { LaunchSequence, useReturningUser } from "@/components/staarwardd/launch-sequence";

export default function IndexScreen() {
  const router = useRouter();
  const { markSeen } = useReturningUser();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const [sessionEntered, setSessionEntered] = useState(false);
  const soundtrackRef = useRef<any>(null);
  const [soundtrackTail, setSoundtrackTail] = useState(false);
  const isWeb = Platform.OS === "web";

  useFocusEffect(useCallback(() => {
    const sound = soundtrackRef.current;
    return () => {
      if (sound) { sound.pause(); sound.currentTime = 0; }
      setSoundtrackTail(false);
    };
  }, []));

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
      src: "/audio/STAARWAARDD_Full_Launch_Enhanced_v1.mp3",
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
