import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { useGuardianActivity } from "@/lib/staarwardd/guardian-activity";
import { useHomeSafety } from "@/lib/staarwardd/home-safety-provider";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";

// Storage keys not owned by a provider erase():
const RESET_KEYS = [
  "staarwardd.launch-seen", // LAUNCH_KEY in launch-sequence.tsx — clearing replays the Toronto opening
  "staarwardd.v13.audio-settings",
  "staar_intro_seen", // legacy pre-canonical keys
  "staar_tour_done",
];

export function JudgeReset() {
  const router = useRouter();
  const audio = useStaarAudio();
  const { erase: eraseMemory } = usePreferenceMemory();
  const { erase: eraseActivity } = useGuardianActivity();
  const { erase: eraseSafety } = useHomeSafety();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      audio.stopAll();
      eraseMemory();
      eraseActivity();
      eraseSafety();
      await AsyncStorage.multiRemove(RESET_KEYS);
      audio.update({ master: false, music: false, ambience: false, voice: true, volume: 0.28 });
    } catch { /* reset stays best-effort */ }
    setBusy(false);
    setOpen(false);
    // Hard navigation to a clean root: the Index screen may still be mounted
    // with sessionEntered=true, so a soft replace would leave the judge on the
    // Hub. On web a full page load guarantees a fresh entrance; on native the
    // reset param tells index.tsx to drop its session state and replay.
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign("/");
    } else {
      router.replace({ pathname: "/", params: { reset: String(Date.now()) } });
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Judge reset — replay the full opening for a new judge"
        onPress={() => setOpen(true)}
        style={styles.round}
        testID="judge-reset-btn"
      >
        <Text style={styles.roundText}>⟲</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.back}>
          <View style={styles.modal}>
            <Text style={styles.kicker}>JUDGE RESET</Text>
            <Text style={styles.title}>Fresh run for the next judge.</Text>
            <Text style={styles.copy}>
              Clears local preference memory, Guardian activity receipts, home-safety consent and audio settings,
              then replays the full Toronto opening from the beginning. Nothing external is affected.
            </Text>
            <Pressable accessibilityRole="button" onPress={reset} style={styles.button} testID="judge-reset-confirm">
              {busy ? <ActivityIndicator color="#161720" /> : <Text style={styles.buttonText}>RESET & REPLAY OPENING</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.cancel} testID="judge-reset-cancel">
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,200,111,0.45)", alignItems: "center", justifyContent: "center" },
  roundText: { color: "#E8C86F", fontSize: 17, fontFamily: "serif" },
  back: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,5,12,0.76)", padding: 16 },
  modal: { backgroundColor: "#111B30", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "rgba(232,200,111,0.28)" },
  kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.3, fontWeight: "800" },
  title: { color: "#F4F7FF", fontSize: 22, fontWeight: "800", marginTop: 7 },
  copy: { color: "#C4CEE0", fontSize: 13, lineHeight: 20, marginTop: 9 },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: "#E8C86F", justifyContent: "center", alignItems: "center", marginTop: 19 },
  buttonText: { color: "#161720", fontSize: 11, letterSpacing: 0.8, fontWeight: "800" },
  cancel: { minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: 4 },
  cancelText: { color: "#8795AF", fontSize: 10, letterSpacing: 1, fontWeight: "800" },
});
