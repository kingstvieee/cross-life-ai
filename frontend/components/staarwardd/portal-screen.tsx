import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { haptic } from "@/lib/staarwardd/haptics";
import { INTERACTION_MODES, PORTAL_BY_ID } from "@/lib/staarwardd/portal-data";
import { createPreviewPlan } from "@/lib/staarwardd/planner";
import type { Horizon, InteractionMode, PortalId, TaskPreview } from "@/lib/staarwardd/types";
import { EventDiscovery } from "@/components/staarwardd/event-discovery";
import { PORTAL_EXPERIENCES, homeDayPart } from "@/lib/staarwardd/experience";
import { createGuardianInteraction } from "@/lib/staarwardd/guardian-interaction";
import { useGuardianActivity } from "@/lib/staarwardd/guardian-activity";
import { PortalAtmosphere } from "@/components/staarwardd/portal-atmosphere";
import { CreativityStudio } from "@/components/staarwardd/creativity-studio";
import { WorldActionScene } from "@/components/staarwardd/world-action-scene";
import { HomeSafetySheet } from "@/components/staarwardd/home-safety-sheet";
import { GuardianInteractionCard } from "@/components/staarwardd/guardian-interaction-card";
import { GuardianActivitySheet } from "@/components/staarwardd/guardian-activity-sheet";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { fetchGuardianLine, fetchGuardianSpokenText, playGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { notePortalVisit } from "@/lib/staarwardd/portal-visits";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";
import { useAuth } from "@/src/auth";
import type { PreferenceMemory } from "@/lib/staarwardd/preference-policy";

// One remembered preference, spoken aloud on a return visit to a world.
function memoryHighlightLine(memory: PreferenceMemory, portalId: PortalId, portalName: string): string | null {
  if (!memory.consented) return null;
  if (memory.preferredScene && memory.preferredRoom) return `Welcome back to ${portalName}. I remembered your ${memory.preferredScene} scene in the ${memory.preferredRoom}.`;
  if (memory.preferredScene) return `Welcome back to ${portalName}. I remembered you prefer the ${memory.preferredScene} scene.`;
  if (memory.preferredRoom) return `Welcome back to ${portalName}. I remembered the ${memory.preferredRoom} is your favorite space.`;
  if (memory.routineWindow) return `Welcome back to ${portalName}. I remembered your ${memory.routineWindow} routine.`;
  if (memory.displayName) return `Welcome back to ${portalName}, ${memory.displayName}. I remember you.`;
  if (memory.preferredPortal === portalId) return `Welcome back. I remembered ${portalName} is where you like to begin.`;
  return null;
}

const HORIZONS: { id: Horizon; label: string }[] = [
  { id: "now", label: "NOW" },
  { id: "today", label: "TODAY" },
  { id: "week", label: "THIS WEEK" },
];

export function PortalScreen({ portalId }: { portalId: PortalId }) {
  const portal = PORTAL_BY_ID[portalId];
  const router = useRouter();
  const [mode, setMode] = useState<InteractionMode>(portal.defaultMode);
  const [horizon, setHorizon] = useState<Horizon>("now");
  const [command, setCommand] = useState("");
  const [plan, setPlan] = useState(() => createPreviewPlan("", portalId));
  const [approvalTask, setApprovalTask] = useState<TaskPreview | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [guardianInteraction, setGuardianInteraction] = useState<ReturnType<typeof createGuardianInteraction> | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { record } = useGuardianActivity();
  const audio = useStaarAudio();
  const { memory } = usePreferenceMemory();
  const { token } = useAuth();
  const introSpoken = useRef(false);
  const experience = PORTAL_EXPERIENCES[portalId];

  // First visit: Guardian speaks the world's one-line intro. Return visits:
  // he recalls one remembered preference aloud instead (memory highlight).
  useEffect(() => {
    if (introSpoken.current || !audio.voice) return;
    introSpoken.current = true;
    const visit = notePortalVisit(portalId);
    let cancelled = false;
    let stop: (() => void) | null = null;
    const timer = setTimeout(async () => {
      const line = visit === 1
        ? await fetchGuardianLine(`/api/guardian/portal-intro/${portalId}`)
        : await (async () => {
            const text = memoryHighlightLine(memory, portalId, PORTAL_BY_ID[portalId].name);
            return text ? fetchGuardianSpokenText(text, token) : null;
          })();
      if (!line || cancelled) return;
      stop = playGuardianLine(line.url);
    }, 700);
    return () => { cancelled = true; clearTimeout(timer); stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalId, audio.voice]);

  const tasks = useMemo(() => plan[horizon], [horizon, plan]);
  const submitCommand = (value?: string) => {
    const request = value ?? command;
    haptic.light();
    setCommand(request);
    setPlan(createPreviewPlan(request, portalId));
    const interaction = createGuardianInteraction({ portalId, action: request, source: "manual", trigger: `You prepared a ${portal.name} request` });
    setGuardianInteraction(interaction);
    record(interaction.policy.receipt);
  };
  const exit = () => router.replace("/hub");
  const handleTask = (task: TaskPreview) => {
    if (task.sensitive) {
      setApprovalTask(task);
      return;
    }
    haptic.success();
    const interaction = createGuardianInteraction({ portalId, action: task.title, source: "local-preview", trigger: "You selected a local preview task", execution: "completed" });
    setGuardianInteraction(interaction);
    record(interaction.policy.receipt);
    Alert.alert("Added to your preview rhythm", "This task is available only in the current local preview. It has not been saved to a server.");
  };

  return <View style={styles.root}>
    <PortalAtmosphere portalId={portalId} />
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={experience.keepsHorizons ? tasks : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.nav}>
              <Pressable accessibilityRole="button" accessibilityLabel="Return to STAAR Hub" onPress={exit} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backArrow}>‹</Text><Text style={styles.backLabel}>HUB</Text></Pressable>
              <View style={styles.navActions}><Pressable accessibilityRole="button" accessibilityLabel="Open Guardian activity history" onPress={() => setActivityOpen(true)} style={({ pressed }) => [styles.memoryButton, pressed && styles.pressed]}><Text style={styles.memoryText}>ACTIVITY</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open memory and privacy information" onPress={() => setMemoryOpen(true)} style={({ pressed }) => [styles.memoryButton, pressed && styles.pressed]}><Text style={styles.memoryText}>MEMORY</Text></Pressable></View>
            </View>
            <View style={[styles.worldHeader, { borderColor: `${portal.color}66` }]}><Text style={[styles.eyebrow, { color: portal.accent }]}>{experience.world.toUpperCase()}</Text><Text style={styles.portalName}>{portal.name}</Text>{portalId === "home" && <Text style={styles.dayPart}>{homeDayPart() === "day" ? "DAYLIGHT ENVIRONMENT" : "NIGHT ENVIRONMENT"}</Text>}</View>
            <WorldActionScene portalId={portalId} />
            {portalId === "home" && <Pressable accessibilityRole="button" onPress={() => setSafetyOpen(true)} style={({ pressed }) => [styles.safetyEntry, pressed && styles.pressed]}><Text style={styles.safetyKicker}>HOME SAFETY GUARDIAN</Text><Text style={styles.safetyTitle}>Review connected-home readiness and local safety preferences.</Text><Text style={styles.safetyDetail}>No live sensor data is claimed until Google Home or Alexa access is authorized.</Text></Pressable>}
            {portalId === "creativity" ? <><CreativityStudio value={command} onChange={setCommand} onSubmit={submitCommand} />{guardianInteraction && <GuardianInteractionCard interaction={guardianInteraction} onSecondary={() => setGuardianInteraction(null)} />}</> : <><View style={[styles.nowCard, { borderColor: `${portal.color}55` }]}><View style={[styles.nowGlyph, { borderColor: `${portal.color}88` }]}><Text style={[styles.nowGlyphText, { color: portal.accent }]}>{portal.glyph}</Text></View><View style={styles.nowCopy}><Text style={styles.nowLabel}>WHAT MATTERS NOW</Text><Text style={styles.nowTitle}>{portal.focus}</Text></View></View>
            <Text style={styles.modeLabel}>HOW SHOULD {portal.name.toUpperCase()} HELP?</Text>
            <FlatList
              horizontal
              data={INTERACTION_MODES}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modeList}
              renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => { haptic.selection(); setMode(item); }} style={({ pressed }) => [styles.modeButton, mode === item && { backgroundColor: portal.color, borderColor: portal.color }, pressed && styles.pressed]}><Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item}</Text></Pressable>}
            />
            <View style={[styles.commandCard, { borderColor: `${portal.color}44` }]}>
              <View style={styles.commandHeading}><Text style={[styles.commandKicker, { color: portal.accent }]}>{mode.toUpperCase()} MODE</Text><Text style={styles.previewPill}>LOCAL PREVIEW</Text></View>
              <TextInput value={command} onChangeText={setCommand} onSubmitEditing={() => submitCommand()} returnKeyType="done" placeholder={portal.promptSeed} placeholderTextColor="#77849B" style={styles.commandInput} multiline maxLength={240} accessibilityLabel={`Describe what you need in ${portal.name}`} />
              <View style={styles.commandActions}>
                <Pressable accessibilityRole="button" onPress={() => Alert.alert("Voice input", "Voice input requires a connected transcription service. Text interaction and optional Guardian device voice are available in this build.")} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>VOICE INPUT</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => submitCommand()} style={({ pressed }) => [styles.primaryAction, { backgroundColor: portal.color }, pressed && styles.pressed]}><Text style={styles.primaryActionText}>PREPARE</Text><Text style={styles.primaryArrow}>→</Text></Pressable>
              </View>
            </View>
            {guardianInteraction && <GuardianInteractionCard interaction={guardianInteraction} onSecondary={() => setGuardianInteraction(null)} />}
            <Text style={styles.starterTitle}>START WITH ONE MOVE</Text>
            <FlatList horizontal data={portal.starterActions} keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.starterList} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => submitCommand(item)} style={({ pressed }) => [styles.starter, pressed && styles.pressed]}><Text style={styles.starterText}>{item}</Text><Text style={[styles.starterArrow, { color: portal.accent }]}>↗</Text></Pressable>} />
            <Text style={styles.signatureTitle}>WORLD AREAS</Text>
            <View style={styles.signatureGrid}>{experience.signatureAreas.map((item) => <Pressable key={item} accessibilityRole="button" onPress={() => submitCommand(item)} style={({ pressed }) => [styles.signatureCard, { borderColor: `${portal.color}55` }, pressed && styles.pressed]}><Text style={styles.signatureText}>{item}</Text><Text style={[styles.signatureMark, { color: portal.accent }]}>{portal.glyph}</Text></Pressable>)}</View></>}
            {portalId === "events" && <EventDiscovery />}
            {experience.keepsHorizons && <><View style={styles.horizonRow}>{HORIZONS.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => { haptic.selection(); setHorizon(item.id); }} style={({ pressed }) => [styles.horizonButton, horizon === item.id && { borderBottomColor: portal.color }, pressed && styles.pressed]}><Text style={[styles.horizonText, horizon === item.id && styles.horizonActive]}>{item.label}</Text></Pressable>)}</View><Text style={styles.summary}>{plan.summary}</Text></>}
            <View style={styles.dataBoundary}><Text style={styles.dataBoundaryTitle}>TRUSTWORTHY BY DESIGN</Text><Text style={styles.dataBoundaryText}>{experience.dataState}</Text></View>
          </View>
        }
        renderItem={({ item }) => <TaskCard task={item} color={portal.color} onPress={() => handleTask(item)} />}
        ListFooterComponent={<View style={styles.privacyCard}><View style={[styles.privacyTint, { backgroundColor: `${portal.color}22` }]} /><View style={styles.privacyCopy}><Text style={styles.privacyTitle}>A clear boundary</Text><Text style={styles.privacyText}>{portal.privacyCue}</Text></View></View>}
      />
      <Modal transparent visible={Boolean(approvalTask)} animationType="slide" onRequestClose={() => setApprovalTask(null)}>
        <View style={styles.modalBack}><View style={styles.modalCard}><Text style={styles.modalKicker}>APPROVAL REQUIRED</Text><Text style={styles.modalTitle}>{approvalTask?.title}</Text><Text style={styles.modalCopy}>This request may involve communication, registration, booking, purchasing, sharing, or an external change. The native preview cannot perform it.</Text><View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => setApprovalTask(null)} style={({ pressed }) => [styles.modalSecondary, pressed && styles.pressed]}><Text style={styles.modalSecondaryText}>NOT NOW</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { if (approvalTask) { const interaction = createGuardianInteraction({ portalId, action: approvalTask.title, source: "local-preview", trigger: "You approved a local preview review", approval: "approved", execution: "completed" }); setGuardianInteraction(interaction); record(interaction.policy.receipt); } haptic.success(); setApprovalTask(null); Alert.alert("Prepared for review", "Approval was recorded only in this local preview. No external action was executed."); }} style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed]}><Text style={styles.modalPrimaryText}>ACKNOWLEDGE</Text></Pressable></View></View></View>
      </Modal>
      <Modal transparent visible={memoryOpen} animationType="slide" onRequestClose={() => setMemoryOpen(false)}>
        <View style={styles.modalBack}><View style={styles.modalCard}><Text style={styles.modalKicker}>MEMORY & PRIVACY</Text><Text style={styles.modalTitle}>Nothing here becomes hidden history.</Text><Text style={styles.modalCopy}>This build provides local preview planning only. It does not create a cross-portal memory profile, sync content, or expose account data. Those capabilities require the original production backend and consent controls.</Text><Pressable accessibilityRole="button" onPress={() => setMemoryOpen(false)} style={({ pressed }) => [styles.modalPrimary, styles.fullWidth, pressed && styles.pressed]}><Text style={styles.modalPrimaryText}>CLOSE</Text></Pressable></View></View>
      </Modal>
      <HomeSafetySheet open={safetyOpen} onClose={() => setSafetyOpen(false)} />
      <GuardianActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} />
    </SafeAreaView>
  </View>;
}

