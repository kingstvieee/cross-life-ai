import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { GuardianCharacter, type GuardianState } from "@/components/staarwardd/guardian-character";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { PORTAL_BY_ID } from "@/lib/staarwardd/portal-data";
import { PORTAL_EXPERIENCES } from "@/lib/staarwardd/experience";
import type { PortalId } from "@/lib/staarwardd/types";

const WORLD_COPY: Record<PortalId, { prompt: string; action: string; state: GuardianState }> = {
  creativity: { prompt: "What wants to become?", action: "OPEN A SPARK", state: "portalOpening" },
  work: { prompt: "Name the move.", action: "FOCUS THE SIGNAL", state: "pointing" },
  home: { prompt: "What would make home easier?", action: "OPEN THE THRESHOLD", state: "shieldReceive" },
  wellbeing: { prompt: "Talk, reset, or sit?", action: "MAKE STILLNESS", state: "summoning" },
  relationships: { prompt: "What connection needs room?", action: "LINK THE PATH", state: "portalOpening" },
  events: { prompt: "What are we making room for?", action: "TRACE A ROUTE", state: "pointing" },
  style: { prompt: "Safe, sharp, or dangerous?", action: "OPEN THE ATELIER", state: "portalOpening" },
};

export function WorldActionScene({ portalId }: { portalId: PortalId }) {
  const portal = PORTAL_BY_ID[portalId];
  const experience = PORTAL_EXPERIENCES[portalId];
  const audio = useStaarAudio();
  const [ready, setReady] = useState(false);
  const spark = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const copy = WORLD_COPY[portalId];
  const accents = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ left: `${8 + ((index * 19) % 83)}%` as `${number}%`, top: `${13 + ((index * 29) % 62)}%` as `${number}%`, size: 3 + (index % 4) })), []);

  useEffect(() => {
    setReady(false); spark.setValue(0); sweep.setValue(0);
    const timers = [setTimeout(() => { void audio.speak(experience.guardianLine, experience.voiceRate); }, 760), setTimeout(() => setReady(true), 1280)];
    const animation = Animated.parallel([Animated.timing(spark, { toValue: 1, duration: 860, easing: Easing.out(Easing.cubic), useNativeDriver: true }), Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 4400, easing: Easing.linear, useNativeDriver: true }))]);
    animation.start();
    return () => { timers.forEach(clearTimeout); animation.stop(); };
  }, [audio, experience.guardianLine, experience.voiceRate, portalId, spark, sweep]);

  const sparkScale = spark.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1.2] });
  const sparkOpacity = spark.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 0.52] });
  const rotation = sweep.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const guardianState: GuardianState = ready ? "hover" : copy.state;
  return <View style={[styles.stage, { borderColor: `${portal.color}66` }]}>
    <WorldBackdrop portalId={portalId} color={portal.color} accent={portal.accent} rotation={rotation} />
    {accents.map((accent, index) => <Animated.View key={index} style={[styles.accent, { left: accent.left, top: accent.top, width: accent.size, height: accent.size, borderRadius: accent.size, backgroundColor: portal.accent, opacity: sparkOpacity }]} />)}
    <Animated.View style={[styles.spark, { backgroundColor: portal.accent, opacity: sparkOpacity, transform: [{ scale: sparkScale }] }]} />
    <GuardianCharacter state={guardianState} mood={experience.guardianMood} portalMode={portalId} size={230} />
    <View style={styles.overlay}><Text style={[styles.portalName, { color: portal.accent }]}>{portal.name.toUpperCase()}</Text><Text style={styles.prompt}>{copy.prompt}</Text><Pressable accessibilityRole="button" onPress={() => { setReady(false); void audio.speak(experience.guardianFollowUp, experience.voiceRate); setTimeout(() => setReady(true), 980); }} style={({ pressed }) => [styles.action, { borderColor: `${portal.accent}AA` }, pressed && styles.pressed]}><Text style={[styles.actionText, { color: portal.accent }]}>{copy.action}</Text></Pressable></View>
  </View>;
}

