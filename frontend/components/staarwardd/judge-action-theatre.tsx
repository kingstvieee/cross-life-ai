import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { glow } from "@/lib/staarwardd/shadow";

// Soft success chime played as each theatre node completes.
let webChime: HTMLAudioElement | null = null;
let nativeChime: AudioPlayer | null = null;
function playChime(volume: number) {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      if (!webChime) webChime = new window.Audio("/audio/node-chime.mp3");
      webChime.volume = volume;
      webChime.currentTime = 0;
      void webChime.play().catch(() => {});
    } else {
      if (!nativeChime) nativeChime = createAudioPlayer(require("@/assets/audio/node-chime.mp3"));
      nativeChime.volume = volume;
      nativeChime.seekTo(0);
      nativeChime.play();
    }
  } catch { /* chime is optional */ }
}

const PREVIEWS = [
  { label: "CRISIS QUEUE", before: "4 signals arriving", after: "1 shared priority map", nodes: ["CALENDAR", "METRICS", "DECK", "TEAM"] },
  { label: "METRIC RECONCILIATION", before: "18,000 · deck", after: "11,400 · verified snapshot", nodes: ["BRIEF", "DASHBOARD", "NOTES", "OWNER CHECK"] },
  { label: "MEETING REBUILD", before: "Recommendation · slide 14", after: "Decision first · owners assigned", nodes: ["OPEN", "DECIDE", "OWNERS", "CLOSE"] },
  { label: "STYLE REHEARSAL", before: "73 sec · 3 headlines", after: "45 sec · 1 clear message", nodes: ["TRIM", "SIMPLIFY", "PAUSE", "REHEARSE"] },
  { label: "STAKEHOLDER ROOM", before: "Competing positions", after: "Neutral decision framing", nodes: ["PRODUCT", "SALES", "ENGINEERING", "SEND LOCKED"] },
  { label: "CROSS-LIFE RESYNC", before: "New fact · stale plan", after: "3 portals updated together", nodes: ["WORK", "STYLE", "RELATIONSHIPS", "APPROVAL"] },
  { label: "AUDITABLE OUTCOME", before: "Disconnected handoffs", after: "One consented context", nodes: ["PREPARED", "REHEARSED", "ANTICIPATED", "RECEIPTS"] },
];

type Props = { step: number; actions: string[]; onComplete: () => void };

export function JudgeActionTheatre({ step, actions, onComplete }: Props) {
  const [active, setActive] = useState(0);
  const audio = useStaarAudio();
  const masterRef = useRef(audio.master);
  masterRef.current = audio.master;
  const preview = PREVIEWS[step] ?? PREVIEWS[0];

  useEffect(() => {
    setActive(0);
    const timers = actions.map((_, index) => setTimeout(() => {
      setActive(index + 1);
      if (masterRef.current) playChime(0.22);
    }, 900 + index * 1850));
    const done = setTimeout(onComplete, 1500 + actions.length * 1850);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [actions, onComplete, step]);

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>LIVE ACTION THEATRE</Text><Text style={styles.title}>{preview.label}</Text></View>
        <Text style={styles.live}>● EXECUTING</Text>
      </View>
      <View style={styles.canvas}>
        <View style={styles.stateCard}><Text style={styles.stateLabel}>BEFORE</Text><Text style={styles.before}>{preview.before}</Text></View>
        <View style={styles.flow}><Text style={styles.flowText}>CONTEXT</Text><Text style={styles.arrow}>→</Text></View>
        <View style={[styles.stateCard, styles.afterCard]}><Text style={styles.stateLabel}>GUARDIAN OUTPUT</Text><Text style={styles.after}>{preview.after}</Text></View>
      </View>
      <View style={styles.nodes}>
        {preview.nodes.map((node, index) => <View key={node} style={[styles.node, index < active && styles.nodeDone, index === active && styles.nodeActive]}><Text style={[styles.nodeText, index <= active && styles.nodeTextActive]}>{index < active ? "✓ " : index === active ? "◉ " : "○ "}{node}</Text></View>)}
      </View>
      <View style={styles.log}>
        {actions.map((action, index) => <View key={action} style={styles.logRow}><Text style={[styles.status, index < active && styles.statusDone]}>{index < active ? "DONE" : index === active ? "WORKING" : "QUEUED"}</Text><Text style={styles.logText}>{action}</Text></View>)}
      </View>
      <Text style={styles.safety}>PREVIEW CHANGES ARE REVERSIBLE · EXTERNAL SENDS REMAIN LOCKED</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { marginTop: 14, marginBottom: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(143,230,207,0.38)", backgroundColor: "rgba(5,18,31,0.94)", ...glow("#55D9BA", 22, 0.2) },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  eyebrow: { color: "#8FE6CF", fontSize: 8, letterSpacing: 1.7, fontWeight: "900" },
  title: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", marginTop: 4 },
  live: { color: "#8FE6CF", fontSize: 8, letterSpacing: 1.1, fontWeight: "900" },
  canvas: { flexDirection: "row", alignItems: "stretch", gap: 8, marginTop: 14 },
  stateCard: { flex: 1, minHeight: 74, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,125,125,0.25)", backgroundColor: "rgba(255,105,105,0.07)" },
  afterCard: { borderColor: "rgba(143,230,207,0.35)", backgroundColor: "rgba(86,218,184,0.09)" },
  stateLabel: { color: "#8998B8", fontSize: 7, letterSpacing: 1.2, fontWeight: "900" },
  before: { color: "#FFB6B6", fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 7 },
  after: { color: "#CFFFF2", fontSize: 13, lineHeight: 18, fontWeight: "900", marginTop: 7 },
  flow: { width: 52, alignItems: "center", justifyContent: "center" },
  flowText: { color: "#E8C86F", fontSize: 6, letterSpacing: 0.7, fontWeight: "900" },
  arrow: { color: "#E8C86F", fontSize: 23 },
  nodes: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  node: { flexGrow: 1, flexBasis: 120, minHeight: 34, justifyContent: "center", paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" },
  nodeActive: { borderColor: "#E8C86F", backgroundColor: "rgba(232,200,111,0.11)" },
  nodeDone: { borderColor: "rgba(143,230,207,0.34)", backgroundColor: "rgba(143,230,207,0.08)" },
  nodeText: { color: "#65708B", fontSize: 8, letterSpacing: 0.6, fontWeight: "900" },
  nodeTextActive: { color: "#F3F7FF" },
  log: { marginTop: 13, gap: 7 },
  logRow: { flexDirection: "row", gap: 9, alignItems: "center" },
  status: { width: 52, color: "#697590", fontSize: 7, letterSpacing: 0.7, fontWeight: "900" },
  statusDone: { color: "#8FE6CF" },
  logText: { flex: 1, color: "#DCE6F6", fontSize: 10, lineHeight: 15, fontWeight: "700" },
  safety: { color: "#71809F", fontSize: 7, letterSpacing: 0.8, fontWeight: "800", marginTop: 13, textAlign: "center" },
});
