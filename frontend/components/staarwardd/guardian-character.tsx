import { glow } from "@/lib/staarwardd/shadow";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ImageSourcePropType, StyleSheet, View } from "react-native";

import { GuardianMotionVideo, type GuardianMotionClip } from "@/components/staarwardd/guardian-motion-video";
import type { PortalId } from "@/lib/staarwardd/types";

export type GuardianState = "flying" | "approaching" | "accelerating" | "shieldReceive" | "hover" | "land" | "summoning" | "portalOpening" | "portalSelection" | "portalEntry" | "speaking" | "listening" | "idle" | "pointing" | "transitionExit" | "concerned" | "celebrating";
export type GuardianMood = "neutral" | "witty" | "focused" | "calm" | "empathetic" | "excited" | "stylish";
export type GuardianPortalMode = "hub" | PortalId;

const FLYING = require("@/assets/images/staarwardd/guardian-poses/flying.png") as ImageSourcePropType;
const SUMMON = require("@/assets/images/staarwardd/guardian-poses/summon.png") as ImageSourcePropType;
const GUIDE = require("@/assets/images/staarwardd/guardian-poses/guide.png") as ImageSourcePropType;

const moodColors: Record<GuardianMood, string> = { neutral: "#D8C6FF", witty: "#8FE6FF", focused: "#6CB4FF", calm: "#74E4CA", empathetic: "#F3A6C1", excited: "#F0D47C", stylish: "#D6A26E" };

function sourceFor(state: GuardianState) {
  if (["flying", "approaching", "accelerating", "portalEntry", "transitionExit"].includes(state)) return FLYING;
  if (["summoning", "portalOpening", "shieldReceive", "portalSelection", "celebrating"].includes(state)) return SUMMON;
  return GUIDE;
}

function isHandAction(state: GuardianState) { return ["summoning", "portalOpening", "pointing", "shieldReceive", "portalSelection"].includes(state); }

function motionClipFor(state: GuardianState): GuardianMotionClip | null {
  if (["flying", "approaching", "accelerating", "portalEntry", "transitionExit"].includes(state)) return "flight";
  if (["summoning", "portalOpening", "shieldReceive", "portalSelection", "celebrating"].includes(state)) return "summon";
  if (["hover", "land", "speaking", "listening", "idle", "pointing", "concerned"].includes(state)) return "hover";
  return null;
}

