import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { PORTAL_EXPERIENCES } from "@/lib/staarwardd/experience";
import { PORTAL_META_BY_ID } from "@/lib/staarwardd/portal-meta";
import type { PortalId } from "@/lib/staarwardd/types";

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37) % 101}%`,
  top: `${(index * 61) % 97}%`,
  size: 2 + (index % 4),
  opacity: 0.11 + (index % 4) * 0.045,
}));

export function PortalAtmosphere({ portalId }: { portalId: PortalId }) {
  const pulse = useRef(new Animated.Value(0.25)).current;
  const experience = PORTAL_EXPERIENCES[portalId];
  const portal = PORTAL_META_BY_ID[portalId];
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.6, duration: 3200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.25, duration: 3200, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}><LinearGradient colors={experience.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /><Animated.View style={[styles.glow, { backgroundColor: portal.color, opacity: pulse }]} /><WorldSignal portalId={portalId} color={portal.accent} />{PARTICLES.map((particle, index) => <View key={index} style={[styles.particle, { left: particle.left as `${number}%`, top: particle.top as `${number}%`, width: particle.size, height: particle.size, borderRadius: particle.size, opacity: particle.opacity, backgroundColor: portal.accent }]} />)}<LinearGradient colors={["rgba(5,9,18,0.05)", "rgba(5,9,18,0.78)"]} locations={[0, 1]} style={StyleSheet.absoluteFill} /></View>;
}

function WorldSignal({ portalId, color }: { portalId: PortalId; color: string }) { if (portalId === "work") return <View style={[styles.grid, { borderColor: color }]} />; if (portalId === "home") return <View style={[styles.doorway, { borderColor: color }]} />; if (portalId === "wellbeing") return <View style={[styles.waterLine, { backgroundColor: color }]} />; if (portalId === "relationships") return <View style={styles.constellation}>{[0, 1, 2, 3, 4].map((item) => <View key={item} style={[styles.node, { backgroundColor: color, left: 18 + item * 54, top: 35 + (item % 2) * 35 }]} />)}</View>; if (portalId === "events") return <View style={[styles.city, { borderColor: color }]} />; if (portalId === "style") return <View style={[styles.rail, { borderColor: color }]} />; return <View style={[styles.canvasMark, { borderColor: color }]} />; }

const styles = StyleSheet.create({
  glow: { position: "absolute", width: 300, height: 300, borderRadius: 150, right: -85, top: 40 },
  particle: { position: "absolute" },
  grid: { position: "absolute", width: 250, height: 250, right: -65, top: 92, borderWidth: 1, opacity: 0.16, transform: [{ rotate: "45deg" }] }, doorway: { position: "absolute", width: 150, height: 210, borderTopLeftRadius: 80, borderTopRightRadius: 80, borderWidth: 2, opacity: 0.17, left: -28, bottom: 130 }, waterLine: { position: "absolute", width: 380, height: 2, opacity: 0.22, bottom: 180, left: -30, transform: [{ rotate: "-8deg" }] }, constellation: { position: "absolute", width: 290, height: 150, opacity: 0.42, top: 110, left: 10 }, node: { position: "absolute", width: 5, height: 5, borderRadius: 3 }, city: { position: "absolute", width: 290, height: 120, borderWidth: 1, borderTopWidth: 0, opacity: 0.17, bottom: 145, right: -55 }, rail: { position: "absolute", width: 260, height: 140, borderTopWidth: 2, opacity: 0.22, transform: [{ rotate: "-14deg" }], bottom: 160, right: -30 }, canvasMark: { position: "absolute", width: 170, height: 120, borderWidth: 1, opacity: 0.22, transform: [{ rotate: "11deg" }], top: 145, right: -20 },
});
