import { Animated, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";

import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { glow, textGlow } from "@/lib/staarwardd/shadow";
import { PORTALS } from "@/lib/staarwardd/portal-data";
import type { PortalId } from "@/lib/staarwardd/types";

const TORONTO = require("@/assets/images/staarwardd/toronto-skyline-pan.png");

export function LivingHubChamber({ awake, onAwaken, onEnter }: {
  awake: boolean;
  onAwaken: () => void;
  onEnter: (id: PortalId) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const guardianFloat = useRef(new Animated.Value(0)).current;
  const chamberPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(guardianFloat, { toValue: 1, duration: 1700, useNativeDriver: true }),
      Animated.timing(guardianFloat, { toValue: 0, duration: 1700, useNativeDriver: true }),
    ]));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(chamberPulse, { toValue: 1, duration: 2100, useNativeDriver: true }),
      Animated.timing(chamberPulse, { toValue: 0, duration: 2100, useNativeDriver: true }),
    ]));
    floatLoop.start(); pulseLoop.start();
    return () => { floatLoop.stop(); pulseLoop.stop(); };
  }, [chamberPulse, guardianFloat]);

  const guardianY = guardianFloat.interpolate({ inputRange: [0, 1], outputRange: [5, -8] });
  const pulseOpacity = chamberPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.52] });
  const gateW = compact ? Math.min(width * 0.225, 96) : 126;
  const gateH = gateW * 1.48;

  return (
    <View style={[styles.chamber, compact ? styles.chamberCompact : styles.chamberWide]} testID="living-hub-chamber">
      <Image source={TORONTO} resizeMode="cover" style={styles.skyline} />
      <LinearGradient colors={["rgba(248,244,232,0.18)", "rgba(18,30,63,0.34)", "rgba(8,12,29,0.94)"]} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.archTop} />
      <Animated.View style={[styles.energyFloor, { opacity: pulseOpacity }]} />
      <View style={styles.chamberTitle}>
        <Text style={styles.kicker}>TORONTO · STAAR HUB</Text>
        <Text style={styles.title}>{awake ? "SEVEN WORLDS ACTIVE" : "THE GUARDIAN IS READY"}</Text>
      </View>
      <Animated.View style={[styles.guardian, compact ? styles.guardianCompact : styles.guardianWide, { transform: [{ translateY: guardianY }] }]} pointerEvents="none">
        <View style={[styles.guardianAura, awake && styles.guardianAuraAwake]} />
        <GuardianCharacter state={awake ? "portalSelection" : "idle"} mood={awake ? "excited" : "focused"} portalMode="hub" size={compact ? 205 : 292} />
      </Animated.View>
      {PORTALS.map((portal, index) => (
        <Gateway key={portal.id} index={index} width={gateW} height={gateH} compact={compact} awake={awake} portal={portal} onPress={() => onEnter(portal.id)} />
      ))}
      {!awake ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Awaken all seven gateways" onPress={onAwaken} style={styles.awaken}>
          <Text style={styles.awakenText}>AWAKEN THE SEVEN GATEWAYS</Text>
        </Pressable>
      ) : <Text style={styles.ready}>CHOOSE A GATEWAY · GUARDIAN REMAINS WITH YOU</Text>}
    </View>
  );
}