export function GuardianCharacter({ state, mood = "neutral", portalMode = "hub", size = 300, reducedMotion = false, onMotionEnd }: { state: GuardianState; mood?: GuardianMood; portalMode?: GuardianPortalMode; size?: number; reducedMotion?: boolean; onMotionEnd?: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const energy = useRef(new Animated.Value(0.2)).current;
  const leftHand = useRef(new Animated.Value(0)).current;
  const rightHand = useRef(new Animated.Value(0)).current;
  const poseMix = useRef(new Animated.Value(1)).current;
  const stateRef = useRef(state);
  const targetSource = sourceFor(state);
  const [visibleSource, setVisibleSource] = useState<ImageSourcePropType>(targetSource);
  const [previousSource, setPreviousSource] = useState<ImageSourcePropType | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const tint = moodColors[mood];
  const label = useMemo(() => `Guardian ${state.replace(/([A-Z])/g, " $1").toLowerCase()} in ${portalMode}`, [portalMode, state]);
  const motionClip = motionClipFor(state);

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [motionClip, state]);

  useEffect(() => {
    if (targetSource !== visibleSource) {
      setPreviousSource(visibleSource);
      setVisibleSource(targetSource);
      poseMix.setValue(0);
      Animated.timing(poseMix, { toValue: 1, duration: reducedMotion ? 0 : 220, useNativeDriver: true }).start(() => setPreviousSource(null));
    }
  }, [poseMix, reducedMotion, targetSource, visibleSource]);

  useEffect(() => {
    stateRef.current = state;
    const reset = () => { x.setValue(0); y.setValue(0); scale.setValue(1); rotate.setValue(0); opacity.setValue(1); energy.setValue(0.18); leftHand.setValue(0); rightHand.setValue(0); };
    reset();
    if (reducedMotion) { onMotionEnd?.(); return; }
    let animation: Animated.CompositeAnimation | undefined;
    if (["flying", "approaching", "accelerating"].includes(state)) {
      x.setValue(size * 0.9); y.setValue(-size * 0.58); scale.setValue(0.22); opacity.setValue(0);
      animation = Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: state === "accelerating" ? 520 : 1260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: state === "accelerating" ? 520 : 1260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: state === "accelerating" ? 520 : 1260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(energy, { toValue: 0.95, duration: 860, useNativeDriver: true }),
      ]);
    } else if (["portalEntry", "transitionExit"].includes(state)) {
      animation = Animated.parallel([
        Animated.timing(x, { toValue: -size * 1.5, duration: 1120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(y, { toValue: -size * 0.32, duration: 1120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.16, duration: 1120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 960, useNativeDriver: true }),
        Animated.timing(energy, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]);
    } else if (isHandAction(state)) {
      leftHand.setValue(-1); rightHand.setValue(1);
      animation = Animated.parallel([
        Animated.sequence([Animated.timing(leftHand, { toValue: -0.16, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.timing(leftHand, { toValue: -0.55, duration: 390, easing: Easing.in(Easing.quad), useNativeDriver: true })]),
        Animated.sequence([Animated.timing(rightHand, { toValue: 0.16, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.timing(rightHand, { toValue: 0.55, duration: 390, easing: Easing.in(Easing.quad), useNativeDriver: true })]),
        Animated.sequence([Animated.timing(energy, { toValue: 1, duration: 330, useNativeDriver: true }), Animated.timing(energy, { toValue: 0.4, duration: 420, useNativeDriver: true })]),
        Animated.sequence([Animated.timing(rotate, { toValue: 1, duration: 330, useNativeDriver: true }), Animated.timing(rotate, { toValue: 0, duration: 420, useNativeDriver: true })]),
      ]);
    } else {
      animation = Animated.loop(Animated.parallel([
        Animated.sequence([Animated.timing(y, { toValue: -8, duration: state === "speaking" ? 360 : 1280, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(y, { toValue: 5, duration: state === "speaking" ? 360 : 1280, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]),
        Animated.sequence([Animated.timing(rotate, { toValue: 0.4, duration: 980, useNativeDriver: true }), Animated.timing(rotate, { toValue: -0.28, duration: 980, useNativeDriver: true })]),
        Animated.sequence([Animated.timing(energy, { toValue: state === "listening" ? 0.85 : 0.5, duration: 780, useNativeDriver: true }), Animated.timing(energy, { toValue: 0.2, duration: 780, useNativeDriver: true })]),
      ]));
    }
    animation.start(({ finished }) => { if (finished && !["idle", "hover", "speaking", "listening", "pointing", "land", "concerned"].includes(stateRef.current)) onMotionEnd?.(); });
    return () => animation?.stop();
  }, [energy, leftHand, onMotionEnd, opacity, reducedMotion, rightHand, rotate, scale, size, state, x, y]);

  const rotation = rotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-8deg", "0deg", "8deg"] });
  const haloScale = energy.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.42] });
  const haloOpacity = energy.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.66] });
  const leftX = leftHand.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.28, size * 0.28] });
  const rightX = rightHand.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.28, size * 0.28] });
  const handY = energy.interpolate({ inputRange: [0, 1], outputRange: [size * 0.08, -size * 0.04] });
  const actionOpacity = energy.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.55, 1] });
  return <View accessible accessibilityLabel={label} style={[styles.root, { width: size, height: size * 1.18, pointerEvents: "none" }]}>
    <Animated.View style={[styles.halo, { backgroundColor: tint, opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
    {isHandAction(state) && <><Animated.View style={[styles.handEnergy, { backgroundColor: tint, opacity: actionOpacity, transform: [{ translateX: leftX }, { translateY: handY }, { scale: haloScale }] }]} /><Animated.View style={[styles.handEnergy, { backgroundColor: tint, opacity: actionOpacity, transform: [{ translateX: rightX }, { translateY: handY }, { scale: haloScale }] }]} /><Animated.View style={[styles.energyArc, { borderColor: tint, opacity: actionOpacity, transform: [{ scale: haloScale }, { rotate: rotation }] }]} /></>}
    {motionClip && !reducedMotion && !videoFailed && <Animated.View style={[styles.motionLayer, { opacity, transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: rotation }] }]}><GuardianMotionVideo key={motionClip} clip={motionClip} size={size} onReady={() => setVideoReady(true)} onFailure={() => setVideoFailed(true)} /></Animated.View>}
    {previousSource && <Animated.Image source={previousSource} resizeMode="contain" style={[styles.character, { opacity: videoReady ? 0 : poseMix.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />}
    <Animated.Image source={visibleSource} resizeMode="contain" style={[styles.character, { opacity: videoReady ? 0 : (previousSource ? poseMix : opacity), transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: rotation }] }]} />
  </View>;
}

const styles = StyleSheet.create({ root: { justifyContent: "center", alignItems: "center" }, halo: { position: "absolute", width: "76%", aspectRatio: 1, borderRadius: 500 }, motionLayer: { position: "absolute", width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }, character: { width: "100%", height: "100%", position: "absolute" }, handEnergy: { position: "absolute", width: 26, height: 26, borderRadius: 26, ...glow("#FFFFFF", 14, 0.92) }, energyArc: { position: "absolute", width: "72%", height: "60%", borderRadius: 999, borderWidth: 2, borderTopColor: "transparent", borderBottomColor: "transparent" } });
