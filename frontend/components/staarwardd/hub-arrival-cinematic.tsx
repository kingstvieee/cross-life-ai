import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";

// One continuous cinematic ending, portrait-mobile first:
// SHOT 1 Guardian lands in a bright chamber through controlled lightning
// SHOT 2 seven full-size portals awaken around him
// SHOT 3 Toronto + CN Tower illuminate beyond the chamber
// SHOT 4 the STAARWAARDD sigil-shield seals the film
// SHOT 5 the camera passes through it into the live Hub (onDone)
const PORTAL_ART: { id: string; name: string; src: any }[] = [
  { id: "creativity", name: "Creativity", src: require("@/assets/images/staarwardd/portal-creativity-v7.webp") },
  { id: "work", name: "Work", src: require("@/assets/images/staarwardd/portal-work-v7.webp") },
  { id: "home", name: "Home", src: require("@/assets/images/staarwardd/portal-home-v7.webp") },
  { id: "wellbeing", name: "Wellbeing", src: require("@/assets/images/staarwardd/portal-wellbeing-v7.webp") },
  { id: "relationships", name: "Relationships", src: require("@/assets/images/staarwardd/portal-relationships-v7.webp") },
  { id: "events", name: "Community", src: require("@/assets/images/staarwardd/portal-community-v7.webp") },
  { id: "style", name: "Style", src: require("@/assets/images/staarwardd/portal-style-v7.webp") },
];

const SKYLINE = require("@/assets/images/staarwardd/guardian-toronto.png");
const SIGIL = require("@/assets/images/staarwardd/maple-sigil.webp");

function playFx(path: string, volume: number) {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const el = new window.Audio(path);
    el.preload = "auto";
    el.volume = volume;
    el.play().catch(() => {});
    return el;
  } catch { return null; }
}

