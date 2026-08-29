import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { PortalOpeningGesture } from "@/components/staarwardd/portal-opening-gesture";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { PORTAL_EXPERIENCES } from "@/lib/staarwardd/experience";
import { PORTAL_META_BY_ID } from "@/lib/staarwardd/portal-meta";
import type { PortalId } from "@/lib/staarwardd/types";

export function PortalTransition({ portalId }: { portalId: PortalId }) {
  const experience = PORTAL_EXPERIENCES[portalId];
  const portal = PORTAL_META_BY_ID[portalId];
  const audio = useStaarAudio();
  const field = useRef(new Animated.Value(0.15)).current;
  const particles = useMemo(() => Array.from({ length: 16 }, (_, index) => ({ left: `${6 + ((index * 23) % 86)}%` as `${number}%`, top: `${15 + ((index * 37) % 70)}%` as `${number}%`, size: 2 + (index % 3) })), []);
  const [stage, setStage] = useState<"react" | "open" | "entry">("react");
  useEffect(() => { audio.playCue("transition"); const timers = [setTimeout(() => setStage("open"), 260), setTimeout(() => setStage("entry"), 790)]; Animated.sequence([Animated.timing(field, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.timing(field, { toValue: 0.44, duration: 720, useNativeDriver: true })]).start(); return () => timers.forEach(clearTimeout); }, [audio, field]);
  return <View style={styles.root}><View style={[styles.deepField, { borderColor: portal.accent }]} /><Animated.View style={[styles.field, { backgroundColor: portal.color, opacity: field, transform: [{ scale: field }] }]} />{particles.map((particle, index) => <View key={index} style={[styles.spark, { left: particle.left, top: particle.top, width: particle.size, height: particle.size, borderRadius: particle.size, backgroundColor: portal.accent }]} />)}{stage === "open" && <PortalOpeningGesture color={portal.accent} />}{stage === "entry" && <View style={[styles.gateway, { borderColor: portal.accent, shadowColor: portal.accent }]} />}<GuardianCharacter state={stage === "react" ? "portalSelection" : stage === "open" ? "portalOpening" : "portalEntry"} mood={experience.guardianMood} portalMode={portalId} size={355} /><View style={styles.copy}><Text style={[styles.kicker, { color: portal.accent }]}>{portal.name.toUpperCase()}</Text><Text style={styles.actionLabel}>{stage === "react" ? "GUARDIAN REACTS" : stage === "open" ? "GATEWAY OPENS" : "ENTERING"}</Text></View></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#080B14", justifyContent: "center", alignItems: "center", overflow: "hidden" }, deepField: { position: "absolute", width: 540, height: 540, borderRadius: 270, borderWidth: 1, backgroundColor: "rgba(64,39,131,0.16)", shadowColor: "#E8C86F", shadowOpacity: 0.34, shadowRadius: 36 }, field: { position: "absolute", width: 430, height: 430, borderRadius: 215, shadowColor: "#FFFFFF", shadowOpacity: 0.35, shadowRadius: 26 }, spark: { position: "absolute", opacity: 0.88, shadowColor: "#FFFFFF", shadowOpacity: 0.95, shadowRadius: 10 }, gateway: { position: "absolute", width: 220, height: 290, borderRadius: 999, borderWidth: 3, backgroundColor: "rgba(5,10,24,0.28)", shadowOpacity: 0.68, shadowRadius: 34, elevation: 12 }, copy: { position: "absolute", left: 25, right: 25, bottom: 78, alignItems: "center" }, kicker: { fontSize: 10, letterSpacing: 1.6, fontWeight: "800", textShadowColor: "#080B14", textShadowRadius: 10 }, actionLabel: { color: "#F5F8FF", fontSize: 11, letterSpacing: 1.1, fontWeight: "800", marginTop: 7 } });
