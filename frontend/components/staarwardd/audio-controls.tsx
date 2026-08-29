import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useStaarAudio } from "@/lib/staarwardd/audio-provider";

export function AudioControls({ open, onClose, title = "SOUND FIELD" }: { open: boolean; onClose: () => void; title?: string }) {
  const audio = useStaarAudio();
  return <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}><View style={styles.back}><View style={styles.card}><Text style={styles.kicker}>{title}</Text><Text style={styles.title}>Make the atmosphere yours.</Text><Text style={styles.copy}>Sound is off by default. Your device’s own audio and silent settings remain in control.</Text><AudioSwitch label="Master sound" value={audio.master} onValueChange={(value) => audio.update({ master: value })} /><AudioSwitch label="Music" value={audio.music} disabled={!audio.master} onValueChange={(value) => audio.update({ music: value })} /><AudioSwitch label="Ambient sound" value={audio.ambience} disabled={!audio.master} onValueChange={(value) => audio.update({ ambience: value })} /><AudioSwitch label="Guardian voice" value={audio.voice} disabled={!audio.master} onValueChange={(value) => audio.update({ voice: value })} /><View style={styles.volumeRow}><Text style={styles.volumeLabel}>VOLUME</Text><View style={styles.volumeButtons}>{[0.16, 0.28, 0.42].map((volume) => <Pressable key={volume} accessibilityRole="button" onPress={() => audio.update({ volume })} style={({ pressed }) => [styles.volumeButton, audio.volume === volume && styles.volumeActive, pressed && styles.pressed]}><Text style={[styles.volumeText, audio.volume === volume && styles.volumeTextActive]}>{volume === 0.16 ? "LOW" : volume === 0.28 ? "MID" : "HIGH"}</Text></Pressable>)}</View></View><Pressable accessibilityRole="button" onPress={() => { audio.stopAll(); onClose(); }} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><Text style={styles.closeText}>DONE</Text></Pressable></View></View></Modal>;
}

function AudioSwitch({ label, value, disabled, onValueChange }: { label: string; value: boolean; disabled?: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={[styles.row, disabled && styles.disabled]}><Text style={styles.rowText}>{label}</Text><Switch value={value} disabled={disabled} onValueChange={onValueChange} trackColor={{ false: "#34415A", true: "#B89031" }} thumbColor={value ? "#F4DE8B" : "#D6DFEF"} /></View>;
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: "rgba(2,5,12,0.76)", justifyContent: "flex-end", padding: 16 },
  card: { backgroundColor: "#111A2D", borderRadius: 24, padding: 21, borderWidth: 1, borderColor: "rgba(232,200,111,0.28)" },
  kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.4, fontWeight: "800" },
  title: { color: "#F5F8FF", fontSize: 23, fontWeight: "800", marginTop: 7 },
  copy: { color: "#AFBED4", fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 12 },
  row: { minHeight: 53, borderBottomWidth: 1, borderBottomColor: "rgba(219,229,255,0.1)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  disabled: { opacity: 0.45 }, rowText: { color: "#E8EEF9", fontSize: 15, fontWeight: "700" },
  volumeRow: { paddingTop: 16 }, volumeLabel: { color: "#93A3C0", fontSize: 10, letterSpacing: 1.1, fontWeight: "800" },
  volumeButtons: { flexDirection: "row", gap: 8, marginTop: 9 }, volumeButton: { flex: 1, minHeight: 38, justifyContent: "center", alignItems: "center", borderRadius: 11, borderWidth: 1, borderColor: "rgba(221,231,255,0.15)" }, volumeActive: { backgroundColor: "#E8C86F", borderColor: "#E8C86F" }, volumeText: { color: "#BFCBE0", fontSize: 10, fontWeight: "800", letterSpacing: 0.7 }, volumeTextActive: { color: "#181821" },
  close: { minHeight: 50, borderRadius: 14, backgroundColor: "#E8C86F", justifyContent: "center", alignItems: "center", marginTop: 20 }, closeText: { color: "#171821", fontSize: 11, fontWeight: "800", letterSpacing: 1 }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