export function HubArrivalCinematic({ onDone }: { onDone: () => void }) {
  const { width: SW, height: SH } = useWindowDimensions();
  const [shot, setShot] = useState(1);
  const drop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const rise = useRef(PORTAL_ART.map(() => new Animated.Value(0))).current;
  const skyline = useRef(new Animated.Value(0)).current;
  const shield = useRef(new Animated.Value(0)).current;
  const through = useRef(new Animated.Value(0)).current;
  const fx = useRef<any[]>([]);

  useEffect(() => {
    fx.current.push(playFx("/audio/cloud-rumble-lightning-prominent.mp3", 0.8));
    // SHOT 1 — descent + lightning + landing impact
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.8, duration: 110, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
    Animated.timing(drop, { toValue: 1, duration: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      Animated.timing(ripple, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
    const t2 = setTimeout(() => {
      setShot(2);
      Animated.stagger(340, rise.map((v) => Animated.spring(v, { toValue: 1, friction: 7, tension: 46, useNativeDriver: true }))).start();
    }, 3300);
    const t3 = setTimeout(() => {
      setShot(3);
      Animated.timing(skyline, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, 7400);
    const t4 = setTimeout(() => {
      setShot(4);
      fx.current.push(playFx("/audio/shield.mp3", 0.75));
      Animated.spring(shield, { toValue: 1, friction: 7, tension: 38, useNativeDriver: true }).start();
    }, 10600);
    const t5 = setTimeout(() => {
      // SHOT 5 — camera passes through the shield into the living Hub
      Animated.timing(through, { toValue: 1, duration: 1100, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onDone());
    }, 14200);
    return () => { [t2, t3, t4, t5].forEach(clearTimeout); fx.current.forEach((el) => { try { el?.pause?.(); } catch {} }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardianY = drop.interpolate({ inputRange: [0, 1], outputRange: [-SH * 0.55, 0] });
  const guardianScale = drop.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.2, 3.4] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.75, 0] });
  const skyY = skyline.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });
  const shieldScale = shield.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const throughScale = through.interpolate({ inputRange: [0, 1], outputRange: [1, 7] });
  const throughFade = through.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const cardW = Math.min((SW - 44) / 2, 220);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: throughFade }]} testID="hub-arrival-cinematic">
      <LinearGradient colors={["#FDFBF5", "#F3EAD6", "#E5D9BD"]} style={StyleSheet.absoluteFill} />
      {/* SHOT 3 — Toronto beyond the chamber */}
      {shot >= 3 && (
        <Animated.View style={[s.skyWrap, { opacity: skyline, transform: [{ translateY: skyY }] }]}>
          <Image source={SKYLINE} style={{ width: SW, height: SW * 0.56 }} resizeMode="cover" />
          <LinearGradient colors={["rgba(253,251,245,0)", "#FDFBF5"]} style={s.skyFade} />
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ scale: throughScale }], flex: 1, alignItems: "center", justifyContent: "center" }}>
        {/* SHOT 1 — Guardian arrival */}
        <Animated.View style={[s.ring, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
        <Animated.View style={{ transform: [{ translateY: guardianY }, { scale: guardianScale }], alignItems: "center" }}>
          <GuardianCharacter state="portalSelection" mood="excited" portalMode="hub" size={Math.min(SW * 0.5, 220)} />
        </Animated.View>
        {shot === 1 && <Text style={s.caption}>THE GUARDIAN ARRIVES</Text>}
        {/* SHOT 2 — seven full-size portals awaken */}
        {shot >= 2 && shot < 4 && (
          <View style={[s.portalField, { width: SW - 24 }]}>
            {PORTAL_ART.map((portal, index) => (
              <Animated.View key={portal.id} style={[s.portalCard, { width: cardW, opacity: rise[index], transform: [{ translateY: rise[index].interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }, { scale: rise[index].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
                <Image source={portal.src} style={{ width: "100%", height: cardW * 0.72 }} resizeMode="cover" />
                <Text style={s.portalName}>{portal.name.toUpperCase()}</Text>
              </Animated.View>
            ))}
          </View>
        )}
        {shot === 3 && <Text style={s.caption}>TORONTO ILLUMINATES · SEVEN GATEWAYS OPEN</Text>}
        {/* SHOT 4 — sigil shield finale */}
        {shot >= 4 && (
          <Animated.View style={[s.shieldWrap, { opacity: shield, transform: [{ scale: shieldScale }] }]}>
            <Image source={SIGIL} style={{ width: Math.min(SW * 0.62, 300), height: Math.min(SW * 0.62, 300) }} resizeMode="contain" />
            <Text style={s.brand}>STAARWAARDD</Text>
            <Text style={s.brandSub}>SEVEN WORLDS · ONE GUARDIAN</Text>
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: flash, pointerEvents: "none" }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Skip arrival cinematic" onPress={onDone} style={s.skip} testID="skip-arrival-btn">
        <Text style={s.skipText}>SKIP</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { zIndex: 60, elevation: 60, overflow: "hidden" },
  skyWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  skyFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90 },
  ring: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: "#C9A23F" },
  caption: { marginTop: 18, color: "#7A5E1E", fontSize: 12, letterSpacing: 2.4, fontWeight: "800", textAlign: "center" },
  portalField: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 16 },
  portalCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(201,162,63,0.75)", backgroundColor: "#FFFDF7" },
  portalName: { color: "#3A2E11", fontSize: 11, letterSpacing: 1.8, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
  shieldWrap: { position: "absolute", alignItems: "center", justifyContent: "center", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(253,251,245,0.88)" },
  brand: { marginTop: 14, color: "#8A6A1C", fontSize: 26, letterSpacing: 7, fontWeight: "800" },
  brandSub: { marginTop: 6, color: "#9C8C5E", fontSize: 10, letterSpacing: 3, fontWeight: "700" },
  skip: { position: "absolute", top: 54, right: 18, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(138,106,28,0.5)", backgroundColor: "rgba(255,253,247,0.8)" },
  skipText: { color: "#8A6A1C", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
});