function WorldBackdrop({ portalId, color, accent, rotation }: { portalId: PortalId; color: string; accent: string; rotation: Animated.AnimatedInterpolation<string | number> }) {
  if (portalId === "creativity") return <><View style={[styles.paintCloud, { backgroundColor: `${color}44` }]} /><View style={[styles.canvas, { borderColor: accent }]} /><View style={[styles.worktable, { backgroundColor: `${accent}28` }]} /></>;
  if (portalId === "work") return <><Animated.View style={[styles.signalLattice, { borderColor: accent, transform: [{ rotate: rotation }] }]} /><View style={[styles.priorityBeam, { backgroundColor: `${accent}A0` }]} /></>;
  if (portalId === "home") return <><View style={[styles.doorway, { borderColor: accent }]} /><View style={[styles.floorPlane, { backgroundColor: `${color}35` }]} /></>;
  if (portalId === "wellbeing") return <><View style={[styles.waterOne, { borderColor: accent }]} /><View style={[styles.waterTwo, { borderColor: `${accent}88` }]} /><View style={[styles.stone, { backgroundColor: `${accent}66` }]} /></>;
  if (portalId === "relationships") return <><Animated.View style={[styles.constellation, { borderColor: accent, transform: [{ rotate: rotation }] }]} /><View style={[styles.constellationLine, { backgroundColor: `${accent}AA` }]} /></>;
  if (portalId === "events") return <><View style={[styles.cityRoute, { borderColor: accent }]} /><View style={[styles.venueBeacon, { backgroundColor: accent }]} /></>;
  return <><View style={[styles.wardrobeRail, { borderColor: accent }]} /><View style={[styles.mirror, { borderColor: `${accent}AA` }]} /><View style={[styles.fabric, { backgroundColor: `${color}4D` }]} /></>;
}

const styles = StyleSheet.create({ stage: { height: 305, marginTop: 12, borderRadius: 26, overflow: "hidden", borderWidth: 1, backgroundColor: "rgba(4,11,27,0.58)", justifyContent: "center", alignItems: "center" }, overlay: { position: "absolute", left: 16, right: 16, bottom: 13, alignItems: "center" }, portalName: { fontSize: 10, letterSpacing: 1.25, fontWeight: "800" }, prompt: { color: "#F5F8FF", fontSize: 16, fontWeight: "800", marginTop: 5 }, action: { marginTop: 10, minHeight: 34, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, justifyContent: "center" }, actionText: { fontSize: 9, letterSpacing: 0.9, fontWeight: "800" }, accent: { position: "absolute", shadowColor: "#FFFFFF", shadowOpacity: 0.9, shadowRadius: 7 }, spark: { position: "absolute", width: 62, height: 62, borderRadius: 62, shadowColor: "#FFFFFF", shadowOpacity: 0.75, shadowRadius: 25 }, paintCloud: { position: "absolute", width: 280, height: 190, borderRadius: 150, left: -62, top: 22 }, canvas: { position: "absolute", width: 106, height: 144, borderWidth: 2, borderRadius: 6, right: 28, top: 28, transform: [{ rotate: "9deg" }] }, worktable: { position: "absolute", width: 260, height: 48, borderRadius: 24, bottom: 55 }, signalLattice: { position: "absolute", width: 240, height: 240, borderWidth: 1, borderRadius: 42 }, priorityBeam: { position: "absolute", width: 3, height: 250, borderRadius: 3 }, doorway: { position: "absolute", width: 154, height: 238, borderWidth: 2, borderTopLeftRadius: 90, borderTopRightRadius: 90, bottom: 0 }, floorPlane: { position: "absolute", width: 460, height: 90, bottom: -33, transform: [{ perspective: 300 }, { rotateX: "58deg" }] }, waterOne: { position: "absolute", width: 300, height: 90, borderRadius: 150, borderWidth: 1.5, bottom: 40 }, waterTwo: { position: "absolute", width: 220, height: 55, borderRadius: 120, borderWidth: 1, bottom: 56 }, stone: { position: "absolute", width: 58, height: 30, borderRadius: 30, bottom: 68, left: 64 }, constellation: { position: "absolute", width: 230, height: 230, borderWidth: 1, borderRadius: 120, borderStyle: "dashed" }, constellationLine: { position: "absolute", width: 220, height: 1, transform: [{ rotate: "-27deg" }] }, cityRoute: { position: "absolute", width: 300, height: 185, borderRadius: 90, borderWidth: 1.5, borderStyle: "dashed", bottom: 30, transform: [{ rotate: "-18deg" }] }, venueBeacon: { position: "absolute", width: 12, height: 12, borderRadius: 12, right: 57, top: 62, shadowColor: "#FFFFFF", shadowOpacity: 0.9, shadowRadius: 15 }, wardrobeRail: { position: "absolute", width: 242, height: 1, borderWidth: 1, top: 68 }, mirror: { position: "absolute", width: 125, height: 200, borderWidth: 1.5, borderRadius: 70, right: 26, top: 26 }, fabric: { position: "absolute", width: 148, height: 180, borderRadius: 64, left: 20, bottom: 20, transform: [{ rotate: "-11deg" }] }, pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] } });
