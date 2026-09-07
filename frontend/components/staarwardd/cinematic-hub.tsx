import { glow, textGlow } from "@/lib/staarwardd/shadow";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioControls } from "@/components/staarwardd/audio-controls";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { PortalTransition } from "@/components/staarwardd/portal-transition";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { haptic } from "@/lib/staarwardd/haptics";
import { PORTALS } from "@/lib/staarwardd/portal-data";
import { fetchGuardianLine, playGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { guardianEvent, guardianRuntime, type GuardianDecision } from "@/lib/staarwardd/guardian-runtime";
import type { PortalId } from "@/lib/staarwardd/types";

export function CinematicHub({ greet = false, waitForLaunchAudio = false }: { greet?: boolean; waitForLaunchAudio?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const router = useRouter();
  const audio = useStaarAudio();
  const [audioOpen, setAudioOpen] = useState(false);
  const [travelling, setTravelling] = useState<PortalId | null>(null);
  const [guardianSignal, setGuardianSignal] = useState<GuardianDecision | null>(null);
  const stopGreeting = useRef<(() => void) | null>(null);

  useFocusEffect(useCallback(() => () => {
    stopGreeting.current?.();
    audio.stopAmbient();
  }, [audio]));

  useEffect(() => {
    if (!greet || !audio.voice || waitForLaunchAudio) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const line = await fetchGuardianLine("/api/guardian/greeting");
      if (!line || cancelled) return;
      stopGreeting.current = playGuardianLine(line.url);
    }, 900);
    return () => { cancelled = true; clearTimeout(timer); stopGreeting.current?.(); };
  }, [audio.voice, greet, waitForLaunchAudio]);

  useEffect(() => {
    if (!waitForLaunchAudio) audio.playAmbient("hub");
    return () => audio.stopAmbient();
  }, [audio, waitForLaunchAudio]);

  useEffect(() => {
    let active = true;
    guardianRuntime.receive(
      guardianEvent(
        "HOME_ENTERED",
        "home",
        { domain: "home", scheduleConflict: true, relevance: "high", relatedPortals: ["work", "style", "relationships"] },
        { urgency: 0.78, userVisible: true }
      )
    ).then((decision) => { if (active) setGuardianSignal(decision); });
    return () => { active = false; };
  }, []);

  const enter = (id: PortalId) => {
    haptic.light();
    audio.playCue("portal");
    setTravelling(id);
    setTimeout(() => router.push({ pathname: "/portal/[id]", params: { id } } as never), 1280);
  };

  if (travelling) return <PortalTransition portalId={travelling} />;

  const creativity = PORTALS.find((p) => p.id === "creativity")!;
  const work = PORTALS.find((p) => p.id === "work")!;
  const home = PORTALS.find((p) => p.id === "home")!;
  const wellbeing = PORTALS.find((p) => p.id === "wellbeing")!;
  const relationships = PORTALS.find((p) => p.id === "relationships")!;
  const community = PORTALS.find((p) => p.id === "events")!;
  const style = PORTALS.find((p) => p.id === "style")!;

  return (
    <View style={styles.root} testID="staar-hub-production">
      <LinearGradient colors={["#050914", "#0B1730", "#24140B"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.topBar, compact && styles.topBarCompact]}>
            <View>
              <Text style={styles.brand}>STAARWAARDD</Text>
              <Text style={styles.brandSub}>THE WHOLE-LIFE AI · TORONTO</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open sound controls" onPress={() => setAudioOpen(true)} style={styles.soundButton}>
              <Text style={styles.soundButtonText}>{audio.master ? "SOUND ON" : "SOUND OFF"}</Text>
            </Pressable>
          </View>

          <View style={[styles.stage, compact && styles.stageCompact]}>
            {!compact && <View style={styles.sideColumn}>
              <PortalCard portal={creativity} onPress={() => enter(creativity.id)} tall />
              <PortalCard portal={home} onPress={() => enter(home.id)} tall />
              <PortalCard portal={relationships} onPress={() => enter(relationships.id)} tall />
            </View>}

            <View style={styles.centerColumn}>
              <View style={styles.guardianFrame}>
                <LinearGradient colors={["rgba(255,239,183,0.10)", "rgba(232,200,111,0.05)", "rgba(0,0,0,0.12)"]} style={StyleSheet.absoluteFill} />
                <View style={styles.guardianHalo} />
                <Text style={styles.guardianLabel}>GUARDIAN · ALWAYS WITH YOU</Text>
                <GuardianCharacter state="portalSelection" mood="focused" portalMode="hub" size={compact ? 270 : 390} />
                <View style={styles.heroTitleWrap}>
                  <Text style={styles.heroEyebrow}>THE WHOLE-LIFE AI</Text>
                  <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>STAARWAARDD</Text>
                  <Text style={styles.heroSub}>STEP INTO YOUR WORLD</Text>
                </View>
              </View>

              {compact && <View style={styles.mobileGrid}>
                {[creativity, work, home, wellbeing, relationships, style].map((portal) => (
                  <PortalCard key={portal.id} portal={portal} onPress={() => enter(portal.id)} compact />
                ))}
              </View>}

              <PortalCard portal={community} onPress={() => enter(community.id)} community />
              <View style={styles.trophyPill}>
                <Text style={styles.trophyTop}>7 WORLDS</Text>
                <Text style={styles.trophyBottom}>ONE LIFE · STAARWAARDD</Text>
              </View>
            </View>

            {!compact && <View style={styles.sideColumn}>
              <PortalCard portal={work} onPress={() => enter(work.id)} tall />
              <PortalCard portal={wellbeing} onPress={() => enter(wellbeing.id)} tall />
              <PortalCard portal={style} onPress={() => enter(style.id)} tall />
            </View>}
          </View>

          {guardianSignal?.surfaced && <View style={styles.guardianAlert} accessibilityLiveRegion="polite">
            <Text style={styles.guardianAlertKicker}>GUARDIAN · CONTEXT SURFACED WITHOUT A PROMPT</Text>
            <Text style={styles.guardianAlertTitle}>{guardianSignal.recommendation}</Text>
            <Text style={styles.guardianAlertCopy}>{guardianSignal.observation} Routing: {guardianSignal.portals.join(" · ")}.</Text>
          </View>}

          <View style={styles.bottomRail}>
            <Text style={styles.bottomRailText}>THE PORTALS ARE OPEN · CHOOSE YOUR WORLD</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      <AudioControls open={audioOpen} onClose={() => setAudioOpen(false)} />
    </View>
  );
}

