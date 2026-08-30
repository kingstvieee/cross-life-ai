import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { glow, textGlow } from "@/lib/staarwardd/shadow";

type DemoStage = {
  kicker: string;
  title: string;
  worlds: string[];
  user?: string;
  guardian: string;
  prediction?: string;
  receipt?: string;
  duration: number;
};

const STAGES: DemoStage[] = [
  {
    kicker: "LIVE PRODUCT SCENARIO",
    title: "One difficult task. Three worlds. One Guardian.",
    worlds: ["Work"],
    guardian: "Alright, judges—here is the situation. One complicated product meeting, a messy deck, and no time to babysit the process. Watch me organize the work, build the overview, run the Style dress rehearsal, and prepare the team handoff.",
    duration: 7000,
  },
  {
    kicker: "1 · WORK ANALYZES + REARRANGES",
    title: "The Guardian takes control of a difficult product task.",
    worlds: ["Work"],
    user: "Our product review is tomorrow. The deck is out of order, the team updates conflict, and I need to present the new launch plan.",
    guardian: "I have it. I analyzed the product brief and team notes, found two contradictions in the launch story, and rearranged the deck into problem, decision, evidence, rollout, and owners.",
    receipt: "Brief analyzed · work rearranged · no external action",
    duration: 10500,
  },
  {
    kicker: "2 · WORK BUILDS THE MEETING OVERVIEW",
    title: "The preparation continues without more portal hunting.",
    worlds: ["Work"],
    user: "Handle the team meeting preparation too.",
    guardian: "Already moving. I built the 30-minute overview: opening, product status, risk decisions, metric check, owner round, and close. I also surfaced the three questions the team must answer.",
    prediction: "LIVE ANALYSIS · Conflicting dates + unclear owners → move the decision before the metrics review",
    receipt: "Meeting overview prepared · team questions surfaced",
    duration: 11000,
  },
  {
    kicker: "3 · STYLE RUNS THE DRESS REHEARSAL",
    title: "The same context becomes presentation coaching.",
    worlds: ["Work", "Style"],
    user: "Now run the dress rehearsal and fix the way I am presenting it.",
    guardian: "Dress rehearsal is ready. I tightened your opening, simplified the crowded metrics slide, marked the pause before the recommendation, and prepared two answers for the hardest product objection.",
    prediction: "STYLE ADAPTATION · Dense evidence + rehearsal hesitation → simplify the slide and strengthen the opening",
    receipt: "Dress rehearsal prepared · delivery changes remain reversible",
    duration: 11500,
  },
  {
    kicker: "4 · CONNECT PREPARES THE TEAM ROOM",
    title: "The Guardian analyzes how the meeting will move.",
    worlds: ["Work", "Style", "Connect"],
    user: "What about the people in the room?",
    guardian: "I analyzed the team roles. Product needs clarity, Sales will challenge the audience number, and Engineering will protect the rollout date. I prepared neutral responses, owner handoffs, and follow-up drafts. Nothing is sent.",
    prediction: "TEAM PREDICTION · Sales + Engineering tension → prepare neutral decision framing before the meeting",
    receipt: "Team dynamics analyzed · follow-ups drafted, not sent",
    duration: 11500,
  },
  {
    kicker: "5 · ONE CROSS-LIFE RESULT",
    title: "The complete preparation is ready and inspectable.",
    worlds: ["Work", "Style", "Connect"],
    user: "Give me the final overview.",
    guardian: "You are ready. Work holds the analyzed brief and rearranged meeting plan. Style holds the rehearsed delivery. Connect holds the team read and follow-ups. One Guardian carried the same context across all three.",
    prediction: "CROSS-AI RESULT · Work analysis powered the Style rehearsal and the Connect team strategy",
    receipt: "Meeting plan ready · rehearsal ready · team drafts held · external actions: 0",
    duration: 14000,
  },
];

type Props = {
  open: boolean;
  memoryConsented: boolean;
  onClose: () => void;
  onStage: (stage: number) => void;
  onFinish?: () => void;
};