function TaskCard({ task, color, onPress }: { task: TaskPreview; color: string; onPress: () => void }) {
  return <View style={[styles.task, task.sensitive && styles.taskSensitive]}><View style={styles.taskMeta}><Text style={[styles.taskPortal, { color }]}>{PORTAL_BY_ID[task.portalId].name.toUpperCase()}</Text><Text style={styles.taskTime}>{task.time}</Text></View><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text><Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.taskAction, task.sensitive && styles.taskApproval, pressed && styles.pressed]}><Text style={[styles.taskActionText, task.sensitive && styles.taskApprovalText]}>{task.sensitive ? "REVIEW ACTION" : task.action.toUpperCase()}</Text><Text style={[styles.taskArrow, task.sensitive && styles.taskApprovalText]}>→</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080B14" }, safe: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 16, paddingBottom: 28 },
  nav: { minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, navActions: { flexDirection: "row", gap: 6 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", paddingRight: 10 },
  backArrow: { color: "#E8C86F", fontSize: 31, lineHeight: 31, marginRight: 1 },
  backLabel: { color: "#D7E1F5", fontSize: 11, letterSpacing: 1.4, fontWeight: "800" },
  memoryButton: { minHeight: 40, borderRadius: 13, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(211,225,255,0.16)" },
  memoryText: { color: "#B5C4DD", fontSize: 10, letterSpacing: 1, fontWeight: "800" },
  worldHeader: { borderRadius: 22, padding: 19, borderWidth: 1, backgroundColor: "rgba(8,14,30,0.42)" },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, fontWeight: "800" },
  portalName: { color: "#F7FAFF", fontSize: 32, letterSpacing: -0.7, fontWeight: "800", marginTop: 6 },
  role: { color: "#D1DBEC", fontSize: 13, lineHeight: 18, marginTop: 5, maxWidth: "96%" },
  dayPart: { alignSelf: "flex-start", color: "#D8E3F6", fontSize: 9, letterSpacing: 1, fontWeight: "800", marginTop: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(236,246,255,0.12)" },
  nowCard: { marginTop: 13, backgroundColor: "#10192B", borderRadius: 18, padding: 15, flexDirection: "row", borderWidth: 1, borderColor: "rgba(200,219,255,0.11)" },
  nowGlyph: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, justifyContent: "center", alignItems: "center", marginRight: 12 },
  nowGlyphText: { fontSize: 19 },
  nowCopy: { flex: 1 },
  nowLabel: { color: "#8393AE", fontSize: 9, letterSpacing: 1.2, fontWeight: "800" },
  nowTitle: { color: "#EDF3FF", fontSize: 15, fontWeight: "700", marginTop: 4, lineHeight: 20 },
  safetyEntry: { marginTop: 13, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "rgba(232,200,111,0.35)", backgroundColor: "rgba(232,200,111,0.08)" }, safetyKicker: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.15, fontWeight: "800" }, safetyTitle: { color: "#F0F5FF", fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 4 }, safetyDetail: { color: "#BAC7DB", fontSize: 11, lineHeight: 16, marginTop: 4 },
  modeLabel: { color: "#8796B0", fontSize: 10, letterSpacing: 1.25, fontWeight: "800", marginTop: 23, marginBottom: 9 },
  modeList: { paddingRight: 8 },
  modeButton: { minHeight: 40, paddingHorizontal: 14, justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: "rgba(213,226,255,0.15)", marginRight: 8, backgroundColor: "#0E1525" },
  modeText: { color: "#B8C4D9", fontSize: 12, fontWeight: "700" },
  modeTextActive: { color: "#11151E" },
  commandCard: { marginTop: 15, backgroundColor: "#10192B", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(227,235,255,0.13)" },
  commandHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commandKicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.25, fontWeight: "800" },
  previewPill: { color: "#6FDFC5", fontSize: 9, letterSpacing: 0.9, fontWeight: "800", borderRadius: 9, backgroundColor: "rgba(80,213,183,0.1)", paddingVertical: 5, paddingHorizontal: 8 },
  commandInput: { color: "#F2F6FF", fontSize: 15, lineHeight: 21, minHeight: 75, paddingTop: 14, paddingHorizontal: 0, textAlignVertical: "top" },
  commandActions: { flexDirection: "row", gap: 9 },
  secondaryAction: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(221,231,255,0.18)", justifyContent: "center" },
  secondaryActionText: { color: "#CDD8EA", fontSize: 10, letterSpacing: 0.9, fontWeight: "800" },
  primaryAction: { flex: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  primaryActionText: { color: "#11151E", fontSize: 11, letterSpacing: 0.7, fontWeight: "800" },
  primaryArrow: { color: "#11151E", fontSize: 19, fontWeight: "700" },
  reply: { marginTop: 12, padding: 14, borderLeftWidth: 2, borderLeftColor: "#E8C86F", backgroundColor: "rgba(7,13,28,0.52)", borderRadius: 14 }, replyKicker: { fontSize: 9, letterSpacing: 1, fontWeight: "800" }, replyText: { color: "#E8EEF8", fontSize: 13, lineHeight: 19, marginTop: 5 },
  starterTitle: { color: "#8796B0", fontSize: 10, letterSpacing: 1.25, fontWeight: "800", marginTop: 23, marginBottom: 10 },
  starterList: { paddingRight: 12 },
  starter: { width: 160, minHeight: 78, padding: 13, marginRight: 9, borderRadius: 17, backgroundColor: "#0F1728", borderWidth: 1, borderColor: "rgba(209,222,250,0.12)", justifyContent: "space-between" },
  starterText: { color: "#E5ECF9", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  starterArrow: { fontSize: 17, marginTop: 4 },
  signatureTitle: { color: "#8796B0", fontSize: 10, letterSpacing: 1.25, fontWeight: "800", marginTop: 23, marginBottom: 10 }, signatureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, signatureCard: { width: "48.5%", minHeight: 66, borderRadius: 15, padding: 12, borderWidth: 1, backgroundColor: "rgba(6,12,25,0.43)", justifyContent: "space-between", flexDirection: "row", alignItems: "flex-end" }, signatureText: { color: "#E4ECFA", fontSize: 12, lineHeight: 16, fontWeight: "700", flex: 1 }, signatureMark: { fontSize: 15, marginLeft: 8 },
  horizonRow: { marginTop: 25, borderBottomWidth: 1, borderBottomColor: "rgba(205,220,250,0.12)", flexDirection: "row" },
  horizonButton: { flex: 1, minHeight: 43, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center", justifyContent: "center" },
  horizonText: { color: "#7E8EA8", fontSize: 10, letterSpacing: 0.7, fontWeight: "800" },
  horizonActive: { color: "#EFF5FF" },
  summary: { color: "#B5C1D6", fontSize: 13, lineHeight: 19, marginTop: 14, marginBottom: 13 },
  task: { backgroundColor: "#10192B", borderRadius: 19, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(209,224,255,0.11)" },
  taskSensitive: { borderColor: "rgba(232,200,111,0.42)" },
  taskMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskPortal: { fontSize: 10, letterSpacing: 1, fontWeight: "800" },
  taskTime: { color: "#7D8CA7", fontSize: 11, fontWeight: "600" },
  taskTitle: { color: "#F0F5FF", fontSize: 17, fontWeight: "700", marginTop: 9 },
  taskDetail: { color: "#B8C4D8", fontSize: 13, lineHeight: 19, marginTop: 5 },
  taskAction: { marginTop: 15, minHeight: 44, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#18243B", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  taskApproval: { backgroundColor: "rgba(232,200,111,0.15)", borderWidth: 1, borderColor: "rgba(232,200,111,0.35)" },
  taskActionText: { color: "#D9E4F9", fontSize: 10, letterSpacing: 0.9, fontWeight: "800" },
  taskApprovalText: { color: "#F2D881" },
  taskArrow: { color: "#D9E4F9", fontSize: 17 },
  dataBoundary: { padding: 14, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: "rgba(209,224,255,0.14)", backgroundColor: "rgba(6,12,25,0.5)" }, dataBoundaryTitle: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.15, fontWeight: "800" }, dataBoundaryText: { color: "#B6C3D8", fontSize: 12, lineHeight: 17, marginTop: 5 },
  privacyCard: { height: 106, borderRadius: 19, marginTop: 12, overflow: "hidden", justifyContent: "center", backgroundColor: "rgba(8,14,27,0.8)", borderWidth: 1, borderColor: "rgba(210,224,255,0.13)" }, privacyTint: { ...StyleSheet.absoluteFillObject },
  privacyCopy: { padding: 17 },
  privacyTitle: { color: "#F1F6FF", fontSize: 16, fontWeight: "800" },
  privacyText: { color: "#D0DAEB", fontSize: 12, lineHeight: 17, marginTop: 4, maxWidth: "92%" },
  modalBack: { flex: 1, backgroundColor: "rgba(2,5,12,0.74)", justifyContent: "flex-end", padding: 16 },
  modalCard: { backgroundColor: "#121C31", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "rgba(232,200,111,0.28)" },
  modalKicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.4, fontWeight: "800" },
  modalTitle: { color: "#F4F7FF", fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: 8 },
  modalCopy: { color: "#C4CEE0", fontSize: 14, lineHeight: 21, marginTop: 10 },
  modalActions: { flexDirection: "row", gap: 9, marginTop: 20 },
  modalSecondary: { flex: 1, minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: "rgba(220,230,255,0.18)", alignItems: "center", justifyContent: "center" },
  modalSecondaryText: { color: "#CBD6E8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  modalPrimary: { flex: 1, minHeight: 52, borderRadius: 15, backgroundColor: "#E8C86F", alignItems: "center", justifyContent: "center" },
  modalPrimaryText: { color: "#151721", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  fullWidth: { marginTop: 20 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
} satisfies Record<string, ViewStyle | TextStyle>);
