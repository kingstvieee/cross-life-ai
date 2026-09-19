import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { fetchGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { setLaunchSoundtrackIntensity, startLaunchSoundtrack } from "@/lib/staarwardd/launch-soundtrack";

const PORTALS = [
  { id: "creativity", name: "Creativity", src: require("@/assets/images/staarwardd/portal-creativity-v7.webp") },
  { id: "work", name: "Work", src: require("@/assets/images/staarwardd/portal-work-v7.webp") },
  { id: "home", name: "Home", src: require("@/assets/images/staarwardd/portal-home-v7.webp") },
  { id: "wellbeing", name: "Wellbeing", src: require("@/assets/images/staarwardd/portal-wellbeing-v7.webp") },
  { id: "relationships", name: "Relationships", src: require("@/assets/images/staarwardd/portal-relationships-v7.webp") },
  { id: "events", name: "Community", src: require("@/assets/images/staarwardd/portal-community-v7.webp") },
  { id: "style", name: "Style", src: require("@/assets/images/staarwardd/portal-style-v7.webp") },
];

const SKYLINE = require("@/assets/images/staarwardd/toronto-skyline-pan.png");
const GUARDIAN_FLY = require("@/assets/images/staarwardd/guardian-poses/flying.png");

function playFx(path: string, volume: number) {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const el = new window.Audio(path);
    el.preload = "auto";
    el.volume = volume;
    el.play().catch(() => {});
    return el;
  } catch {
    return null;
  }
}

function portalPosition(index: number, w: number, h: number) {
  const gw = Math.min(w * 0.25, 118);
  const gh = gw * 1.58;
  const left = Math.max(12, w * 0.03);
  const right = Math.max(12, w * 0.03);
  const upper = h * 0.17;
  const lower = h * 0.54;
  const center = w / 2 - gw / 2;
  return [
    { left: center, top: h * 0.07 },
    { right, top: upper },
    { right: right * 0.45, top: lower },
    { left: w * 0.61, bottom: h * 0.06 },
    { right: w * 0.61, bottom: h * 0.06 },
    { left: left * 0.45, top: lower },
    { left, top: upper },
  ][index];
}