function Gateway({ portal, index, width, height, compact, awake, onPress }: {
  portal: (typeof PORTALS)[number]; index: number; width: number; height: number; compact: boolean; awake: boolean; onPress: () => void;
}) {
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(reveal, { toValue: 1, delay: 120 + index * 90, friction: 8, tension: 48, useNativeDriver: true }).start();
  }, [index, reveal]);
  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  return (
    <Animated.View style={[styles.gatewayPosition, position(index, compact), { width, height, opacity: reveal, transform: [{ translateY }, { scale }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Enter the ${portal.name} world`} testID={`hub-portal-${portal.id}`} onPress={onPress} style={({ pressed }) => [styles.gateway, { borderColor: portal.color }, awake && { ...glow(portal.color, 24, 0.92) }, pressed && styles.pressed]}>
        <Image source={portal.image} resizeMode="cover" style={styles.gatewayImage} />
        <LinearGradient colors={["rgba(7,10,22,0.02)", "rgba(5,8,18,0.78)"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.gateLine, { backgroundColor: portal.color }]} />
        <Text style={styles.gatewayName}>{portal.name.toUpperCase()}</Text>
      </Pressable>
    </Animated.View>
  );
}

function position(index: number, compact: boolean): any {
  const mobile = [
    { top: 82, left: "38.7%" }, { top: 158, left: "3%" }, { top: 158, right: "3%" },
    { top: 345, left: "2%" }, { top: 345, right: "2%" }, { bottom: 48, left: "16%" }, { bottom: 48, right: "16%" },
  ];
  const desktop = [
    { top: 68, left: "43%" }, { top: 142, left: "14%" }, { top: 142, right: "14%" },
    { top: 350, left: "7%" }, { top: 350, right: "7%" }, { bottom: 42, left: "25%" }, { bottom: 42, right: "25%" },
  ];
  return (compact ? mobile : desktop)[index];
}

const styles = StyleSheet.create({
  chamber: { width: "100%", maxWidth: 980, alignSelf: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(242,215,139,0.68)", backgroundColor: "#101A36", ...glow("#E8C86F", 28, 0.38) },
  chamberCompact: { height: 690, borderRadius: 32, marginTop: 14 },
  chamberWide: { height: 760, borderRadius: 52, marginTop: 22 },
  skyline: { ...StyleSheet.absoluteFillObject, width: "100%", height: "57%", opacity: 0.78 },
  archTop: { position: "absolute", top: -180, left: "8%", right: "8%", height: 390, borderRadius: 220, borderWidth: 2, borderColor: "rgba(255,230,154,0.42)" },
  energyFloor: { position: "absolute", bottom: -90, left: "8%", right: "8%", height: 190, borderRadius: 220, backgroundColor: "rgba(250,220,130,0.42)", ...glow("#FFE49A", 60, 0.7) },
  chamberTitle: { position: "absolute", top: 22, left: 0, right: 0, alignItems: "center", zIndex: 5 },
  kicker: { color: "#FFF0B4", fontSize: 9, letterSpacing: 2.2, fontWeight: "900", ...textGlow("#3D2A75", 12) },
  title: { color: "#FFFFFF", fontSize: 17, letterSpacing: 2, fontWeight: "900", marginTop: 5, ...textGlow("#372370", 14) },
  guardian: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center", zIndex: 2 },
  guardianCompact: { top: 213, height: 315 }, guardianWide: { top: 205, height: 410 },
  guardianAura: { position: "absolute", width: 210, height: 300, borderRadius: 120, backgroundColor: "rgba(126,156,255,0.12)" },
  guardianAuraAwake: { backgroundColor: "rgba(255,220,120,0.2)", ...glow("#F7D779", 46, 0.68) },
  gatewayPosition: { position: "absolute", zIndex: 4 },
  gateway: { flex: 1, overflow: "hidden", borderTopLeftRadius: 70, borderTopRightRadius: 70, borderBottomLeftRadius: 13, borderBottomRightRadius: 13, borderWidth: 2, backgroundColor: "#10172B" },
  gatewayImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  gateLine: { position: "absolute", left: 8, right: 8, bottom: 27, height: 1.5, borderRadius: 2 },
  gatewayName: { position: "absolute", left: 2, right: 2, bottom: 8, color: "#FFFDF6", fontSize: 8.5, letterSpacing: 0.75, fontWeight: "900", textAlign: "center", ...textGlow("#030611", 9) },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  awaken: { position: "absolute", bottom: 16, alignSelf: "center", minHeight: 40, paddingHorizontal: 18, borderRadius: 999, justifyContent: "center", borderWidth: 1, borderColor: "#FFE79A", backgroundColor: "rgba(20,22,48,0.86)", zIndex: 8, ...glow("#E8C86F", 20, 0.55) },
  awakenText: { color: "#FFF1B9", fontSize: 9, letterSpacing: 1.2, fontWeight: "900" },
  ready: { position: "absolute", bottom: 17, alignSelf: "center", color: "#FFF0B7", fontSize: 8, letterSpacing: 1.1, fontWeight: "900", zIndex: 8, ...textGlow("#281B61", 10) },
});
