import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";

import { GuardianCharacter, type GuardianState } from "@/components/staarwardd/guardian-character";
import { FlightParticleTrail } from "@/components/staarwardd/flight-particle-trail";
import { PortalOpeningGesture } from "@/components/staarwardd/portal-opening-gesture";
import { TorontoFlightScene } from "@/components/staarwardd/toronto-flight-scene";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { haptic } from "@/lib/staarwardd/haptics";
import type { PortalId } from "@/lib/staarwardd/types";

const LAUNCH_KEY = "staarwardd.launch-seen";
const PORTALS: { id: PortalId; glyph: string; label: string; color: string }[] = [
  { id: "creativity", glyph: "✦", label: "CREATIVITY", color: "#B999FF" },
  { id: "work", glyph: "▥", label: "WORK", color: "#79BAFF" },
  { id: "home", glyph: "⌂", label: "HOME", color: "#F1B976" },
  { id: "wellbeing", glyph: "◉", label: "WELLBEING", color: "#79E4CA" },
  { id: "relationships", glyph: "∞", label: "RELATIONSHIPS", color: "#F4A7C2" },
  { id: "events", glyph: "◇", label: "EVENTS", color: "#F0D47C" },
  { id: "style", glyph: "△", label: "STYLE", color: "#D7A16F" },
];
type Phase = "flight" | "arrival" | "shield" | "summon" | "return" | "choose";
const TORONTO_TRAVERSE = require("@/assets/videos/guardian-toronto-traverse-v22.mp4");

