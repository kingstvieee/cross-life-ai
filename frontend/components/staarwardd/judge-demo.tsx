import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { JudgeActionTheatre } from "@/components/staarwardd/judge-action-theatre";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { fetchGuardianSpokenText, playGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { glow, textGlow } from "@/lib/staarwardd/shadow";
import { useAuth } from "@/src/auth";

type DemoStage = {
  kicker: string;
  title: string;
  worlds: string[];
  user?: string;
  guardian: string;
  prediction?: string;
  receipt?: string;
  urgency: string;
  signals: string[];
  proactive: string[];
  systems: Array<{ name: string; status: string }>;
  duration: number;
};

const STAGES: DemoStage[] = [
  {
    kicker: "1 · LIVE CRISIS INTAKE",
    title: "Four urgent problems arrive at once.",
    worlds: ["Work"],
    guardian: "Judges, watch closely. The executive product review moved forward by 42 minutes, the launch metrics conflict, the deck no longer tells a decision story, and Product and Engineering disagree on the rollout. I am starting the safe, reversible preparation now and reporting every move.",
    urgency: "T–42 MIN · EXECUTIVE REVIEW MOVED FORWARD",
    signals: ["Meeting moved forward by 42 minutes", "Sales metric conflicts with dashboard", "Deck order hides the decision", "Rollout owners disagree"],
    proactive: ["Locked all external sends", "Opened one shared crisis context", "Ranked blockers by meeting risk"],
    systems: [{ name: "Calendar", status: "demo signal read" }, { name: "Docs", status: "3 local sources ready" }, { name: "Project", status: "12 tasks mapped" }, { name: "Messages", status: "send locked" }],
    duration: 8000,
  },
  {
    kicker: "2 · WORK TRIAGES WITHOUT WAITING",
    title: "The Guardian decides what must be solved first.",
    worlds: ["Work"],
    user: "This changed fast. I cannot manage all of it before the review.",
    guardian: "You do not have to. I already reconciled the product brief, dashboard snapshot, and team notes. The audience number is the critical conflict, the rollout owner is missing, and the recommendation appears nine slides too late. I moved those three risks to the front.",
    prediction: "RISK MODEL · Wrong audience metric would weaken the recommendation and trigger the first executive objection",
    receipt: "3 sources analyzed · 3 blockers ranked · user informed",
    urgency: "T–40 MIN · TRIAGE COMPLETE",
    signals: ["Audience: 18,000 in deck vs 11,400 in dashboard", "Rollout decision has no single owner", "Recommendation buried on slide 14"],
    proactive: ["Reconciled local demo sources", "Created a decision-first deck order", "Flagged the metric for owner confirmation"],
    systems: [{ name: "Docs", status: "contradictions found" }, { name: "Analytics", status: "demo snapshot compared" }, { name: "Project", status: "owner gap surfaced" }, { name: "Messages", status: "drafts only" }],
    duration: 9000,
  },
  {
    kicker: "3 · WORK BUILDS THE RECOVERY PLAN",
    title: "Preparation continues without another command.",
    worlds: ["Work"],
    guardian: "While you stay focused, I rebuilt the 30-minute review: a two-minute executive opening, the corrected product story, three decision points, an owner round, and a five-minute close. I also prepared the exact questions needed to resolve the metric and rollout conflict.",
    prediction: "PLAN ADAPTATION · Decision before metrics → executives understand what they must approve before discussion expands",
    receipt: "Meeting overview built · owners and decisions visible",
    urgency: "T–32 MIN · MEETING PLAN READY",
    signals: ["Three decisions require explicit owners", "Risk discussion was consuming twelve minutes", "Executive opening lacked a recommendation"],
    proactive: ["Re-sequenced the full agenda", "Built decision and owner cards", "Prepared a concise executive opening"],
    systems: [{ name: "Calendar", status: "30-minute run-of-show" }, { name: "Docs", status: "overview prepared" }, { name: "Project", status: "owners mapped" }, { name: "Meeting", status: "questions queued" }],
    duration: 9000,
  },
  {
    kicker: "4 · STYLE OPENS THE DRESS REHEARSAL",
    title: "Work context becomes presentation coaching automatically.",
    worlds: ["Work", "Style"],
    guardian: "I did not wait for a Style command. The crowded metric slide and rushed opening were already meeting risks, so I opened the dress rehearsal. I tightened your first 45 seconds, simplified the slide, marked the pause before the recommendation, and prepared two calm answers for the hardest objection.",
    prediction: "STYLE ADAPTATION · Dense slide + urgent room → clearer visual hierarchy, slower opening, stronger recommendation",
    receipt: "Dress rehearsal prepared · presentation changes reversible",
    urgency: "T–24 MIN · DRESS REHEARSAL ACTIVE",
    signals: ["Opening runs 28 seconds over", "Metric slide has three competing headlines", "Presenter rushes before recommendation"],
    proactive: ["Trimmed the opening to 45 seconds", "Converted one dense slide into three beats", "Prepared objection rehearsal prompts"],
    systems: [{ name: "Slides", status: "local preview revised" }, { name: "Voice", status: "rehearsal active" }, { name: "Notes", status: "speaker cues ready" }, { name: "Video", status: "no recording claimed" }],
    duration: 9500,
  },
  {
    kicker: "5 · CONNECT PREPARES THE HUMAN ROOM",
    title: "The Guardian anticipates conflict before the meeting.",
    worlds: ["Work", "Style", "Relationships"],
    guardian: "I also carried the same context into Relationships. Product needs a decision, Sales will challenge the corrected audience number, and Engineering will protect the rollout date. I prepared neutral language, owner handoffs, and separate follow-up drafts. Nothing has been sent.",
    prediction: "TEAM PREDICTION · Sales + Engineering tension → acknowledge both risks, then return the room to the decision",
    receipt: "Team dynamics analyzed · responses prepared · sends held",
    urgency: "T–17 MIN · TEAM STRATEGY READY",
    signals: ["Sales trusts the old audience estimate", "Engineering expects a phased rollout", "Product needs one accountable decision owner"],
    proactive: ["Mapped likely objections by role", "Prepared neutral decision framing", "Drafted unsent owner follow-ups"],
    systems: [{ name: "People", status: "demo stakeholder map" }, { name: "Mail", status: "drafts held" }, { name: "Chat", status: "no message sent" }, { name: "Tasks", status: "handoffs prepared" }],
    duration: 10000,
  },
  {
    kicker: "6 · A NEW DISRUPTION HITS",
    title: "The Guardian replans across all three worlds in real time.",
    worlds: ["Work", "Style", "Relationships"],
    guardian: "New signal: the executive joined early and Sales confirmed 11,400, not 18,000. I updated the recommendation, shortened the rehearsal, rebuilt the first objection response, and re-drafted the owner handoffs. I handled every reversible change immediately and kept the sends locked for you.",
    prediction: "REAL-TIME CROSSOVER · New metric changed the Work story, the Style rehearsal, and the Relationships response at once",
    receipt: "Plan re-synced across 3 worlds · user informed · external actions: 0",
    urgency: "T–09 MIN · EXECUTIVE JOINED EARLY",
    signals: ["Audience confirmed at 11,400", "Executive entered nine minutes early", "Original objection response is now outdated"],
    proactive: ["Updated the product recommendation", "Compressed rehearsal to one critical pass", "Rewrote team responses with confirmed data"],
    systems: [{ name: "Calendar", status: "timing adapted" }, { name: "Slides", status: "preview re-synced" }, { name: "Project", status: "owners re-sequenced" }, { name: "Messages", status: "re-drafted, not sent" }],
    duration: 9000,
  },
  {
    kicker: "7 · ONE CROSS-LIFE OUTCOME",
    title: "The crisis is handled, explained, and auditable.",
    worlds: ["Work", "Style", "Relationships"],
    user: "What did you handle while I focused on the rehearsal?",
    guardian: "Work now holds the corrected product story, decisions, owners, and agenda. Style holds the clear slide and rehearsed delivery. Relationships holds the stakeholder strategy and unsent follow-ups. One Guardian carried the context, adapted when the facts changed, and informed you at every step.",
    prediction: "WHY IT MATTERS · One context layer replaced five disconnected handoffs and prevented stale information from reaching the room",
    receipt: "Crisis prepared · 3 worlds synchronized · approvals preserved · external actions: 0",
    urgency: "READY · COMPLETE, VISIBLE CROSS-LIFE PREPARATION",
    signals: ["4 urgent risks resolved or contained", "3 worlds synchronized", "5 integration handoffs visible", "0 unapproved external actions"],
    proactive: ["Prepared the work", "Rehearsed the delivery", "Anticipated the people", "Adapted to the new signal"],
    systems: [{ name: "Calendar", status: "ready" }, { name: "Docs + Slides", status: "ready" }, { name: "Project + Tasks", status: "ready" }, { name: "Messages", status: "approval pending" }],
    duration: 14000,
  },
];

const GUARDIAN_VOICE_LINES = [
  "Judges, four urgent problems just arrived. I am opening one safe crisis context, ranking the meeting risks, and locking every external send.",
  "I reconciled the brief, dashboard, and notes. The audience metric is the critical conflict, so I am moving it and the missing owner to the front.",
  "I am rebuilding the review now: decision first, corrected story, explicit owners, and a concise executive opening.",
  "I carried the Work context into Style. Watch me trim the opening, simplify the crowded slide, and mark the pause before the recommendation.",
  "I carried the same context into Relationships. I am mapping each objection and drafting neutral follow-ups. Nothing will be sent without approval.",
  "New signal received. I am propagating the confirmed metric through Work, Style, and Relationships while keeping all sends locked.",
  "The preparation is complete. Three portals now share one current context, every change is visible, and human approval remains intact.",
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
  const { token } = useAuth();
  const { stopAll } = audio;
  const [step, setStep] = useState(0);
  const [visualDone, setVisualDone] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const spokenRef = useRef(-1);
  const recordedRef = useRef(new Set<number>());
  const scrollRef = useRef<ScrollView>(null);
  const stage = STAGES[step];
  const complete = step === STAGES.length - 1;
  const markVisualComplete = useCallback(() => setVisualDone(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    spokenRef.current = -1;
    recordedRef.current = new Set();
    audio.update({ master: true, voice: true, ambience: true, music: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setVisualDone(false);
    setVoiceDone(false);
    setVoicePlaying(false);
  }, [open, step]);

  useEffect(() => {
    if (!open || !visualDone || !voiceDone) return;
    const timer = setTimeout(() => {
      if (complete) {
        stopAll();
        onFinish?.();
      } else {
        setStep((value) => Math.min(value + 1, STAGES.length - 1));
      }
    }, complete ? 5200 : 2600);
    return () => clearTimeout(timer);
  }, [complete, onFinish, open, stopAll, visualDone, voiceDone]);

  useEffect(() => {
    if (!open || recordedRef.current.has(step)) return;
    recordedRef.current.add(step);
    onStage(step);
  }, [onStage, open, step]);

  useEffect(() => {
    if (!open || spokenRef.current === step) return;
    spokenRef.current = step;
    let cancelled = false;
    let stopVoice = () => {};
    const fallback = setTimeout(() => {
      if (!cancelled) { setVoicePlaying(false); setVoiceDone(true); }
    }, 26000);
    const begin = setTimeout(() => {
      void fetchGuardianSpokenText(GUARDIAN_VOICE_LINES[step], token).then((line) => {
        if (cancelled) return;
        if (!line) { setVoiceDone(true); return; }
        stopVoice = playGuardianLine(line.url, {
          onStart: () => { if (!cancelled) setVoicePlaying(true); },
          onEnd: () => { if (!cancelled) { setVoicePlaying(false); setVoiceDone(true); } },
        });
      });
    }, 500);
    return () => { cancelled = true; clearTimeout(begin); clearTimeout(fallback); stopVoice(); };
  }, [open, step, token]);

  useEffect(() => {
    if (!open || !audio.master || !audio.ambience || audio.activeAmbient === "hub") return;
    audio.toggleAmbient("hub");
  }, [audio.activeAmbient, audio.ambience, audio.master, open]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const detailTimer = setTimeout(() => scrollRef.current?.scrollTo({ y: 330, animated: true }), 3600);
    const evidenceTimer = setTimeout(() => scrollRef.current?.scrollTo({ y: complete ? 820 : 660, animated: true }), 6500);
    return () => { clearTimeout(detailTimer); clearTimeout(evidenceTimer); };
  }, [complete, open, step]);

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
            <Text style={styles.eyebrow}>STAARWAARDD · JUDGE EXPERIENCE</Text>
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
        <Text style={styles.autoLabel}>{complete ? "DEMO COMPLETE · REVIEW THE RECEIPT" : "SCENE ADVANCES AFTER VOICE + VISIBLE ACTIONS COMPLETE"}</Text>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.worldTrail}>
            {["Work", "Style", "Relationships"].map((world, index) => {
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

          <View style={styles.urgencyBanner}>
            <View style={styles.liveDot} />
            <View style={styles.urgencyCopy}>
              <Text style={styles.urgencyLabel}>SIMULATED LIVE TIMELINE</Text>
              <Text style={styles.urgencyText}>{stage.urgency}</Text>
            </View>
            <Text style={styles.autonomyBadge}>PROACTIVE</Text>
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
              {voicePlaying && <Text style={styles.speaking}>● GUARDIAN ONYX VOICE · SPEAKING</Text>}
            </View>
          </View>

          <JudgeActionTheatre step={step} actions={stage.proactive} onComplete={markVisualComplete} />

          <View style={styles.detailGrid}>
            <View style={[styles.detailPanel, styles.signalPanel]}>
              <Text style={styles.panelLabel}>LIVE SITUATION INPUTS</Text>
              {stage.signals.map((signal) => (
                <View key={signal} style={styles.detailRow}>
                  <Text style={styles.signalDot}>●</Text>
                  <Text style={styles.detailText}>{signal}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.detailPanel, styles.actionPanel]}>
              <Text style={styles.panelLabel}>GUARDIAN ACTIONS · NO NEW COMMAND</Text>
              {stage.proactive.map((action) => (
                <View key={action} style={styles.detailRow}>
                  <Text style={styles.actionCheck}>✓</Text>
                  <Text style={styles.detailText}>{action}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.integrationPanel}>
            <View style={styles.integrationHeader}>
              <View>
                <Text style={styles.panelLabel}>CROSS-LIFE INTEGRATION MAP</Text>
                <Text style={styles.integrationNote}>Connection-ready local demo · no live account, send, or device action claimed</Text>
              </View>
              <Text style={styles.safeBadge}>SAFE PREVIEW</Text>
            </View>
            <View style={styles.systemsRow}>
              {stage.systems.map((system) => (
                <View key={system.name} style={styles.systemChip}>
                  <Text style={styles.systemName}>{system.name}</Text>
                  <Text style={styles.systemStatus}>{system.status}</Text>
                </View>
              ))}
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
            <View style={styles.impactCard}>
              <Text style={styles.impactLabel}>WHY THE WORLD NEEDS THIS</Text>
              <Text style={styles.impactTitle}>People should not have to become the integration layer.</Text>
              <Text style={styles.impactCopy}>Disconnected calendars, documents, tasks, presentations, and conversations force people to repeat context while urgent facts change. Cross-Life AI keeps one consented context layer, prepares the next safe step immediately, explains every move, and preserves human approval for real-world consequences.</Text>
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
  urgencyBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 12, marginBottom: 16, backgroundColor: "rgba(233,92,92,0.1)", borderWidth: 1, borderColor: "rgba(255,113,113,0.36)" },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF6F6F", ...glow("#FF6F6F", 10, 0.8) },
  urgencyCopy: { flex: 1 },
  urgencyLabel: { color: "#FF9E9E", fontSize: 7, letterSpacing: 1.4, fontWeight: "900", marginBottom: 3 },
  urgencyText: { color: "#FFFFFF", fontSize: 12, letterSpacing: 0.5, fontWeight: "900" },
  autonomyBadge: { color: "#07140F", fontSize: 7, letterSpacing: 1.1, fontWeight: "900", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: "#8FE6CF" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  detailPanel: { flexGrow: 1, flexBasis: 280, borderRadius: 16, padding: 14, borderWidth: 1 },
  signalPanel: { backgroundColor: "rgba(255,118,118,0.07)", borderColor: "rgba(255,132,132,0.25)" },
  actionPanel: { backgroundColor: "rgba(77,204,174,0.08)", borderColor: "rgba(111,226,199,0.28)" },
  panelLabel: { color: "#9FB6ED", fontSize: 8, letterSpacing: 1.4, fontWeight: "900", marginBottom: 8 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 5 },
  signalDot: { color: "#FF8080", fontSize: 8, lineHeight: 18 },
  actionCheck: { color: "#8FE6CF", fontSize: 11, lineHeight: 18, fontWeight: "900" },
  detailText: { flex: 1, color: "#E8ECF8", fontSize: 11, lineHeight: 17, fontWeight: "600" },
  integrationPanel: { marginBottom: 14, borderRadius: 16, padding: 14, backgroundColor: "rgba(106,137,218,0.08)", borderWidth: 1, borderColor: "rgba(138,164,234,0.25)" },
  integrationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  integrationNote: { color: "#7F8BAA", fontSize: 8, lineHeight: 13, fontWeight: "600" },
  safeBadge: { color: "#AFC1F0", fontSize: 7, letterSpacing: 1, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "rgba(159,182,237,0.3)" },
  systemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  systemChip: { flexGrow: 1, flexBasis: 130, minHeight: 48, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  systemName: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", marginBottom: 3 },
  systemStatus: { color: "#8FE6CF", fontSize: 8, lineHeight: 12, fontWeight: "700", textTransform: "uppercase" },
  impactCard: { marginTop: 14, borderRadius: 20, padding: 18, backgroundColor: "rgba(143,230,207,0.1)", borderWidth: 1, borderColor: "rgba(143,230,207,0.35)", ...glow("#68CDB5", 20, 0.18) },
  impactLabel: { color: "#8FE6CF", fontSize: 8, letterSpacing: 1.5, fontWeight: "900" },
  impactTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 6 },
  impactCopy: { color: "#D0E8E2", fontSize: 13, lineHeight: 20, marginTop: 7, fontWeight: "600" },
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
