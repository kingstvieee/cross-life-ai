import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { fetchGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { setLaunchSoundtrackIntensity, startLaunchSoundtrack } from "@/lib/staarwardd/launch-soundtrack";

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

const SKYLINE = require("@/assets/images/staarwardd/toronto-skyline-pan.png");
const SIGIL = require("@/assets/images/staarwardd/maple-sigil.webp");
const GUARDIAN_FLY = require("@/assets/images/staarwardd/guardian-poses/flying.png");
const GUARDIAN_LAND = require("@/assets/images/staarwardd/guardian-poses/guide.png");

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
  const [activePortal, setActivePortal] = useState(-1);
  const drop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const rise = useRef(PORTAL_ART.map(() => new Animated.Value(0))).current;
  const cast = useRef(PORTAL_ART.map(() => new Animated.Value(0))).current;
  const recede = useRef(new Animated.Value(0)).current;
  const skyline = useRef(new Animated.Value(0)).current;
  const shield = useRef(new Animated.Value(0)).current;
  const through = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const dust = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.Value(0)).current;
  const ringLock = useRef(new Animated.Value(0)).current;
  const fx = useRef<any[]>([]);
  const whispers = useRef<(string | null)[]>(PORTAL_ART.map(() => null));
  const wt = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    startLaunchSoundtrack();
    // Gateway whispers: prefetch each gate's spoken name (cached Onyx TTS).
    PORTAL_ART.forEach((p, i) => {
      void fetchGuardianLine(`/api/guardian/gate-name/${p.id}`).then((line) => { whispers.current[i] = line?.url ?? null; });
    });
    fx.current.push(playFx("/audio/cloud-rumble-lightning-prominent.mp3", 0.8));
    // Living Guardian: perpetual hover bob + wing sway so he never freezes.
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    // SHOT 1 — descent + lightning + landing impact
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.8, duration: 110, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
    Animated.timing(drop, { toValue: 1, duration: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      // Landing echo — impact ripple, dust burst at his feet, soft camera shake.
      Animated.timing(ripple, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      Animated.timing(dust, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.55, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -0.35, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    });
    const t2 = setTimeout(() => {
      setShot(2);
      // The Guardian rises into the centre and conducts a deliberate clockwise
      // ritual. Each hand-cast visibly travels to and constructs one gateway.
      Animated.timing(recede, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
      rise.forEach((v, i) => {
        const beat = i * 1120;
        wt.current.push(setTimeout(() => {
          setActivePortal(i);
          setLaunchSoundtrackIntensity(0.58 + i * 0.05);
          const u = whispers.current[i];
          if (u) fx.current.push(playFx(u, 0.82));
          fx.current.push(playFx("/audio/portal.mp3", Math.min(0.48 + i * 0.055, 0.82)));
          if (i === 2 || i === 5) fx.current.push(playFx("/audio/cloud-rumble.mp3", 0.34 + i * 0.04));
        }, beat));
        Animated.sequence([
          Animated.delay(beat),
          Animated.timing(cast[i], { toValue: 0.34, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(cast[i], { toValue: 0.76, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(cast[i], { toValue: 1, duration: 330, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.spring(v, { toValue: 1, friction: 7, tension: 54, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }, 3300);
    const t3 = setTimeout(() => {
      setShot(3);
      setActivePortal(7);
      setLaunchSoundtrackIntensity(0.92);
      fx.current.push(playFx("/audio/transition.mp3", 0.78));
      Animated.sequence([
        Animated.timing(ringLock, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringLock, { toValue: 0.35, duration: 480, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
      Animated.timing(skyline, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      // Slow cinematic pan across the Toronto skyline toward the CN Tower.
      Animated.timing(pan, { toValue: 1, duration: 7600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    }, 11650);
    const t4 = setTimeout(() => {
      setShot(4);
      fx.current.push(playFx("/audio/shield.mp3", 0.75));
      Animated.spring(shield, { toValue: 1, friction: 7, tension: 38, useNativeDriver: true }).start();
    }, 15100);
    const t5 = setTimeout(() => {
      // SHOT 5 — camera passes through the shield into the living Hub
      Animated.timing(through, { toValue: 1, duration: 1100, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onDone());
    }, 18400);
    return () => { [t2, t3, t4, t5, ...wt.current].forEach(clearTimeout); fx.current.forEach((el) => { try { el?.pause?.(); } catch {} }); };
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
  const recedeY = recede.interpolate({ inputRange: [0, 1], outputRange: [0, -SH * 0.035] });
  const recedeScale = recede.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] });
  const conductor = Animated.add(cast[0], Animated.add(cast[1], Animated.add(cast[2], Animated.add(cast[3], Animated.add(cast[4], Animated.add(cast[5], cast[6]))))));
  const guardianTurn = conductor.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6, 7],
    outputRange: ["0deg", "7deg", "11deg", "7deg", "-3deg", "-10deg", "-7deg", "0deg"],
  });
  const guardianLean = conductor.interpolate({ inputRange: [0, 2, 4, 6, 7], outputRange: [0, 8, 2, -8, 0] });
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] });
  const shakeY = shake.interpolate({ inputRange: [-1, 1], outputRange: [6, -6] });
  const dustSpread = dust.interpolate({ inputRange: [0, 1], outputRange: [20, 95] });
  const dustSpreadNeg = dust.interpolate({ inputRange: [0, 1], outputRange: [-20, -95] });
  const dustScale = dust.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4] });
  const dustOpacity = dust.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const sway = float.interpolate({ inputRange: [0, 1], outputRange: ["-2deg", "2deg"] });
  const auraScale = float.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const auraOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.3] });
  const panX = pan.interpolate({ inputRange: [0, 1], outputRange: [0, -SW * 0.78] });
  const panZoom = pan.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const gateW = Math.min(SW * 0.215, 104);
  const ritualRadius = Math.min(SW * 0.42, 172);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: throughFade }]} testID="hub-arrival-cinematic">
      <LinearGradient colors={["#2A2438", "#4A3D57", "#8A6F3C"]} style={StyleSheet.absoluteFill} />
      <View style={s.floorGlow} />
      {/* SHOT 3 — Toronto beyond the chamber */}
      {shot >= 3 && (
        <Animated.View style={[s.skyWrap, { height: SW * 0.75, opacity: skyline, transform: [{ translateY: skyY }] }]}>
          <Animated.Image source={SKYLINE} style={{ width: SW * 1.8, height: SW * 0.75, transform: [{ translateX: panX }, { scale: panZoom }] }} resizeMode="cover" />
          <LinearGradient colors={["rgba(42,36,56,0)", "rgba(42,36,56,0.9)"]} style={s.skyFade} />
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ scale: throughScale }, { translateX: shakeX }, { translateY: shakeY }], flex: 1, alignItems: "center", justifyContent: "center" }}>
        {/* SHOT 1 — Guardian arrival */}
        <Animated.View style={[s.ring, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
        <Animated.View style={[s.dust, { opacity: dustOpacity, transform: [{ translateY: 185 }, { translateX: dustSpreadNeg }, { scaleX: dustScale }] }]} />
        <Animated.View style={[s.dust, { opacity: dustOpacity, transform: [{ translateY: 185 }, { translateX: dustSpread }, { scaleX: dustScale }] }]} />
        <Animated.View style={{ zIndex: 4, transform: [{ translateY: guardianY }, { translateY: recedeY }, { translateY: floatY }, { translateX: guardianLean }, { scale: guardianScale }, { scale: recedeScale }, { rotate: guardianTurn }, { rotate: sway }], alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[s.auraOuter, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
          <Animated.View style={[s.auraInner, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
          {shot === 2 ? (
            <GuardianCharacter key={`portal-cast-${activePortal}`} state="summoning" mood="excited" portalMode="hub" size={Math.min(SW * 0.72, 320)} />
          ) : (
            <Image source={shot === 1 ? GUARDIAN_FLY : GUARDIAN_LAND} style={{ width: Math.min(SW * 0.72, 320), height: Math.min(SW * 0.72, 320) * 1.5 }} resizeMode="contain" />
          )}
        </Animated.View>
        {shot === 1 && <Text style={s.caption}>THE GUARDIAN ARRIVES</Text>}
        {/* SHOT 2 — every energy cast originates at his hand and sweeps
            clockwise to its architectural gateway. */}
        {shot >= 2 && shot < 4 && (
          <View style={s.spotField} pointerEvents="none">
            {PORTAL_ART.map((portal, index) => (
              <View key={portal.id} style={StyleSheet.absoluteFill}>
                <SpellCast progress={cast[index]} index={index} radius={ritualRadius} />
                <Animated.View style={[s.spotCard, cinematicGatewayPosition(index, SW, SH), { width: gateW, height: gateW * 1.55, opacity: rise[index], transform: [{ translateY: rise[index].interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }, { scale: rise[index].interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.35, 1.12, 1] }) }] }]}>
                  <Image source={portal.src} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
                  <Animated.View style={[s.gateLight, { opacity: rise[index].interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.88, 0.16] }) }]} />
                  <View style={s.gateNameWrap}><Text style={s.portalName}>{portal.name.toUpperCase()}</Text></View>
                </Animated.View>
              </View>
            ))}
            <Animated.View style={[s.completedRing, { opacity: ringLock, transform: [{ scale: ringLock.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.16] }) }] }]} />
          </View>
        )}
        {shot === 2 && <Text style={[s.caption, s.captionBottom]}>{activePortal < 0 ? "THE RITUAL BEGINS" : `${Math.min(activePortal + 1, 7)} OF 7 · ${PORTAL_ART[Math.min(activePortal, 6)].name.toUpperCase()} AWAKENS`}</Text>}
        {shot === 3 && <Text style={[s.caption, s.captionBottom]}>TORONTO ILLUMINATES · SEVEN GATEWAYS OPEN</Text>}
        {/* SHOT 4 — sigil shield finale */}
        {shot >= 4 && (
          <Animated.View style={[s.shieldWrap, { opacity: shield, transform: [{ scale: shieldScale }] }]}>
            <Image source={SIGIL} style={{ width: Math.min(SW * 0.62, 300), height: Math.min(SW * 0.62, 300) }} resizeMode="contain" />
            <Text style={s.brand}>STAARWAARDD</Text>
            <Text style={s.brandSub}>SEVEN WORLDS · ONE GUARDIAN</Text>
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFE9B8", opacity: flash, pointerEvents: "none" }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Skip arrival cinematic" onPress={onDone} style={s.skip} testID="skip-arrival-btn">
        <Text style={s.skipText}>SKIP</Text>
      </Pressable>
    </Animated.View>
  );
}

function cinematicGatewayPosition(index: number, width: number, height: number) {
  const positions = [
    { left: width * 0.39, top: height * 0.09 },
    { right: width * 0.08, top: height * 0.24 },
    { right: width * 0.025, top: height * 0.52 },
    { right: width * 0.19, bottom: height * 0.075 },
    { left: width * 0.19, bottom: height * 0.075 },
    { left: width * 0.025, top: height * 0.52 },
    { left: width * 0.08, top: height * 0.24 },
  ];
  return positions[index];
}

function SpellCast({ progress, index, radius }: { progress: Animated.Value; index: number; radius: number }) {
  const angles = [-90, -38, 14, 65, 115, 166, 218];
  const beamOpacity = progress.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 1, 1, 0] });
  const beamScale = progress.interpolate({ inputRange: [0, 0.28, 0.78, 1], outputRange: [0, 0.06, 1, 1] });
  const energyTravel = progress.interpolate({ inputRange: [0, 0.24, 0.82, 1], outputRange: [0, 0, radius, radius] });
  const sparkTravel = progress.interpolate({ inputRange: [0, 0.32, 0.9, 1], outputRange: [0, 0, radius * 0.88, radius] });
  return (
    <View style={[s.castOrbit, { width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius, transform: [{ rotate: `${angles[index]}deg` }] }]}>
      <Animated.View style={[s.energyBeam, { left: radius, top: radius - 2, width: radius, opacity: beamOpacity, transform: [{ scaleX: beamScale }] }]} />
      <Animated.View style={[s.energyHead, { left: radius - 9, top: radius - 9, opacity: beamOpacity, transform: [{ translateX: energyTravel }, { scale: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.35, 1.35, 0.75] }) }] }]} />
      {[0, 1, 2, 3].map((spark) => (
        <Animated.View key={spark} style={[s.castSpark, { left: radius - 3, top: radius - 3 + (spark - 1.5) * 7, opacity: beamOpacity, transform: [{ translateX: sparkTravel }, { scale: 0.65 + spark * 0.18 }] }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { zIndex: 60, elevation: 60, overflow: "hidden", backgroundColor: "#2A2438" },
  floorGlow: { position: "absolute", bottom: -110, alignSelf: "center", width: 420, height: 160, borderRadius: 210, backgroundColor: "rgba(244,206,110,0.14)" },
  skyWrap: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  auraOuter: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(244,206,110,0.12)" },
  auraInner: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,232,166,0.16)" },
  skyFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90 },
  ring: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: "#C9A23F" },
  dust: { position: "absolute", width: 90, height: 24, borderRadius: 45, backgroundColor: "rgba(233,214,170,0.55)" },
  caption: { marginTop: 14, color: "#F4DC9C", fontSize: 12, letterSpacing: 2.4, fontWeight: "800", textAlign: "center" },
  captionBottom: { position: "absolute", bottom: 64, alignSelf: "center" },
  spotField: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  castOrbit: { position: "absolute", left: "50%", top: "50%", zIndex: 3 },
  energyBeam: { position: "absolute", height: 4, borderRadius: 4, backgroundColor: "#FFF1A8", shadowColor: "#79B9FF", shadowOpacity: 0.95, shadowRadius: 14, elevation: 12 },
  energyHead: { position: "absolute", width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#F5CE66", shadowColor: "#8CCBFF", shadowOpacity: 1, shadowRadius: 18, elevation: 15 },
  castSpark: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", shadowColor: "#FFD66E", shadowOpacity: 1, shadowRadius: 8, elevation: 14 },
  completedRing: { position: "absolute", alignSelf: "center", top: "28%", width: "72%", aspectRatio: 1, borderRadius: 999, borderWidth: 3, borderColor: "rgba(255,232,156,0.95)", backgroundColor: "rgba(126,155,255,0.08)", shadowColor: "#FFE18B", shadowOpacity: 0.95, shadowRadius: 34, elevation: 10 },
  spotCard: { position: "absolute", borderTopLeftRadius: 160, borderTopRightRadius: 160, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: "hidden", borderWidth: 2, borderColor: "rgba(244,206,110,0.9)", backgroundColor: "#141826" },
  gateLight: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,240,196,0.55)" },
  gateNameWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingVertical: 7, backgroundColor: "rgba(16,14,26,0.72)" },
  portalName: { color: "#FFF4D2", fontSize: 11, letterSpacing: 1.8, fontWeight: "800", textAlign: "center" },
  shieldWrap: { position: "absolute", alignItems: "center", justifyContent: "center", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(34,28,48,0.94)" },
  brand: { marginTop: 14, color: "#F4DC9C", fontSize: 26, letterSpacing: 7, fontWeight: "800" },
  brandSub: { marginTop: 6, color: "#C8B98E", fontSize: 10, letterSpacing: 3, fontWeight: "700" },
  skip: { position: "absolute", top: 54, right: 18, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(244,206,110,0.55)", backgroundColor: "rgba(20,24,38,0.7)" },
  skipText: { color: "#F4DC9C", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
});