function PortalCard({ portal, onPress, tall = false, compact = false, community = false }: { portal: (typeof PORTALS)[number]; onPress: () => void; tall?: boolean; compact?: boolean; community?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Enter ${portal.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.portalCard,
        tall && styles.portalTall,
        compact && styles.portalCompact,
        community && styles.portalCommunity,
        { borderColor: `${portal.color}CC`, ...glow(portal.color, 20, 0.5) },
        pressed && styles.portalPressed,
      ]}
    >
      <Image source={portal.image} resizeMode="cover" style={styles.portalImage} />
      <LinearGradient colors={["rgba(2,7,17,0.06)", "rgba(2,7,17,0.42)", "rgba(2,7,17,0.86)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.portalCopy}>
        <Text style={[styles.portalGlyph, { color: portal.accent }]}>{portal.glyph}</Text>
        <Text style={styles.portalName}>{portal.name.toUpperCase()}</Text>
        <Text style={styles.portalTagline}>{portal.tagline}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#03060C" },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 12, paddingBottom: 28 },
  topBar: { maxWidth: 1500, width: "100%", alignSelf: "center", paddingTop: 12, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topBarCompact: { alignItems: "flex-start" },
  brand: { color: "#F5D985", fontSize: 25, letterSpacing: 3.5, fontWeight: "900", ...textGlow("#B47B20", 12) },
  brandSub: { color: "#F4F0E7", fontSize: 9, letterSpacing: 2.1, marginTop: 3, fontWeight: "700" },
  soundButton: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(246,220,142,.62)", backgroundColor: "rgba(5,9,18,.72)", paddingHorizontal: 14, paddingVertical: 9 },
  soundButtonText: { color: "#F6D980", fontSize: 9, letterSpacing: 1.1, fontWeight: "900" },
  stage: { maxWidth: 1500, width: "100%", alignSelf: "center", flexDirection: "row", gap: 12, alignItems: "stretch" },
  stageCompact: { flexDirection: "column" },
  sideColumn: { flex: 1, gap: 12, minWidth: 0 },
  centerColumn: { flex: 1.35, gap: 12, minWidth: 0 },
  guardianFrame: { minHeight: 610, flex: 1, overflow: "hidden", borderRadius: 28, borderWidth: 1.2, borderColor: "rgba(247,220,145,.70)", backgroundColor: "rgba(8,14,27,.88)", alignItems: "center", justifyContent: "center", paddingTop: 22, paddingBottom: 34, ...glow("#E8C86F", 30, 0.38) },
  guardianHalo: { position: "absolute", width: "72%", aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,226,144,.48)", backgroundColor: "rgba(255,219,126,.06)", ...glow("#F0C85B", 42, 0.54) },
  guardianLabel: { position: "absolute", top: 22, color: "#F7D981", fontSize: 10, letterSpacing: 1.7, fontWeight: "900" },
  heroTitleWrap: { position: "absolute", left: 12, right: 12, bottom: 30, alignItems: "center" },
  heroEyebrow: { color: "#FFF4D0", fontSize: 10, letterSpacing: 4.2, fontWeight: "900", ...textGlow("#7D4B12", 8) },
  heroTitle: { color: "#F4D37A", fontSize: 62, lineHeight: 66, letterSpacing: 2.4, fontFamily: "serif", fontWeight: "900", ...textGlow("#7B4E16", 14) },
  heroTitleCompact: { fontSize: 39, lineHeight: 44, letterSpacing: 1.2 },
  heroSub: { color: "#FFF2C7", fontSize: 9, letterSpacing: 4, fontWeight: "800" },
  portalCard: { minHeight: 170, overflow: "hidden", borderRadius: 24, borderWidth: 1.3, backgroundColor: "#0B1020", justifyContent: "flex-end" },
  portalTall: { flex: 1, minHeight: 190 },
  portalCompact: { width: "48.5%", minHeight: 150 },
  portalCommunity: { minHeight: 210 },
  portalPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  portalImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  portalCopy: { paddingHorizontal: 16, paddingVertical: 15 },
  portalGlyph: { fontSize: 22, marginBottom: 3, ...textGlow("#000", 8) },
  portalName: { color: "#FFF9EB", fontSize: 16, letterSpacing: 0.7, fontWeight: "900", ...textGlow("#000", 9) },
  portalTagline: { color: "#F3E7C4", fontSize: 10, marginTop: 2, fontWeight: "600" },
  mobileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  trophyPill: { alignSelf: "center", minWidth: 220, marginTop: -34, zIndex: 5, borderRadius: 999, borderWidth: 1.2, borderColor: "rgba(247,218,135,.72)", backgroundColor: "rgba(6,10,20,.94)", paddingHorizontal: 24, paddingVertical: 12, alignItems: "center", ...glow("#E8C86F", 20, 0.38) },
  trophyTop: { color: "#FFF5CF", fontSize: 12, letterSpacing: 2.5, fontWeight: "900" },
  trophyBottom: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.7, marginTop: 2, fontWeight: "800" },
  guardianAlert: { maxWidth: 1100, width: "100%", alignSelf: "center", marginTop: 18, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(232,200,111,.35)", backgroundColor: "rgba(232,200,111,.08)" },
  guardianAlertKicker: { color: "#F3D77D", fontSize: 8, letterSpacing: 1.15, fontWeight: "900" },
  guardianAlertTitle: { color: "#FFF6D4", fontSize: 14, lineHeight: 19, fontWeight: "800", marginTop: 5 },
  guardianAlertCopy: { color: "#CEDAF1", fontSize: 11, lineHeight: 16, marginTop: 4 },
  bottomRail: { maxWidth: 1500, width: "100%", alignSelf: "center", marginTop: 16, borderTopWidth: 1, borderColor: "rgba(232,200,111,.22)", paddingTop: 12, alignItems: "center" },
  bottomRailText: { color: "#F2D983", fontSize: 9, letterSpacing: 2.1, fontWeight: "900" },
});