export function HubArrivalCinematic({ onDone }: { onDone: () => void }) {
  const { width: SW, height: SH } = useWindowDimensions();
  const [activePortal, setActivePortal] = useState(-1);
  const [allOpen, setAllOpen] = useState(false);

  const storm = useRef(new Animated.Value(0)).current;
  const lightning = useRef(new Animated.Value(0)).current;
  const guardianFloat = useRef(new Animated.Value(0)).current;
  const guardianArc = useRef(new Animated.Value(0)).current;
  const portals = useRef(PORTALS.map(() => new Animated.Value(0))).current;
  const portalPulse = useRef(PORTALS.map(() => new Animated.Value(0))).current;
  const finale = useRef(new Animated.Value(0)).current;
  const through = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fx = useRef<any[]>([]);
  const whispers = useRef<(string | null)[]>(PORTALS.map(() => null));

  useEffect(() => {
    startLaunchSoundtrack();
    setLaunchSoundtrackIntensity(0.58);

    PORTALS.forEach((p, i) => {
      void fetchGuardianLine(`/api/guardian/gate-name/${p.id}`).then((line) => {
        whispers.current[i] = line?.url ?? null;
      });
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(guardianFloat, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(guardianFloat, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(storm, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
    fx.current.push(playFx("/audio/cloud-rumble-lightning-prominent.mp3", 0.72));

    const strike = () => {
      Animated.sequence([
        Animated.timing(lightning, { toValue: 1, duration: 85, useNativeDriver: true }),
        Animated.timing(lightning, { toValue: 0.12, duration: 130, useNativeDriver: true }),
        Animated.timing(lightning, { toValue: 0.82, duration: 70, useNativeDriver: true }),
        Animated.timing(lightning, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    };

    timers.current.push(setTimeout(strike, 900));
    timers.current.push(setTimeout(strike, 2950));

    portals.forEach((value, i) => {
      const beat = 3600 + i * 1120;
      timers.current.push(setTimeout(() => {
        setActivePortal(i);
        setLaunchSoundtrackIntensity(Math.min(0.66 + i * 0.045, 0.95));
        Animated.parallel([
          Animated.timing(guardianArc, {
            toValue: i + 1,
            duration: 540,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(value, { toValue: 1, friction: 6, tension: 44, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(portalPulse[i], { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(portalPulse[i], { toValue: 0.45, duration: 700, useNativeDriver: true }),
          ]),
        ]).start();
        const u = whispers.current[i];
        if (u) fx.current.push(playFx(u, 0.78));
        fx.current.push(playFx("/audio/portal.mp3", Math.min(0.46 + i * 0.05, 0.78)));
      }, beat));
    });

    timers.current.push(setTimeout(() => {
      setAllOpen(true);
      setActivePortal(7);
      setLaunchSoundtrackIntensity(1);
      fx.current.push(playFx("/audio/transition.mp3", 0.82));
      Animated.timing(finale, { toValue: 1, duration: 1700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, 11800));

    timers.current.push(setTimeout(() => {
      Animated.timing(through, { toValue: 1, duration: 1400, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onDone());
    }, 14850));

    return () => {
      timers.current.forEach(clearTimeout);
      fx.current.forEach((el) => { try { el?.pause?.(); } catch {} });
    };
  }, []);

  const floatY = guardianFloat.interpolate({ inputRange: [0, 1], outputRange: [4, -15] });
  const guardianX = guardianArc.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6, 7],
    outputRange: [0, 22, 35, 24, 0, -24, -35, 0],
  });
  const guardianTurn = guardianArc.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6, 7],
    outputRange: ["0deg", "7deg", "12deg", "8deg", "0deg", "-8deg", "-12deg", "0deg"],
  });
  const stormScale = storm.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.14] });
  const stormOpacity = storm.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.72] });
  const finaleScale = finale.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const throughScale = through.interpolate({ inputRange: [0, 1], outputRange: [1, 4.8] });
  const throughFade = through.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View style={[s.root, { opacity: throughFade }]} testID="hub-arrival-cinematic">
      <Animated.Image
        source={SKYLINE}
        resizeMode="cover"
        style={[s.skyline, { transform: [{ scale: stormScale }] }]}
      />
      <LinearGradient colors={["rgba(2,5,13,0.12)", "rgba(4,8,18,0.44)", "rgba(2,4,10,0.76)"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.stormVeil, { opacity: stormOpacity }]} />

      <Animated.View style={[s.world, { transform: [{ scale: throughScale }] }]}>
        {PORTALS.map((portal, i) => {
          const p = portals[i];
          const riseY = p.interpolate({ inputRange: [0, 1], outputRange: [70, 0] });
          const scale = p.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.2, 1.12, 1] });
          const opacity = p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.75, 1] });
          const glow = portalPulse[i].interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
          return (
            <Animated.View
              key={portal.id}
              pointerEvents="none"
              style={[
                s.gateway,
                portalPosition(i, SW, SH),
                { opacity, transform: [{ translateY: riseY }, { scale }] },
              ]}
            >
              <Animated.View style={[s.gatewayGlow, { opacity: glow }]} />
              <Image source={portal.src} resizeMode="cover" style={s.gatewayImage} />
              <View style={s.gatewayEnergy} />
              <Text style={s.gatewayName}>{portal.name.toUpperCase()}</Text>
            </Animated.View>
          );
        })}

        <Animated.View
          style={[
            s.guardian,
            {
              transform: [
                { translateY: floatY },
                { translateX: guardianX },
                { rotate: guardianTurn },
                { scale: finaleScale },
              ],
            },
          ]}
        >
          <View style={s.auraOuter} />
          {activePortal >= 0 && activePortal < 7 ? (
            <GuardianCharacter
              key={`summon-${activePortal}`}
              state="summoning"
              mood="excited"
              portalMode="hub"
              size={Math.min(SW * 0.74, 330)}
            />
          ) : (
            <Image
              source={GUARDIAN_FLY}
              resizeMode="contain"
              style={{ width: Math.min(SW * 0.74, 330), height: Math.min(SW * 0.74, 330) * 1.5 }}
            />
          )}
        </Animated.View>

        <View style={s.cnHalo} />
        <Text style={s.kicker}>
          {allOpen ? "SEVEN WORLDS OPEN · TORONTO" : activePortal < 0 ? "THE STORM ANSWERS" : `${activePortal + 1} OF 7 · ${PORTALS[activePortal].name.toUpperCase()} AWAKENS`}
        </Text>

        {allOpen && (
          <Animated.View style={[s.finale, { opacity: finale }]}>
            <Text style={s.finaleTitle}>STAARWAARDD</Text>
            <Text style={s.finaleSub}>THE GUARDIAN HOLDS THE GATE</Text>
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, s.flash, { opacity: lightning }]} pointerEvents="none" />
      <Pressable accessibilityRole="button" accessibilityLabel="Skip arrival cinematic" onPress={onDone} style={s.skip} testID="skip-arrival-btn">
        <Text style={s.skipText}>SKIP</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#02040A", overflow: "hidden" },
  skyline: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  stormVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0A1022" },
  world: { flex: 1, alignItems: "center", justifyContent: "center" },
  guardian: { position: "absolute", zIndex: 20, alignItems: "center", justifyContent: "center", top: "20%" },
  auraOuter: {
    position: "absolute", width: 260, height: 330, borderRadius: 999,
    backgroundColor: "rgba(255,215,118,0.13)", borderWidth: 1,
    borderColor: "rgba(255,226,147,0.38)",
  },
  gateway: {
    position: "absolute", zIndex: 8, borderTopLeftRadius: 999, borderTopRightRadius: 999,
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: "hidden",
    borderWidth: 2, borderColor: "rgba(245,214,124,0.92)",
    backgroundColor: "rgba(4,7,16,0.72)",
    shadowColor: "#F7D66E", shadowOpacity: 0.9, shadowRadius: 22, elevation: 16,
  },
  gatewayGlow: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(119,193,255,0.24)",
    borderWidth: 5, borderColor: "rgba(255,228,144,0.48)",
  },
  gatewayImage: { width: "100%", height: "100%" },
  gatewayEnergy: {
    ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: "rgba(255,255,255,0.58)",
    borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },
  gatewayName: {
    position: "absolute", bottom: 6, left: 0, right: 0, color: "#FFF4CF",
    textAlign: "center", fontSize: 9, letterSpacing: 1.25, fontWeight: "900",
    textShadowColor: "#000", textShadowRadius: 6,
  },
  cnHalo: {
    position: "absolute", width: 290, height: 290, borderRadius: 999, borderWidth: 1,
    borderColor: "rgba(255,222,132,0.18)", backgroundColor: "rgba(82,134,255,0.06)",
    top: "17%", zIndex: 2,
  },
  kicker: {
    position: "absolute", top: 58, color: "#FFF0B8", fontSize: 11, letterSpacing: 2.2,
    fontWeight: "900", textAlign: "center", textShadowColor: "#000", textShadowRadius: 8,
  },
  finale: {
    position: "absolute", bottom: 52, alignItems: "center", zIndex: 30,
  },
  finaleTitle: {
    color: "#FFF0B8", fontSize: 26, letterSpacing: 7, fontWeight: "900",
    textShadowColor: "#8AC7FF", textShadowRadius: 16,
  },
  finaleSub: {
    marginTop: 6, color: "#F6E5B2", fontSize: 9, letterSpacing: 2.4, fontWeight: "800",
  },
  flash: { backgroundColor: "#EAF4FF" },
  skip: {
    position: "absolute", top: 54, right: 18, zIndex: 50, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: "rgba(244,206,110,0.55)",
    backgroundColor: "rgba(4,7,16,0.62)",
  },
  skipText: { color: "#F4DC9C", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
});
