import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { haptic } from "@/lib/staarwardd/haptics";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";

type ArrivalMood = "Tired" | "Going out" | "Quiet" | "Regular";

export function GuardianArrival({ onComplete }: { onComplete: () => void }) {
  const audio = useStaarAudio();
  const { memory } = usePreferenceMemory();
  const [mood, setMood] = useState<ArrivalMood | null>(null);
  const [starting, setStarting] = useState(false);
  const rise = useRef(new Animated.Value(0)).current;
  const name = memory.consented && memory.displayName.trim() ? memory.displayName.trim() : "there";

  useEffect(() => { Animated.timing(rise, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [rise]);
  useEffect(() => { if (!mood) return; const line = mood === "Tired" ? `Welcome home, ${name}. I will keep the field calm.` : mood === "Going out" ? `Welcome home, ${name}. I will keep your next move light.` : mood === "Quiet" ? `Welcome home, ${name}. Quiet mode is yours.` : `Welcome home, ${name}. Starting up STAARWARDD Hub now.`; void audio.speak(line); }, [audio, mood, name]);

  const continueToHub = (selected: ArrivalMood) => { haptic.light(); setMood(selected); setStarting(true); setTimeout(onComplete, selected === "Regular" ? 1200 : 1900); };
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [32, 0] });
  return <View style={styles.root}><LinearGradient colors={["#030715", "#10234D", "#261A43"]} style={StyleSheet.absoluteFill} /><Animated.View style={[styles.content, { opacity: rise, transform: [{ translateY }] }]}><GuardianCharacter state="hover" mood={mood === "Tired" || mood === "Quiet" ? "calm" : "focused"} portalMode="hub" size={236} /><Text style={styles.kicker}>GUARDIAN ARRIVAL</Text><Text style={styles.title}>Welcome home, {name}.</Text><Text style={styles.summary}>{mood ? mood === "Tired" ? "A calmer field is prepared." : mood === "Going out" ? "Your next move can stay light." : mood === "Quiet" ? "Quiet mode is prepared in-app." : "Starting up STAARWARDD Hub now." : "How should the Hub meet you?"}</Text>{!mood && <View style={styles.choices}>{(["Tired", "Going out", "Quiet", "Regular"] as ArrivalMood[]).map((choice) => <Pressable key={choice} accessibilityRole="button" onPress={() => continueToHub(choice)} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}><Text style={styles.choiceText}>{choice}</Text></Pressable>)}</View>}{mood && <View style={styles.status}><Text style={styles.statusText}>{starting ? "STARTING UP…" : "READY"}</Text><Text style={styles.statusNote}>No live home data is connected. Open Home for deeper household review.</Text></View>}</Animated.View></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#080B14", justifyContent: "center", padding: 24 }, content: { alignItems: "center" }, kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginTop: 4 }, title: { color: "#F5F8FF", fontSize: 30, fontWeight: "800", marginTop: 8, textAlign: "center" }, summary: { color: "#C3D0E5", fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center", maxWidth: 275 }, choices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 9, marginTop: 23 }, choice: { minHeight: 46, minWidth: 114, borderRadius: 15, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(232,200,111,0.45)", backgroundColor: "rgba(232,200,111,0.09)" }, choiceText: { color: "#F1D988", fontSize: 12, fontWeight: "800" }, status: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(80,213,183,0.36)", backgroundColor: "rgba(80,213,183,0.08)", padding: 14, marginTop: 22, alignItems: "center" }, statusText: { color: "#73E3C9", fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, statusNote: { color: "#C0CDD8", fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 4 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });
