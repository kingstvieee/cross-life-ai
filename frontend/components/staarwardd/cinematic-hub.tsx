import { glow, textGlow } from "@/lib/staarwardd/shadow";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

export function CinematicHub({ greet = false }: { greet?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const router = useRouter();
  const audio = useStaarAudio();
  const [audioOpen, setAudioOpen] = useState(false);
  const [travelling, setTravelling] = useState<PortalId | null>(null);
  const [guardianSignal, setGuardianSignal] = useState<GuardianDecision | null>(null);
  const orbit = useRef(new Animated.Value(0)).current;
  const stopGreeting = useRef<(() => void) | null>(null);

  useFocusEffect(useCallback(() => () => {
    stopGreeting.current?.();
    audio.stopAmbient();
  }, [audio]));

  // The Guardian welcomes the user through sound, not an explanatory workflow panel.
  useEffect(() => {
    if (!greet || !audio.voice) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const line = await fetchGuardianLine("/api/guardian/greeting");
      if (!line || cancelled) return;
      stopGreeting.current = playGuardianLine(line.url);
    }, 900);
    return () => { cancelled = true; clearTimeout(timer); stopGreeting.current?.(); };
  }, [audio.voice, greet]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    audio.playAmbient("hub");
    return () => { loop.stop(); audio.stopAmbient(); };
  }, [audio, orbit]);

  useEffect(() => {
    let active = true;
    guardianRuntime.receive(guardianEvent("HOME_ENTERED", "home", { domain: "home", scheduleConflict: true, relevance: "high", relatedPortals: ["work", "style", "relationships"] }, { urgency: 0.78, userVisible: true })).then((decision) => {
      if (active) setGuardianSignal(decision);
    });
    return () => { active = false; };
  }, []);

  const enter = (id: PortalId) => {
    haptic.light();
    audio.playCue("portal");
    setTravelling(id);
    setTimeout(() => router.push({ pathname: "/portal/[id]", params: { id } } as never), 1280);
  };

  if (travelling) return <PortalTransition portalId={travelling} />;

  const rotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.root} testID="staar-hub-production">
      <LinearGradient colors={["#030715", "#0D1A46", "#22143C"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, compact && styles.headerCompact]}>
            <View>
              <Text style={styles.kicker}>STAARWAARDD · TORONTO</Text>
              <Text style={styles.title}>Your world is online.</Text>
              <Text style={styles.subtitle}>Seven worlds. One continuous presence. Enter wherever life is asking for attention.</Text>
            </View>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Open sound controls" onPress={() => setAudioOpen(true)} style={styles.round}><Text style={styles.roundText}>{audio.master ? "♫" : "◌"}</Text></Pressable>
            </View>
          </View>

          <View style={[styles.commandField, compact && styles.commandFieldCompact]} testID="immersive-world-field">
            <Animated.View style={[styles.commandGlow, { transform: [{ rotate: rotation }] }]} />
            <View style={[styles.guardianVignette, compact && styles.guardianVignetteCompact]}>
              <GuardianCharacter state="portalSelection" mood="focused" portalMode="hub" size={compact ? 190 : 238} />
            </View>
            <View style={styles.gatewayField}>
              {PORTALS.map((portal, index) => <Gateway key={portal.id} portal={portal} index={index} onPress={() => enter(portal.id)} />)}
            </View>
          </View>

          <View style={styles.fieldCopy}>
            <Text style={styles.fieldKicker}>THE GUARDIAN HOLDS THE THREAD</Text>
            <Text style={styles.fieldPrompt}>Move freely. Context follows you across every world.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Open STAAR Access Home" onPress={() => enter("home")} style={({ pressed }) => [styles.accessButton, pressed && styles.pressed]}>
              <Text style={styles.accessButtonText}>STAAR ACCESS · ENTER HOME</Text><Text style={styles.accessArrow}>→</Text>
            </Pressable>
          </View>

          {guardianSignal?.surfaced && <View style={styles.guardianAlert} accessibilityLiveRegion="polite">
            <Text style={styles.guardianAlertKicker}>GUARDIAN · CONTEXT SURFACED WITHOUT A PROMPT</Text>
            <Text style={styles.guardianAlertTitle}>{guardianSignal.recommendation}</Text>
            <Text style={styles.guardianAlertCopy}>{guardianSignal.observation} Routing: {guardianSignal.portals.join(" · ")}.</Text>
          </View>}

          <View style={styles.worldRail}>
            <Text style={styles.railKicker}>SEVEN WORLDS · FREE ENTRY</Text>
            <Text style={styles.railCopy}>Choose a portal without a prescribed order. The Guardian carries continuity between them.</Text>
            <View style={styles.worldList}>
              {PORTALS.map((portal) => <Pressable key={portal.id} accessibilityRole="button" accessibilityLabel={`Enter ${portal.name}`} onPress={() => enter(portal.id)} style={({ pressed }) => [styles.worldChip, { borderColor: `${portal.color}88` }, pressed && styles.pressed]}><Text style={[styles.worldGlyph, { color: portal.accent }]}>{portal.glyph}</Text><Text style={styles.worldName}>{portal.name}</Text></Pressable>)}
            </View>
          </View>

          <Text style={styles.note}>The Guardian prepares locally and pauses at every approval boundary. No forced sequence. No external action without your say.</Text>
        </ScrollView>
      </SafeAreaView>
      <AudioControls open={audioOpen} onClose={() => setAudioOpen(false)} />
    </View>
  );
}

function Gateway({ portal, index, onPress }: { portal: (typeof PORTALS)[number]; index: number; onPress: () => void }) {
  const pos = gatewayPosition(index);
  const form = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const intro = Animated.timing(form, { toValue: 1, duration: 520, delay: 120 + index * 90, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1450 + index * 80, useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1450 + index * 80, useNativeDriver: true })]));
    intro.start(); loop.start();
    return () => { intro.stop(); loop.stop(); };
  }, [bob, form, index]);
  const rise = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const scale = form.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  return <Animated.View style={[styles.gatewayWrap, pos, { opacity: form, transform: [{ translateY: rise }, { scale }] }]}><Pressable accessibilityRole="button" accessibilityLabel={`Enter ${portal.name}`} onPress={onPress} style={({ pressed }) => [styles.gateway, { borderColor: portal.color, ...glow(portal.color, 22, 0.9) }, pressed && styles.gatewayPressed]}><Image source={portal.image} resizeMode="cover" style={styles.gatewayImage} /><View style={[styles.gatewayTint, { backgroundColor: portal.color }]} /><View style={styles.gatewayShade} /><Text style={[styles.gatewayGlyph, { color: portal.accent }]}>{portal.glyph}</Text><Text style={styles.gatewayName}>{portal.name}</Text></Pressable></Animated.View>;
}