export function useReturningUser() {
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);
  useEffect(() => { let active = true; AsyncStorage.getItem(LAUNCH_KEY).then((value) => { if (active) setReturning(value === "1"); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return { loading, returning, markSeen: () => void AsyncStorage.setItem(LAUNCH_KEY, "1") };
}

export function LaunchSequence({ onComplete, onSelectPortal }: { onComplete: () => void; onSelectPortal?: (id: PortalId) => void }) {
  const audio = useStaarAudio();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState<Phase>("flight");
  const [run, setRun] = useState(0);
  const [skipVisible, setSkipVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const pageOpacity = useRef(new Animated.Value(1)).current;
  const pageScale = useRef(new Animated.Value(1)).current;
  const cameraX = useRef(new Animated.Value(-18)).current;
  const cameraY = useRef(new Animated.Value(30)).current;
  const cameraScale = useRef(new Animated.Value(1.17)).current;
  const flightX = useRef(new Animated.Value(-260)).current;
  const flightY = useRef(new Animated.Value(86)).current;
  const flightScale = useRef(new Animated.Value(0.32)).current;
  const flightOpacity = useRef(new Animated.Value(0)).current;
  const skylineOpacity = useRef(new Animated.Value(1)).current;
  const shieldX = useRef(new Animated.Value(280)).current;
  const shieldY = useRef(new Animated.Value(-180)).current;
  const shieldScale = useRef(new Animated.Value(0.22)).current;
  const shieldSpin = useRef(new Animated.Value(0)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const portalOpacities = useRef(PORTALS.map(() => new Animated.Value(0))).current;
  const portalScales = useRef(PORTALS.map(() => new Animated.Value(0.2))).current;
  const playCueRef = useRef(audio.playCue);
  const leaveRef = useRef<(id?: PortalId) => void>(() => undefined);
  const stars = useMemo(() => Array.from({ length: 46 }, (_, index) => ({ left: `${(index * 29) % 103}%`, top: `${(index * 43) % 94}%`, size: 1 + (index % 3) })), []);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => setReducedMotion(false)); const timer = setTimeout(() => setSkipVisible(true), 620); return () => clearTimeout(timer); }, []);
  useEffect(() => { playCueRef.current = audio.playCue; }, [audio.playCue]);
  useEffect(() => {
    pageScale.setValue(1); cameraX.setValue(-18); cameraY.setValue(30); cameraScale.setValue(1.17); flightX.setValue(-260); flightY.setValue(86); flightScale.setValue(0.32); flightOpacity.setValue(0); skylineOpacity.setValue(1); shieldX.setValue(280); shieldY.setValue(-180); shieldScale.setValue(0.22); shieldOpacity.setValue(0); shieldSpin.setValue(0); portalOpacities.forEach((value) => value.setValue(0)); portalScales.forEach((value) => value.setValue(0.2)); setPhase("flight");
    if (reducedMotion) { flightX.setValue(0); flightY.setValue(0); flightScale.setValue(1); flightOpacity.setValue(1); shieldX.setValue(0); shieldY.setValue(0); shieldScale.setValue(1); shieldOpacity.setValue(1); portalOpacities.forEach((value) => value.setValue(1)); portalScales.forEach((value) => value.setValue(1)); setPhase("choose"); return; }
    const timers = [
      setTimeout(() => { playCueRef.current("traverse"); Animated.parallel([Animated.timing(flightOpacity, { toValue: 1, duration: 220, useNativeDriver: true }), Animated.timing(cameraScale, { toValue: 1.04, duration: 7000, useNativeDriver: true })]).start(); }, 160),
      setTimeout(() => { setPhase("shield"); playCueRef.current("storm"); Animated.timing(skylineOpacity, { toValue: 0.46, duration: 700, useNativeDriver: true }).start(); }, 15000),
      setTimeout(() => { setPhase("summon"); }, 21000),
      setTimeout(() => leaveRef.current(), 29000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cameraScale, cameraX, cameraY, flightOpacity, flightScale, flightX, flightY, pageScale, portalOpacities, portalScales, reducedMotion, run, shieldOpacity, shieldScale, shieldSpin, shieldX, shieldY, skylineOpacity]);

  const retry = () => setRun((value) => value + 1);
  const leave = useCallback((id?: PortalId) => { if (entering) return; haptic.light(); setEntering(true); audio.playCue("transition"); Animated.parallel([Animated.timing(pageOpacity, { toValue: 0, duration: reducedMotion ? 0 : 480, useNativeDriver: true }), Animated.timing(pageScale, { toValue: 1.08, duration: reducedMotion ? 0 : 480, useNativeDriver: true })]).start(() => id && onSelectPortal ? onSelectPortal(id) : onComplete()); }, [audio, entering, onComplete, onSelectPortal, pageOpacity, pageScale, reducedMotion]);
  useEffect(() => { leaveRef.current = leave; }, [leave]);
  const enableSoundAndReplay = () => { audio.update({ master: true, music: true, ambience: true }); setTimeout(retry, 90); };
  const guardianState: GuardianState = phase === "flight" ? "flying" : phase === "shield" ? "shieldReceive" : phase === "summon" ? "portalOpening" : phase === "return" ? "portalEntry" : "hover";
  const showTraverse = !reducedMotion && phase !== "choose";
  const shieldRotate = shieldSpin.interpolate({ inputRange: [0, 1], outputRange: ["-540deg", "0deg"] });
  const phaseTitle = phase === "flight" ? "TORONTO RESPONSE FLIGHT" : phase === "arrival" ? "GUARDIAN CLOSE-UP" : phase === "shield" ? "HIGH ALTITUDE RISE" : phase === "summon" ? "GRAND PORTAL SUMMONING" : phase === "return" ? "ORIGINAL STAAR LAYOUT" : "CHOOSE A DESTINATION";

  return <Animated.View style={[styles.root, { opacity: pageOpacity, transform: [{ scale: pageScale }] }]}><LinearGradient colors={["#01030B", "#081738", "#211542"]} style={StyleSheet.absoluteFill} />{stars.map((star, index) => <View key={index} style={[styles.star, { left: star.left as `${number}%`, top: star.top as `${number}%`, width: star.size, height: star.size, borderRadius: star.size }]} />)}<SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}><View style={styles.top}><Pressable accessibilityRole="button" onPress={enableSoundAndReplay} style={styles.soundToggle}><Text style={styles.soundToggleText}>{audio.master ? "SOUND ON" : "ENABLE SOUND"}</Text></Pressable>{skipVisible && <Pressable accessibilityRole="button" onPress={() => leave()} style={styles.skip}><Text style={styles.skipText}>SKIP CINEMATIC</Text></Pressable>}</View><View style={styles.stage}><Animated.View style={[StyleSheet.absoluteFill, { opacity: skylineOpacity, transform: [{ translateX: cameraX }, { translateY: cameraY }, { scale: cameraScale }] }]}><TorontoFlightScene /></Animated.View>{showTraverse && <TorontoTraverseVideo key={run} />}{!showTraverse && <><FlightParticleTrail visible={phase === "flight"} reducedMotion={reducedMotion} /><View style={styles.depthRail} /><View style={styles.stageGlow} />{phase === "summon" && <PortalOpeningGesture color="#F4DD9B" />}<Animated.View style={[styles.flyingGuardian, { opacity: flightOpacity, transform: [{ translateX: flightX }, { translateY: flightY }, { scale: flightScale }] }]}><GuardianCharacter state={guardianState} mood={phase === "summon" || phase === "return" ? "excited" : "focused"} size={330} reducedMotion={reducedMotion} /></Animated.View><Animated.View style={[styles.shield, { opacity: shieldOpacity, transform: [{ translateX: shieldX }, { translateY: shieldY }, { scale: shieldScale }, { rotate: shieldRotate }] }]}><View style={styles.shieldShell}><Text style={styles.shieldMark}>✦</Text></View></Animated.View></>}</View><View style={styles.copy}><Text style={styles.kicker}>{phaseTitle}</Text><Text style={styles.title}>{phase === "choose" ? "Where should we go?" : ""}</Text>{phase !== "choose" && <View style={styles.progress}><ActivityIndicator color="#E8C86F" /><Text style={styles.progressText}>{phase === "flight" ? "Scanning Toronto streets" : phase === "arrival" ? "The Guardian comes into view." : phase === "shield" ? "Rising above Toronto. Wings ignite." : phase === "summon" ? "The grand portal forms. Guardian enters." : phase === "return" ? "Returning to your original STAAR layout." : "Visible cinematic sequence in progress"}</Text></View>}</View>{phase === "choose" && <Pressable accessibilityRole="button" onPress={() => leave()} style={styles.hubButton}><Text style={styles.hubButtonText}>ENTER STAAR HUB</Text><Text style={styles.hubArrow}>→</Text></Pressable>}</SafeAreaView></Animated.View>;
}

function TorontoTraverseVideo() {
  const player = useVideoPlayer(TORONTO_TRAVERSE, (nextPlayer) => { nextPlayer.loop = false; nextPlayer.muted = true; nextPlayer.play(); });
  return <View pointerEvents="none" style={styles.traverseVideo}><VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="cover" playsInline surfaceType="textureView" /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#050817", overflow: "hidden" }, safe: { flex: 1, paddingHorizontal: 20, paddingVertical: 13, justifyContent: "space-between" }, star: { position: "absolute", backgroundColor: "#F6D985", opacity: 0.73 }, top: { height: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, soundToggle: { minHeight: 36, paddingHorizontal: 10, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,200,111,0.3)", backgroundColor: "rgba(13,23,48,0.65)" }, soundToggleText: { color: "#F0D47C", fontSize: 9, letterSpacing: 0.75, fontWeight: "800" }, skip: { minHeight: 44, paddingHorizontal: 6, justifyContent: "center" }, skipText: { color: "#DDE8FC", fontSize: 10, letterSpacing: 1.15, fontWeight: "800" }, stage: { flex: 1, minHeight: 410, alignItems: "center", justifyContent: "center", overflow: "hidden" }, traverseVideo: { ...StyleSheet.absoluteFillObject, overflow: "hidden", borderRadius: 22, opacity: 0.98 }, depthRail: { position: "absolute", height: 480, width: 2, backgroundColor: "rgba(232,200,111,0.25)", transform: [{ rotate: "38deg" }] }, stageGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(95,83,201,0.22)" }, flyingGuardian: { position: "absolute", alignSelf: "center", justifyContent: "center", alignItems: "center" }, shield: { position: "absolute", top: 85, right: 33 }, shieldShell: { width: 76, height: 86, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#153267", borderWidth: 2, borderColor: "#F0D47C", shadowColor: "#E8C86F", shadowOpacity: 0.8, shadowRadius: 18 }, shieldMark: { color: "#F9E59C", fontSize: 34 }, portalField: { position: "absolute", width: "100%", height: "100%" }, portalSlot: { position: "absolute", marginLeft: -42, marginTop: -33 }, portal: { width: 84, minHeight: 66, borderRadius: 23, backgroundColor: "rgba(9,19,43,0.81)", borderWidth: 1.4, alignItems: "center", justifyContent: "center", shadowColor: "#121A44", shadowOpacity: 0.55, shadowRadius: 10 }, portalDisabled: { opacity: 0.55 }, portalGlyph: { fontSize: 18 }, portalLabel: { color: "#EEF4FF", fontSize: 7, letterSpacing: 0.55, fontWeight: "800", marginTop: 3 }, copy: { minHeight: 88 }, kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.5, fontWeight: "800" }, title: { color: "#F5F8FF", fontSize: 23, fontWeight: "800", marginTop: 5 }, progress: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11 }, progressText: { color: "#B7C4DA", fontSize: 11, fontWeight: "600" }, hubButton: { minHeight: 56, borderRadius: 18, backgroundColor: "#E8C86F", paddingHorizontal: 19, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }, hubButtonText: { color: "#151721", fontSize: 12, letterSpacing: 0.7, fontWeight: "800" }, hubArrow: { color: "#151721", fontSize: 21 } });
