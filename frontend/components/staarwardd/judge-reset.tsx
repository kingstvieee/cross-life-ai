import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { useGuardianActivity } from "@/lib/staarwardd/guardian-activity";
import { useHomeSafety } from "@/lib/staarwardd/home-safety-provider";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";
import { useDemoTimer } from "@/lib/staarwardd/demo-timer";
import { clearPortalVisits } from "@/lib/staarwardd/portal-visits";

// Storage keys not owned by a provider erase():
const RESET_KEYS = [
  "staarwardd.launch-seen", // LAUNCH_KEY in launch-sequence.tsx — clearing replays the Toronto opening
  "staarwardd.v13.audio-settings",
  "staar_intro_seen", // legacy pre-canonical keys
  "staar_tour_done",
];

// ONE-TAP judge reset: the visible hub button itself performs the full reset
// (no confirmation modal) and hard-navigates to a clean root entrance.
export function JudgeReset() {
  const router = useRouter();
  const audio = useStaarAudio();
  const { erase: eraseMemory } = usePreferenceMemory();
  const { erase: eraseActivity } = useGuardianActivity();
  const { erase: eraseSafety } = useHomeSafety();
  const { stop: stopDemoTimer } = useDemoTimer();
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      audio.stopAll();
      stopDemoTimer();
      clearPortalVisits();
      eraseMemory();
      eraseActivity();
      eraseSafety();
      await AsyncStorage.multiRemove(RESET_KEYS);
      audio.update({ master: false, music: false, ambience: false, voice: true, volume: 0.28 });
    } catch { /* reset stays best-effort */ }
    // Hard navigation to a clean root. On web a full page load guarantees the
    // entrance always replays (no stale mounted Index state, no query params).
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign("/");
      return;
    }
    setBusy(false);
    router.replace({ pathname: "/", params: { reset: String(Date.now()) } });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Judge reset — replay the full opening for a new judge"
      onPress={reset}
      style={styles.round}
      testID="judge-reset-btn"
    >
      {busy ? <ActivityIndicator size="small" color="#E8C86F" /> : <Text style={styles.roundText}>⟲</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,200,111,0.45)", alignItems: "center", justifyContent: "center" },
  roundText: { color: "#E8C86F", fontSize: 17, fontFamily: "serif" },
});
