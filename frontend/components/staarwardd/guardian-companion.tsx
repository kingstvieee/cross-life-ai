import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GuardianCharacter, type GuardianState } from "@/components/staarwardd/guardian-character";
import { haptic } from "@/lib/staarwardd/haptics";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { PORTAL_EXPERIENCES } from "@/lib/staarwardd/experience";
import type { PortalId } from "@/lib/staarwardd/types";

export function GuardianCompanion({ portalId }: { portalId: PortalId }) {
  const audio = useStaarAudio();
  const experience = PORTAL_EXPERIENCES[portalId];
  const [state, setState] = useState<GuardianState>(experience.guardianState);
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (stateTimer.current) clearTimeout(stateTimer.current); }, []);
  const settle = (delay: number) => { if (stateTimer.current) clearTimeout(stateTimer.current); stateTimer.current = setTimeout(() => setState(experience.guardianState), delay); };
  const speak = () => { haptic.light(); setState("speaking"); void audio.speak(`${experience.guardianLine} ${experience.guardianFollowUp}`, experience.voiceRate); settle(1800); };
  const listen = () => { haptic.light(); setState("listening"); settle(1100); };
  const toggleSpeech = () => { haptic.light(); audio.setSpeechQuiet(!audio.speechQuiet); };
  return <View style={styles.stage}><View style={styles.aura} /><GuardianCharacter state={state} mood={experience.guardianMood} portalMode={portalId} size={244} /><View style={styles.controls}><Text style={styles.kicker}>{experience.guardianTone.toUpperCase()}</Text><Text style={styles.line}>{experience.guardianLine}</Text><View style={styles.actions}><Pressable accessibilityRole="button" onPress={speak} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>{audio.master && audio.voice && !audio.speechQuiet ? "HEAR" : "ENABLE VOICE"}</Text></Pressable><Pressable accessibilityRole="button" onPress={listen} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>RESPOND</Text></Pressable></View><View style={styles.speechRow}><Text style={styles.speechStatus}>{audio.speechQuiet ? "Speech is quiet; tasks continue." : "Speech ready"}</Text><Pressable accessibilityRole="button" accessibilityLabel={audio.speechQuiet ? "Resume Guardian speech" : "Quiet Guardian speech"} onPress={toggleSpeech} style={({ pressed }) => [styles.speechToggle, pressed && styles.pressed]}><Text style={styles.speechToggleText}>{audio.speechQuiet ? "RESUME SPEECH" : "QUIET SPEECH"}</Text></Pressable></View></View></View>;
}

const styles = StyleSheet.create({ stage: { minHeight: 258, overflow: "hidden", borderRadius: 26, marginTop: 14, borderWidth: 1, borderColor: "rgba(232,200,111,0.2)", backgroundColor: "rgba(4,10,25,0.28)", justifyContent: "flex-end" }, aura: { position: "absolute", width: 226, height: 226, borderRadius: 113, backgroundColor: "rgba(232,200,111,0.13)", top: 8, alignSelf: "center" }, controls: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, backgroundColor: "rgba(5,10,23,0.42)" }, kicker: { color: "#F3D77D", fontSize: 9, letterSpacing: 1.1, fontWeight: "800" }, line: { color: "#F5F8FF", fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 5 }, actions: { flexDirection: "row", gap: 8, marginTop: 11 }, primary: { flex: 1, minHeight: 39, justifyContent: "center", alignItems: "center", borderRadius: 11, backgroundColor: "#E8C86F" }, primaryText: { color: "#171821", fontSize: 9, letterSpacing: 0.65, fontWeight: "800" }, secondary: { flex: 1, minHeight: 39, justifyContent: "center", alignItems: "center", borderRadius: 11, borderWidth: 1, borderColor: "rgba(245,248,254,0.28)" }, secondaryText: { color: "#E9F0FE", fontSize: 9, letterSpacing: 0.65, fontWeight: "800" }, speechRow: { alignItems: "center", marginTop: 10 }, speechStatus: { color: "#B8C8DF", fontSize: 10 }, speechToggle: { minHeight: 30, marginTop: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,200,111,0.45)", justifyContent: "center" }, speechToggleText: { color: "#F1D988", fontSize: 9, letterSpacing: 0.65, fontWeight: "800" }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] } });