function gatewayPosition(index: number) { const angle = (index / 7) * Math.PI * 2 - Math.PI / 2; return { left: `${50 + Math.cos(angle) * 38}%` as `${number}%`, top: `${50 + Math.sin(angle) * 38}%` as `${number}%` }; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080B14", overflow: "hidden" }, safe: { flex: 1 }, scroll: { paddingHorizontal: 15, paddingBottom: 34 },
  header: { paddingTop: 18, paddingHorizontal: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, headerCompact: { alignItems: "flex-start" }, actions: { flexDirection: "row", gap: 8 }, kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.8, fontWeight: "800" }, title: { color: "#F4F7FF", fontSize: 30, fontWeight: "800", letterSpacing: -0.7, marginTop: 7 }, subtitle: { color: "#AEBBD3", fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 430 }, round: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "rgba(232,200,111,0.5)", alignItems: "center", justifyContent: "center" }, roundText: { color: "#E8C86F", fontSize: 18, fontFamily: "serif" },
  commandField: { width: "100%", maxWidth: 560, aspectRatio: 1, alignSelf: "center", marginTop: 24, overflow: "hidden", borderRadius: 280, borderWidth: 1, borderColor: "rgba(242,213,124,0.42)", backgroundColor: "rgba(4,9,24,0.88)", alignItems: "center", justifyContent: "center", ...glow("#8D72FF", 24, 0.38), elevation: 10 }, commandFieldCompact: { borderRadius: 999 }, commandGlow: { position: "absolute", width: "66%", aspectRatio: 1, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,235,169,0.42)", backgroundColor: "rgba(71,54,143,0.20)", ...glow("#E8C86F", 28, 0.42) }, guardianVignette: { width: 196, height: 258, borderRadius: 98, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#03060E", borderWidth: 1, borderColor: "rgba(240,210,120,0.36)", ...glow("#E8C86F", 24, 0.28) }, guardianVignetteCompact: { width: 152, height: 208, borderRadius: 76 }, gatewayField: { ...StyleSheet.absoluteFillObject }, gatewayWrap: { position: "absolute", marginLeft: -39, marginTop: -39 }, gateway: { width: 78, height: 78, borderRadius: 39, borderWidth: 1.5, overflow: "hidden", backgroundColor: "#101A34", justifyContent: "flex-end", padding: 8, elevation: 8 }, gatewayPressed: { opacity: 0.74, transform: [{ scale: 0.94 }] }, gatewayImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.82 }, gatewayTint: { ...StyleSheet.absoluteFillObject, opacity: 0.2 }, gatewayShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,9,24,0.28)" }, gatewayGlyph: { fontSize: 16, zIndex: 1, ...textGlow("#07101F", 8) }, gatewayName: { color: "#F3F7FF", width: 66, textAlign: "center", fontSize: 8, lineHeight: 9, letterSpacing: 0.2, fontWeight: "800", zIndex: 1, marginTop: 3 },
  fieldCopy: { alignItems: "center", marginTop: 16, paddingHorizontal: 12 }, fieldKicker: { color: "#F3D77D", fontSize: 9, letterSpacing: 1.15, fontWeight: "800", ...textGlow("#5B42B7", 10) }, fieldPrompt: { color: "#D5E2FA", fontSize: 12, fontWeight: "600", marginTop: 5, textAlign: "center" }, accessButton: { minHeight: 44, paddingHorizontal: 16, marginTop: 13, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "rgba(244,221,155,0.72)", backgroundColor: "rgba(232,200,111,0.16)", ...glow("#F3D77D", 12, 0.42) }, accessButtonText: { color: "#FFF5C6", fontSize: 10, letterSpacing: 0.7, fontWeight: "900" }, accessArrow: { color: "#F3D77D", fontSize: 20 },
  guardianAlert: { maxWidth: 620, alignSelf: "center", marginTop: 18, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: "rgba(232,200,111,0.42)", backgroundColor: "rgba(232,200,111,0.10)", ...glow("#E8C86F", 16, 0.22) }, guardianAlertKicker: { color: "#F3D77D", fontSize: 8, letterSpacing: 1.15, fontWeight: "900" }, guardianAlertTitle: { color: "#FFF6D4", fontSize: 14, lineHeight: 19, fontWeight: "800", marginTop: 6 }, guardianAlertCopy: { color: "#CEDAF1", fontSize: 11, lineHeight: 16, marginTop: 5 }, worldRail: { marginTop: 28, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,200,111,0.23)", backgroundColor: "rgba(11,18,38,0.62)" }, railKicker: { color: "#E8C86F", fontSize: 9, letterSpacing: 1.5, fontWeight: "800" }, railCopy: { color: "#B7C6DE", fontSize: 12, lineHeight: 18, marginTop: 6 }, worldList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }, worldChip: { minHeight: 38, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, backgroundColor: "rgba(4,8,18,0.5)", flexDirection: "row", alignItems: "center", gap: 6 }, worldGlyph: { fontSize: 15 }, worldName: { color: "#F1F5FF", fontSize: 11, fontWeight: "800" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, note: { color: "#8795AF", fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 18, paddingHorizontal: 12 },
});
