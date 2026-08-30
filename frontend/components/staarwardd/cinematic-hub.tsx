import { glow, textGlow } from "@/lib/staarwardd/shadow";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioControls } from "@/components/staarwardd/audio-controls";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { MemorySheet } from "@/components/staarwardd/memory-sheet";
import { GuardianActivitySheet } from "@/components/staarwardd/guardian-activity-sheet";
import { GuardianInteractionCard } from "@/components/staarwardd/guardian-interaction-card";
import { PortalTransition } from "@/components/staarwardd/portal-transition";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { haptic } from "@/lib/staarwardd/haptics";
import { getHubAwakeningGreeting } from "@/lib/staarwardd/hub-greeting";
import { PORTALS } from "@/lib/staarwardd/portal-data";
import { canAutoApplyInApp, describeMemory } from "@/lib/staarwardd/preference-policy";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";
import { getRoutineBriefing } from "@/lib/staarwardd/routine-briefing";
import { createGuardianInteraction } from "@/lib/staarwardd/guardian-interaction";
import { useGuardianActivity } from "@/lib/staarwardd/guardian-activity";
import { JudgeReset } from "@/components/staarwardd/judge-reset";
import { JudgeDemo } from "@/components/staarwardd/judge-demo";
import { fetchGuardianLine, playGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { useDemoTimer } from "@/lib/staarwardd/demo-timer";
import type { PortalId } from "@/lib/staarwardd/types";

export function CinematicHub({ greet = false }: { greet?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const router = useRouter();
  const audio = useStaarAudio();
  const [audioOpen, setAudioOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [travelling, setTravelling] = useState<PortalId | null>(null);
  const [fieldAwake, setFieldAwake] = useState(false);
  const [routineInteraction, setRoutineInteraction] = useState<ReturnType<typeof createGuardianInteraction> | null>(null);
  const { memory, learnPortal } = usePreferenceMemory();
  const { record } = useGuardianActivity();
  const orbit = useRef(new Animated.Value(0)).current;
  const awakening = useRef(new Animated.Value(0)).current;
  const greeting = useRef(new Animated.Value(0)).current;
  const routineAnnounced = useRef(false);
  const greeted = useRef(false);
  const stopGreeting = useRef<(() => void) | null>(null);
  const [spokenLine, setSpokenLine] = useState<string | null>(null);
  const { start: startDemoTimer, stop: stopDemoTimer } = useDemoTimer();
  const { stopAll } = audio;

  // Native web modals can outlive a stacked route. Always dismiss the judge
  // experience and its audio when the Hub loses focus so the scorecard is the
  // only visible surface after automatic completion.
  useFocusEffect(useCallback(() => () => {
    setAboutOpen(false);
    stopDemoTimer();
    stopAll();
  }, [stopAll, stopDemoTimer]));

  // Guardian's spoken Onyx welcome as the Hub resolves from the entrance,
  // with the words shown as an on-screen subtitle line while he speaks.
  useEffect(() => {
    if (!greet || greeted.current || !audio.voice) return;
    greeted.current = true;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const line = await fetchGuardianLine("/api/guardian/greeting");
      if (!line || cancelled) return;
      stopGreeting.current = playGuardianLine(line.url, {
        onStart: () => { if (!cancelled) setSpokenLine(line.text); },
        onEnd: () => setSpokenLine(null),
      });
    }, 900);
    return () => { cancelled = true; clearTimeout(timer); stopGreeting.current?.(); };
  }, [greet, audio.voice]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 18000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [orbit]);

  const guardianGreeting = getHubAwakeningGreeting(memory.consented ? memory.displayName : undefined);
  const routine = getRoutineBriefing(memory);
  useEffect(() => {
    if (!memory.consented || !audio.master || !audio.voice || routineAnnounced.current) return;
    routineAnnounced.current = true;
    const timer = setTimeout(() => { void audio.speak(routine.narration, 0.9); }, 720);
    return () => clearTimeout(timer);
  }, [audio, memory.consented, routine.narration]);
  const reviewRoutine = () => {
    haptic.light();
    const interaction = createGuardianInteraction({ portalId: memory.preferredPortal ?? "home", action: memory.consented ? "Review my consented local portal routine" : "Review an optional portal routine", source: "routine", trigger: "You opened Guardian routine briefing" });
    setRoutineInteraction(interaction);
    record(interaction.policy.receipt);
    if (memory.consented && audio.master && audio.voice) void audio.speak(routine.narration, 0.9);
  };
  const enter = (id: PortalId) => {
    learnPortal(id);
    haptic.light();
    audio.playCue("portal");
    setTravelling(id);
    setTimeout(() => router.push({ pathname: "/portal/[id]", params: { id } } as never), 1280);
  };
  const awakenField = () => {
    if (fieldAwake) return;
    haptic.success();
    audio.playCue("shield");
    void audio.speak(guardianGreeting, 0.9);
    setFieldAwake(true);
    awakening.setValue(0);
    greeting.setValue(0);
    Animated.sequence([
      Animated.timing(awakening, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(awakening, { toValue: 0.42, duration: 1280, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(420),
      Animated.timing(greeting, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  if (travelling) return <PortalTransition portalId={travelling} />;

  const rotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const prepared = canAutoApplyInApp(memory);
  const awakeningScale = awakening.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1.72] });
  const awakeningOpacity = awakening.interpolate({ inputRange: [0, 0.42, 1], outputRange: [0, 0.28, 0.72] });
  const greetingTranslate = greeting.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#030715", "#0D1A46", "#22143C"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, compact && styles.headerCompact]}>
            <View>
              <Text style={styles.kicker}>STAAR COMMAND ENVIRONMENT</Text>
              <Text style={styles.title}>Seven worlds, one presence.</Text>
            </View>
            <View style={[styles.actions, compact && styles.actionsCompact]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Open preference memory" onPress={() => setMemoryOpen(true)} style={styles.round}><Text style={styles.roundText}>◈</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Open audio controls" onPress={() => setAudioOpen(true)} style={styles.round}><Text style={styles.roundText}>{audio.master ? "♫" : "◌"}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Open Guardian activity history" onPress={() => setActivityOpen(true)} style={styles.round}><Text style={styles.roundText}>≡</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Start automatic cross-life crisis judge demo" onPress={() => { startDemoTimer(240); setAboutOpen(true); }} style={styles.judgeButton}><Text style={styles.judgeButtonText}>RUN LIVE CRISIS DEMO · AUTO</Text></Pressable>
              <JudgeReset />
            </View>
          </View>

          <View style={[styles.commandField, compact && styles.commandFieldCompact]}>
            <Animated.View style={[styles.commandGlow, { transform: [{ rotate: rotation }] }]} />
            <Animated.View style={[styles.awakeningRing, { opacity: awakeningOpacity, transform: [{ scale: awakeningScale }] }]} />
            <View style={[styles.guardianVignette, compact && styles.guardianVignetteCompact]}>
              <GuardianCharacter state={fieldAwake ? "portalSelection" : "idle"} mood={fieldAwake ? "excited" : "focused"} portalMode="hub" size={compact ? 190 : 238} />
            </View>
            {fieldAwake && (
              <Animated.View style={[styles.greetingBubble, { opacity: greeting, transform: [{ translateY: greetingTranslate }] }]}>
                <Text style={styles.greetingLabel}>GUARDIAN</Text>
                <Text style={styles.greetingText}>{guardianGreeting}</Text>
              </Animated.View>
            )}
            <View style={[styles.gatewayField, compact && styles.gatewayFieldCompact]}>{PORTALS.map((portal, index) => <Gateway key={portal.id} portal={portal} index={index} awake={fieldAwake} onPress={() => enter(portal.id)} />)}</View>
          </View>
          <View style={styles.commandCopy}>
            <Text style={styles.commandKicker}>{fieldAwake ? "THE FIELD IS AWAKE" : "GUARDIAN AT CENTER"}</Text>
            <Text style={styles.commandPrompt}>{fieldAwake ? "Choose your first world." : "Seven functional worlds orbit one consent-first Guardian."}</Text>
            <View style={styles.commandActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Awaken the gateways" disabled={fieldAwake} onPress={awakenField} style={[styles.commandAction, fieldAwake && styles.commandActionAwake]}><Text style={styles.commandActionText}>{fieldAwake ? "GATEWAYS AWAKENED" : "AWAKEN THE GATEWAYS"}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => audio.toggleAmbient("hub")} style={styles.ambient}><Text style={styles.ambientText}>{audio.activeAmbient === "hub" ? "STOP HUB AMBIENCE" : "PLAY HUB AMBIENCE"}</Text></Pressable>
            </View>
          </View>

          {prepared && <Pressable accessibilityRole="button" onPress={() => setMemoryOpen(true)} style={styles.memoryBrief}><Text style={styles.memoryKicker}>LOCAL MEMORY PREPARED</Text><Text style={styles.memoryBriefText}>{describeMemory(memory)}</Text><Text style={styles.memoryBriefNote}>Prepares STAARWARDD only · no home device is controlled</Text></Pressable>}
          <View style={styles.routineBrief}>
            <View style={styles.routineHeader}><View><Text style={styles.routineKicker}>GUARDIAN ROUTINE</Text><Text style={styles.routineTitle}>{memory.consented ? routine.heading : "OPTIONAL PORTAL BRIEFING"}</Text></View><Text style={styles.routineCount}>7 WORLDS</Text></View>
            <Text style={styles.routinePrompt}>{memory.consented ? routine.prompt : "Enable local memory to tailor the Guardian’s questions to your routine."}</Text>
            <View style={styles.routineQuestions}>{routine.questions.map((item) => <View key={item.id} style={styles.routineQuestion}><Text style={styles.routineQuestionName}>{item.name}</Text><Text style={styles.routineQuestionText}>{item.question}</Text></View>)}</View>
            {routineInteraction && <GuardianInteractionCard interaction={routineInteraction} onSecondary={() => setRoutineInteraction(null)} />}
            <Pressable accessibilityRole="button" accessibilityLabel="Review portal routine" onPress={reviewRoutine} style={[styles.routineButton, (!memory.consented || !audio.master || !audio.voice) && styles.routineButtonMuted]}><Text style={styles.routineButtonText}>{audio.master && audio.voice && memory.consented ? "REVIEW & SPEAK PORTAL ROUTINE" : "REVIEW PORTAL ROUTINE"}</Text></Pressable>
            <Text style={styles.routineNote}>Voice is optional and off until Master + Voice are enabled. This routine uses only consented local preferences.</Text>
          </View>
          <View style={styles.legend}><Text style={styles.legendTitle}>{fieldAwake ? "A world is ready when you are." : "Begin by awakening the field."}</Text></View>
          <Pressable accessibilityRole="button" onPress={() => setCompanionOpen(true)} style={styles.companion}><View style={styles.pedestal}><Text style={styles.pedestalMark}>◇</Text></View><View style={styles.companionCopy}><Text style={styles.companionKicker}>COMPANION FIELD</Text><Text style={styles.companionTitle}>Awaiting approved companion assets.</Text><Text style={styles.companionDetail}>No Kaia, Atlas, watch, or hardware connection is claimed in this build.</Text></View><Text style={styles.chevron}>›</Text></Pressable>
          <Text style={styles.note}>JUDGE PATH · Entrance → Live Crisis → Work → Style → Connect → Scorecard</Text>
        </ScrollView>
      </SafeAreaView>
      <AudioControls open={audioOpen} onClose={() => setAudioOpen(false)} />
      <MemorySheet open={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <GuardianActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} />
      <JudgeDemo
        open={aboutOpen}
        memoryConsented={memory.consented}
        onClose={() => { setAboutOpen(false); stopDemoTimer(); }}
        onFinish={() => {
          setAboutOpen(false);
          stopDemoTimer();
          router.push("/scorecard" as never);
        }}
        onStage={(stage) => {
          const scenes: Array<{ portalId: PortalId; action: string; trigger: string } | null> = [
            null,
            { portalId: "work", action: "Triage the urgent product review and rank the three meeting blockers", trigger: "Four time-sensitive risks arrived together" },
            { portalId: "work", action: "Build the decision-first meeting recovery plan and owner map", trigger: "Guardian continued safe preparation without another command" },
            { portalId: "style", action: "Prepare the urgent product presentation dress rehearsal", trigger: "Work risks automatically crossed into Style" },
            { portalId: "relationships", action: "Analyze stakeholder conflict and prepare unsent team responses", trigger: "Meeting context automatically crossed into Connect" },
            { portalId: "work", action: "Re-synchronize Work, Style, and Connect after the metric and timing changed", trigger: "A new urgent signal changed all three worlds" },
            { portalId: "work", action: "Review the fully integrated crisis preparation and approval boundaries", trigger: "Judge crisis demonstration completed" },
          ];
          const scene = scenes[stage];
          if (!scene) return;
          learnPortal(scene.portalId);
          const interaction = createGuardianInteraction({ portalId: scene.portalId, action: scene.action, source: "local-preview", trigger: scene.trigger });
          record(interaction.policy.receipt);
        }}
      />
      <CompanionModal open={companionOpen} onClose={() => setCompanionOpen(false)} />
      {/* Elegant subtitle line while the Guardian speaks his welcome */}
      {spokenLine && (
        <View style={styles.subtitleWrap} testID="guardian-subtitle">
          <View style={styles.subtitleCard}>
            <Text style={styles.subtitleKicker}>GUARDIAN</Text>
            <Text style={styles.subtitleText}>{spokenLine}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Gateway({ portal, index, awake, onPress }: { portal: (typeof PORTALS)[number]; index: number; awake: boolean; onPress: () => void }) {
  const pos = gatewayPosition(index);
  const form = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const charge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const intro = Animated.timing(form, { toValue: 1, duration: 460, delay: 180 + index * 95, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1450 + index * 80, useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1450 + index * 80, useNativeDriver: true })]));
    intro.start(); loop.start();
    return () => { intro.stop(); loop.stop(); };
  }, [bob, form, index]);
  useEffect(() => {
    if (!awake) return;
    charge.setValue(0);
    const pulse = Animated.sequence([Animated.delay(index * 115), Animated.timing(charge, { toValue: 1, duration: 310, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.timing(charge, { toValue: 0.42, duration: 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]);
    pulse.start();
    return () => pulse.stop();
  }, [awake, charge, index]);
  const rise = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const scale = form.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const chargeScale = charge.interpolate({ inputRange: [0, 1], outputRange: [1, 1.17] });
  const chargeOpacity = charge.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] });
  return <Animated.View style={[styles.gatewayWrap, pos, { opacity: form, transform: [{ translateY: rise }, { scale }, { scale: chargeScale }] }]}><Pressable accessibilityRole="button" accessibilityLabel={`Enter ${portal.name}`} onPress={onPress} style={({ pressed }) => [styles.gateway, { borderColor: portal.color, ...glow(portal.color, awake ? 22 : 14, awake ? 0.95 : 0.72) }, awake && styles.gatewayAwake, pressed && styles.gatewayPressed]}><Image source={portal.image} resizeMode="cover" style={styles.gatewayImage} /><View style={[styles.gatewayTint, { backgroundColor: portal.color }]} /><Animated.View style={[styles.gatewayCharge, { opacity: chargeOpacity, borderColor: portal.color }]} /><View style={styles.gatewayShade} /><Text style={[styles.gatewayGlyph, { color: portal.accent }]}>{portal.glyph}</Text><Text style={styles.gatewayName}>{portal.name === "Relationships" ? "Connect" : portal.name}</Text></Pressable></Animated.View>;
}

function gatewayPosition(index: number) { const angle = (index / 7) * Math.PI * 2 - Math.PI / 2; return { left: `${50 + Math.cos(angle) * 38}%` as `${number}%`, top: `${50 + Math.sin(angle) * 38}%` as `${number}%` }; }
function InfoModal({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: () => void }) { return <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}><View style={styles.back}><View style={styles.modal}><Text style={styles.modalKicker}>JUDGE PREVIEW · 90 SECONDS</Text><Text style={styles.modalTitle}>See the product, not just the cinematic.</Text><Text style={styles.modalCopy}>1 · Watch the Guardian open the seven worlds.
2 · Enter Work and prepare a focused next-step plan.
3 · Return to the Hub and open a second world to see the same context model adapt.
4 · Open Activity and Memory to inspect the consent-first audit trail.

The preview is local and honest: no hardware or external action is claimed.</Text><Pressable accessibilityRole="button" accessibilityLabel="Start judge demo with Work" onPress={onStart} style={styles.modalButton}><Text style={styles.modalButtonText}>START WITH WORK →</Text></Pressable><Pressable accessibilityRole="button" onPress={onClose} style={styles.modalSecondary}><Text style={styles.modalSecondaryText}>CLOSE</Text></Pressable></View></View></Modal>; }
function CompanionModal({ open, onClose }: { open: boolean; onClose: () => void }) { return <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}><View style={styles.back}><View style={styles.modal}><Text style={styles.modalKicker}>COMPANION FIELD</Text><Text style={styles.modalTitle}>Approved companion visuals required.</Text><Text style={styles.modalCopy}>Kaia, Atlas, and STAARWARDD watch visual files are not available in this project. This field remains intentionally unavailable until approved assets and the entitlement-backed device protocol are supplied.</Text><Pressable accessibilityRole="button" onPress={onClose} style={styles.modalButton}><Text style={styles.modalButtonText}>CLOSE</Text></Pressable></View></View></Modal>; }

const styles = StyleSheet.create({
  subtitleWrap: { position: "absolute", left: 16, right: 16, bottom: 26, alignItems: "center", pointerEvents: "none" },
  subtitleCard: { maxWidth: 440, alignItems: "center", paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18, borderWidth: 1, borderColor: "rgba(232,200,111,0.5)", backgroundColor: "rgba(4,7,16,0.86)", ...glow("#E8C86F", 16, 0.3) },
  subtitleKicker: { color: "#E8C86F", fontSize: 8, letterSpacing: 1.6, fontWeight: "800" },
  subtitleText: { color: "#F5F8FF", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 3, fontWeight: "600", fontStyle: "italic" },
  root: { flex: 1, backgroundColor: "#080B14", overflow: "hidden" }, safe: { flex: 1 }, scroll: { paddingHorizontal: 15, paddingBottom: 32 }, orbitLine: { position: "absolute", width: 590, height: 590, borderRadius: 295, borderWidth: 1, borderColor: "rgba(232,200,111,0.26)", alignSelf: "center", top: 78, ...glow("#9C7CFF", 22, 0.45) }, header: { paddingTop: 18, paddingHorizontal: 5, flexDirection: "row", justifyContent: "space-between" }, actions: { flexDirection: "row", gap: 8 },
  headerCompact: { alignItems: "flex-start", flexDirection: "column", gap: 14 },
  actionsCompact: { width: "100%", justifyContent: "flex-end", flexWrap: "wrap" },
  gatewayFieldCompact: { transform: [{ scale: 0.84 }] }, kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.5, fontWeight: "800" }, title: { color: "#F4F7FF", fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 6 }, round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,200,111,0.45)", alignItems: "center", justifyContent: "center" }, roundText: { color: "#E8C86F", fontSize: 17, fontFamily: "serif" }, judgeButton: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(232,200,111,0.62)", backgroundColor: "rgba(232,200,111,0.12)", alignItems: "center", justifyContent: "center" }, judgeButtonText: { color: "#FFF0B8", fontSize: 9, letterSpacing: 0.75, fontWeight: "900" }, commandField: { width: "100%", maxWidth: 560, aspectRatio: 1, alignSelf: "center", marginTop: 18, overflow: "hidden", borderRadius: 280, borderWidth: 1, borderColor: "rgba(242,213,124,0.42)", backgroundColor: "rgba(4,9,24,0.88)", alignItems: "center", justifyContent: "center", ...glow("#8D72FF", 24, 0.38), elevation: 10 }, commandFieldCompact: { borderRadius: 999 }, commandGlow: { position: "absolute", width: "66%", aspectRatio: 1, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,235,169,0.42)", backgroundColor: "rgba(71,54,143,0.20)", ...glow("#E8C86F", 28, 0.42) }, awakeningRing: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 2.5, borderColor: "#F4DD9B", backgroundColor: "rgba(239,208,111,0.12)", ...glow("#F7D77A", 34, 0.85), pointerEvents: "none" }, guardianVignette: { width: 196, height: 258, borderRadius: 98, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#03060E", borderWidth: 1, borderColor: "rgba(240,210,120,0.36)", ...glow("#E8C86F", 24, 0.28) }, guardianVignetteCompact: { width: 152, height: 208, borderRadius: 76 }, greetingBubble: { position: "absolute", top: 28, width: 224, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(245,221,144,0.68)", backgroundColor: "rgba(6,15,37,0.9)", ...glow("#E8C86F", 18, 0.48), elevation: 9, alignItems: "center", pointerEvents: "none" }, greetingLabel: { color: "#F4DC92", fontSize: 8, letterSpacing: 1.25, fontWeight: "800" }, greetingText: { color: "#F5F8FF", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 3, fontWeight: "700" }, gatewayField: { ...StyleSheet.absoluteFillObject }, gatewayWrap: { position: "absolute", marginLeft: -39, marginTop: -39 }, gateway: { width: 78, height: 78, borderRadius: 39, borderWidth: 1.5, overflow: "hidden", backgroundColor: "#101A34", justifyContent: "flex-end", padding: 8, elevation: 8 }, gatewayAwake: { elevation: 12 }, gatewayPressed: { opacity: 0.74, transform: [{ scale: 0.94 }] }, gatewayImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.82 }, gatewayTint: { ...StyleSheet.absoluteFillObject, opacity: 0.2 }, gatewayCharge: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: 39, backgroundColor: "rgba(255,244,195,0.15)", pointerEvents: "none" }, gatewayShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,9,24,0.28)" }, gatewayGlyph: { fontSize: 16, zIndex: 1, ...textGlow("#07101F", 8) }, gatewayName: { color: "#F3F7FF", width: 66, textAlign: "center", fontSize: 8, lineHeight: 9, letterSpacing: 0.2, fontWeight: "800", zIndex: 1, marginTop: 3 }, commandCopy: { alignItems: "center", marginTop: 14, paddingHorizontal: 12 }, commandKicker: { color: "#F3D77D", fontSize: 9, letterSpacing: 1.15, fontWeight: "800", ...textGlow("#5B42B7", 10) }, commandPrompt: { color: "#D5E2FA", fontSize: 10, fontWeight: "600", marginTop: 4 }, commandActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 }, commandAction: { minHeight: 32, paddingHorizontal: 11, borderRadius: 10, justifyContent: "center", borderWidth: 1, borderColor: "rgba(244,221,155,0.72)", backgroundColor: "rgba(119,89,214,0.35)", ...glow("#F3D77D", 11, 0.42) }, commandActionAwake: { borderColor: "rgba(244,221,155,0.34)", backgroundColor: "rgba(244,221,155,0.16)" }, commandActionText: { color: "#FFF5C6", fontSize: 9, letterSpacing: 0.55, fontWeight: "800" }, ambient: { minHeight: 32, paddingHorizontal: 10, borderRadius: 10, justifyContent: "center", borderWidth: 1, borderColor: "rgba(239,246,255,0.2)", backgroundColor: "rgba(239,246,255,0.12)" }, ambientText: { color: "#F0F5FF", fontSize: 9, letterSpacing: 0.6, fontWeight: "800" }, memoryBrief: { marginTop: 13, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: "rgba(80,213,183,0.35)", backgroundColor: "rgba(80,213,183,0.08)" }, memoryKicker: { color: "#70E3C8", fontSize: 9, letterSpacing: 1, fontWeight: "800" }, memoryBriefText: { color: "#EFF7FF", fontSize: 14, fontWeight: "800", marginTop: 4 }, memoryBriefNote: { color: "#AFC7CF", fontSize: 10, marginTop: 3 }, routineBrief: { marginTop: 13, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(232,200,111,0.38)", backgroundColor: "rgba(13,21,46,0.76)", ...glow("#8D72FF", 14, 0.24) }, routineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, routineKicker: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.1, fontWeight: "800" }, routineTitle: { color: "#F4F7FF", fontSize: 16, fontWeight: "800", marginTop: 3 }, routineCount: { color: "#BFD0EC", fontSize: 9, letterSpacing: 0.8, fontWeight: "800", paddingTop: 4 }, routinePrompt: { color: "#C9D7EC", fontSize: 12, lineHeight: 17, marginTop: 8 }, routineQuestions: { marginTop: 11, gap: 7 }, routineQuestion: { borderLeftWidth: 2, borderLeftColor: "rgba(232,200,111,0.62)", paddingLeft: 9 }, routineQuestionName: { color: "#F1DB97", fontSize: 10, fontWeight: "800" }, routineQuestionText: { color: "#D9E3F3", fontSize: 11, lineHeight: 15, marginTop: 1 }, routineButton: { minHeight: 38, marginTop: 13, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(232,200,111,0.66)", backgroundColor: "rgba(232,200,111,0.14)" }, routineButtonMuted: { opacity: 0.62 }, routineButtonText: { color: "#FFF0B8", fontSize: 10, letterSpacing: 0.8, fontWeight: "800" }, routineNote: { color: "#96A8C4", fontSize: 10, lineHeight: 14, marginTop: 8 }, legend: { marginTop: 18, paddingHorizontal: 5 }, legendTitle: { color: "#F0F5FF", fontSize: 17, fontWeight: "800" }, companion: { minHeight: 114, borderRadius: 21, padding: 14, marginTop: 15, borderWidth: 1, borderColor: "rgba(232,200,111,0.28)", backgroundColor: "rgba(11,18,38,0.72)", flexDirection: "row", alignItems: "center" }, pedestal: { width: 60, height: 74, borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,200,111,0.58)", backgroundColor: "#15264D", justifyContent: "center", alignItems: "center", marginRight: 12 }, pedestalMark: { color: "#F3D77D", fontSize: 25 }, companionCopy: { flex: 1 }, companionKicker: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.1, fontWeight: "800" }, companionTitle: { color: "#F0F5FF", fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 4 }, companionDetail: { color: "#B1BED4", fontSize: 11, lineHeight: 15, marginTop: 4 }, chevron: { color: "#E8C86F", fontSize: 28, marginLeft: 6 }, note: { color: "#8795AF", fontSize: 10, textAlign: "center", marginTop: 16 }, back: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,5,12,0.76)", padding: 16 }, modal: { backgroundColor: "#111B30", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "rgba(232,200,111,0.28)" }, modalKicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.3, fontWeight: "800" }, modalTitle: { color: "#F4F7FF", fontSize: 22, fontWeight: "800", marginTop: 7 }, modalCopy: { color: "#C4CEE0", fontSize: 13, lineHeight: 20, marginTop: 9 }, modalButton: { minHeight: 50, borderRadius: 14, backgroundColor: "#E8C86F", justifyContent: "center", alignItems: "center", marginTop: 19 }, modalButtonText: { color: "#161720", fontSize: 11, letterSpacing: 0.8, fontWeight: "800" }, modalSecondary: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 8 }, modalSecondaryText: { color: "#AEBAD0", fontSize: 10, letterSpacing: 0.8, fontWeight: "800" }
});