export function JudgeDemo({ open, memoryConsented, onClose, onStage, onFinish }: Props) {
  const audio = useStaarAudio();
  const [step, setStep] = useState(0);
  const spokenRef = useRef(-1);
  const recordedRef = useRef(new Set<number>());
  const stage = STAGES[step];
  const complete = step === STAGES.length - 1;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    spokenRef.current = -1;
    recordedRef.current = new Set();
    audio.update({ master: true, voice: true, ambience: true, music: true });
  }, [open]);

  useEffect(() => {
    if (!open || complete) return;
    const timer = setTimeout(() => setStep((value) => Math.min(value + 1, STAGES.length - 1)), stage.duration);
    return () => clearTimeout(timer);
  }, [complete, open, stage.duration, step]);

  useEffect(() => {
    if (!open || recordedRef.current.has(step)) return;
    recordedRef.current.add(step);
    onStage(step);
  }, [onStage, open, step]);

  useEffect(() => {
    if (!open || !audio.master || !audio.voice || spokenRef.current === step) return;
    spokenRef.current = step;
    const timer = setTimeout(() => void audio.speak(stage.guardian, 0.98), 320);
    return () => clearTimeout(timer);
  }, [audio.master, audio.voice, open, stage.guardian, step]);

  useEffect(() => {
    if (!open || !audio.master || !audio.ambience || audio.activeAmbient === "hub") return;
    audio.toggleAmbient("hub");
  }, [audio.activeAmbient, audio.ambience, audio.master, open]);

  const close = () => {
    audio.stopAll();
    onClose();
  };

  const replay = () => {
    audio.stopAll();
    setStep(0);
    spokenRef.current = -1;
    recordedRef.current = new Set();
    audio.update({ master: true, voice: true, ambience: true, music: true });
  };

  return (
    <Modal visible={open} animationType="fade" onRequestClose={close}>
      <LinearGradient colors={["#02040D", "#0B1432", "#1B1030"]} style={styles.root}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.eyebrow}>STAARWARDD · JUDGE EXPERIENCE</Text>
            <Text style={styles.brand}>CROSS-LIFE AI</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close judge demo" onPress={close} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.progressRow}>
          {STAGES.map((item, index) => (
            <View key={item.kicker} style={[styles.progress, index <= step && styles.progressActive]} />
          ))}
        </View>
        <Text style={styles.autoLabel}>{complete ? "DEMO COMPLETE · REVIEW THE RECEIPT" : "RUNNING AUTOMATICALLY · NO TAPS NEEDED"}</Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.worldTrail}>
            {["Work", "Style", "Connect"].map((world, index) => {
              const active = stage.worlds.includes(world);
              return (
                <View key={world} style={styles.worldItem}>
                  <View style={[styles.worldOrb, active && styles.worldOrbActive]}>
                    <Text style={[styles.worldGlyph, active && styles.worldGlyphActive]}>{index === 0 ? "▥" : index === 1 ? "△" : "∞"}</Text>
                  </View>
                  <Text style={[styles.worldName, active && styles.worldNameActive]}>{world}</Text>
                  {index < 2 && <Text style={[styles.arrow, active && styles.arrowActive]}>→</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.hero}>
            <View style={styles.guardianWrap}>
              <GuardianCharacter state={complete ? "celebrating" : "speaking"} mood={complete ? "excited" : "focused"} portalMode="hub" size={148} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>{stage.kicker}</Text>
              <Text style={styles.title}>{stage.title}</Text>
              <Text style={styles.stageCount}>SCENE {step + 1} OF {STAGES.length}</Text>
            </View>
          </View>

          <View style={styles.transcript}>
            {stage.user && (
              <View style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.role}>PERSON</Text>
                <Text style={styles.userText}>{stage.user}</Text>
              </View>
            )}
            <View style={[styles.bubble, styles.guardianBubble]}>
              <Text style={[styles.role, styles.guardianRole]}>GUARDIAN</Text>
              <Text style={styles.guardianText}>{stage.guardian}</Text>
              {audio.master && audio.voice && <Text style={styles.speaking}>● SPEAKING</Text>}
            </View>
          </View>

          {stage.prediction && (
            <View style={styles.predictionCard}>
              <Text style={styles.predictionLabel}>LIVE CONTEXT BRIDGE</Text>
              <Text style={styles.predictionText}>{stage.prediction}</Text>
            </View>
          )}

          {stage.receipt && (
            <View style={styles.receiptCard}>
              <View>
                <Text style={styles.receiptLabel}>ACTIVITY RECEIPT</Text>
                <Text style={styles.receiptText}>{stage.receipt}</Text>
              </View>
              <Text style={styles.shield}>◇</Text>
            </View>
          )}

          {complete && (
            <View style={styles.memoryCard}>
              <Text style={styles.memoryLabel}>LOCAL MEMORY STATUS</Text>
              <Text style={styles.memoryTitle}>{memoryConsented ? "Consent is on." : "Memory remains off."}</Text>
              <Text style={styles.memoryCopy}>
                {memoryConsented
                  ? "Approved meeting preferences may be reused. Team follow-ups still require a separate send approval."
                  : "This demonstration used temporary scenario context only. Nothing from it will be remembered after reset."}
              </Text>
              <View style={styles.finalActions}>
                {onFinish && (
                  <Pressable accessibilityRole="button" accessibilityLabel="View the judge scorecard" onPress={() => { audio.stopAll(); onFinish(); }} style={styles.scorecardButton} testID="view-scorecard-btn">
                    <Text style={styles.scorecardText}>VIEW SCORECARD</Text>
                  </Pressable>
                )}
                <Pressable accessibilityRole="button" onPress={replay} style={styles.replayButton}>
                  <Text style={styles.replayText}>REPLAY DEMO</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={close} style={styles.doneButton}>
                  <Text style={styles.doneText}>RETURN TO HUB</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  eyebrow: { color: "#8593B8", fontSize: 9, letterSpacing: 1.8, fontWeight: "800" },
  brand: { color: "#FFFFFF", fontSize: 18, letterSpacing: 2.4, fontWeight: "900", marginTop: 3, ...textGlow("#B590FF", 10) },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
  closeText: { color: "#FFFFFF", fontSize: 28, lineHeight: 30, fontWeight: "300" },
  progressRow: { flexDirection: "row", gap: 5, paddingHorizontal: 20, paddingTop: 14 },
  progress: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)" },
  progressActive: { backgroundColor: "#E8C86F", ...glow("#E8C86F", 8, 0.7) },
  autoLabel: { color: "#8FE6CF", fontSize: 8, letterSpacing: 1.4, fontWeight: "900", paddingHorizontal: 20, paddingTop: 9 },
  scroll: { padding: 20, paddingBottom: 40, maxWidth: 880, width: "100%", alignSelf: "center" },
  worldTrail: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 22, gap: 6 },
  worldItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  worldOrb: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", backgroundColor: "rgba(255,255,255,0.04)" },
  worldOrbActive: { borderColor: "#E8C86F", backgroundColor: "rgba(232,200,111,0.14)", ...glow("#E8C86F", 12, 0.45) },
  worldGlyph: { color: "#58627A", fontSize: 15 },
  worldGlyphActive: { color: "#F7E8A9" },
  worldName: { color: "#5F6A86", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  worldNameActive: { color: "#E7ECFF" },
  arrow: { color: "#313A53", marginHorizontal: 3 },
  arrowActive: { color: "#E8C86F" },
  hero: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 18 },
  guardianWrap: { width: 138, height: 156, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heroCopy: { flex: 1 },
  kicker: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.6, fontWeight: "900", marginBottom: 7 },
  title: { color: "#FFFFFF", fontSize: 25, lineHeight: 31, fontWeight: "900", letterSpacing: -0.4 },
  stageCount: { color: "#7885A8", fontSize: 9, letterSpacing: 1.4, marginTop: 9, fontWeight: "800" },
  transcript: { gap: 10 },
  bubble: { borderRadius: 18, padding: 16, borderWidth: 1 },
  userBubble: { alignSelf: "flex-end", width: "88%", backgroundColor: "rgba(73,104,182,0.18)", borderColor: "rgba(125,153,224,0.34)" },
  guardianBubble: { width: "94%", backgroundColor: "rgba(19,12,38,0.86)", borderColor: "rgba(181,144,255,0.4)", ...glow("#8D67D7", 20, 0.2) },
  role: { color: "#9FB6ED", fontSize: 8, letterSpacing: 1.5, fontWeight: "900", marginBottom: 7 },
  guardianRole: { color: "#E8C86F" },
  userText: { color: "#EEF3FF", fontSize: 15, lineHeight: 22, fontWeight: "600" },
  guardianText: { color: "#FFFFFF", fontSize: 17, lineHeight: 25, fontWeight: "700" },
  speaking: { color: "#8FE6CF", fontSize: 8, letterSpacing: 1.3, fontWeight: "900", marginTop: 10 },
  predictionCard: { marginTop: 14, borderRadius: 16, padding: 15, backgroundColor: "rgba(47,131,116,0.14)", borderWidth: 1, borderColor: "rgba(108,226,201,0.36)" },
  predictionLabel: { color: "#8FE6CF", fontSize: 8, letterSpacing: 1.6, fontWeight: "900", marginBottom: 6 },
  predictionText: { color: "#D9FFF5", fontSize: 14, lineHeight: 21, fontWeight: "700" },
  receiptCard: { marginTop: 12, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(232,200,111,0.08)", borderWidth: 1, borderColor: "rgba(232,200,111,0.28)" },
  receiptLabel: { color: "#E8C86F", fontSize: 8, letterSpacing: 1.5, fontWeight: "900", marginBottom: 5 },
  receiptText: { color: "#E9E4D2", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  shield: { color: "#E8C86F", fontSize: 24 },
  memoryCard: { marginTop: 14, borderRadius: 20, padding: 18, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  memoryLabel: { color: "#9FB6ED", fontSize: 8, letterSpacing: 1.6, fontWeight: "900" },
  memoryTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: 6 },
  memoryCopy: { color: "#C2CAE0", fontSize: 13, lineHeight: 20, marginTop: 6 },
  finalActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  scorecardButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: "#E8C86F", backgroundColor: "rgba(232,200,111,0.16)", alignItems: "center", justifyContent: "center" },
  scorecardText: { color: "#F4E9C8", fontSize: 11, letterSpacing: 1.6, fontWeight: "800" },
  replayButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  replayText: { color: "#DDE3F4", fontSize: 10, letterSpacing: 1.1, fontWeight: "900" },
  doneButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#E8C86F" },
  doneText: { color: "#15120A", fontSize: 10, letterSpacing: 1.1, fontWeight: "900" },
});
