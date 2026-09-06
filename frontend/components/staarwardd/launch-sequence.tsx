import { glow } from "@/lib/staarwardd/shadow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";

const LAUNCH_KEY = "staarwardd.launch-seen";
const isWeb = Platform.OS === "web";

export type PortalId = "creativity" | "work" | "home" | "wellbeing" | "relationships" | "events" | "style";

export function useReturningUser() {
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(LAUNCH_KEY).then((v) => { setReturning(v === "1"); setLoading(false); });
  }, []);
  const markSeen = () => { void AsyncStorage.setItem(LAUNCH_KEY, "1"); };
  return { loading, returning, markSeen };
}

// The single uninterrupted video backbone — the full canonical entrance.
// Same clip in two encodings: H.264 mp4 (Safari/Chrome/Edge) and VP9 webm
// (browsers without proprietary codecs). Content is identical.
const WEB_SRC = "";
const WEB_FLIGHT_MS = 15000;
const POSTER_ASSET = require("@/assets/images/staarwardd/guardian-toronto.png");
const POSTER_SRC = typeof POSTER_ASSET === "string" ? POSTER_ASSET : POSTER_ASSET?.uri || "";

function pickWebSrc(v: any): string {
  try {
    const h264 = v.canPlayType?.('video/mp4; codecs="avc1.42E01E"') || "";
    if (h264 === "probably" || h264 === "maybe") return WEB_SRC;
  } catch {}
  return WEB_SRC;
}
const NATIVE_SRC = require("@/assets/videos/guardian-toronto-traverse-hd.mp4");

const PORTALS: { id: PortalId; label: string; img: any }[] = [
  { id: "creativity", label: "Creativity", img: require("@/assets/images/staarwardd/portal-creativity-v7.webp") },
  { id: "work", label: "Work", img: require("@/assets/images/staarwardd/portal-work-v7.webp") },
  { id: "home", label: "Home", img: require("@/assets/images/staarwardd/portal-home-v7.webp") },
  { id: "wellbeing", label: "Wellbeing", img: require("@/assets/images/staarwardd/portal-wellbeing-v7.webp") },
  { id: "relationships", label: "Relationships", img: require("@/assets/images/staarwardd/portal-relationships-v7.webp") },
  { id: "events", label: "Community", img: require("@/assets/images/staarwardd/portal-community-v7.webp") },
  { id: "style", label: "Style", img: require("@/assets/images/staarwardd/portal-style-v7.webp") },
];
const PORTAL_WINDOW = 8; // portals materialize over the final ~8s of the clip
const PORTAL_GAP = 0.95; // seconds between each gateway

// Web-only raw <video> (expo-video's web view renders black in this preview).
const RNW = isWeb ? require("react-native-web") : null;

function WebFlightScene({ started, elapsed }: { started: boolean; elapsed: number }) {
  const flight = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!started) { flight.stopAnimation(); flight.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(flight, { toValue: 1, duration: WEB_FLIGHT_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(flight, { toValue: 0, duration: 1, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [flight, started]);
  const scene = elapsed < 3200 ? "TORONTO · FIRST LIGHT" : elapsed < 7000 ? "THE GUARDIAN · CROSSING THE CITY" : elapsed < 11200 ? "SEVEN GATEWAYS · WAKING" : "STAARWAARDD · ARRIVAL VECTOR";
  return <View pointerEvents="none" style={s.flightRoot}>
    {RNW?.unstable_createElement("img", { src: POSTER_SRC, "aria-hidden": "true", style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.56, filter: "brightness(0.52) saturate(1.22)" } })}
    <View style={s.flightSky} />
    <View style={s.flightMoon} />
    <View style={s.flightCity}><View style={s.towerA} /><View style={s.towerB} /><View style={s.towerC} /><View style={s.cityLine} /></View>
    <Animated.View style={[s.flightGuardian, { transform: [{ translateX: flight.interpolate({ inputRange: [0, 1], outputRange: [-180, 260] }) }, { translateY: flight.interpolate({ inputRange: [0, 0.5, 1], outputRange: [72, -34, 52] }) }, { rotate: flight.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["12deg", "-4deg", "9deg"] }) }] }]}>
      <View style={s.guardianGlow} /><View style={s.guardianBody} /><View style={s.guardianWingLeft} /><View style={s.guardianWingRight} /><View style={s.guardianTrail} />
    </Animated.View>
    <View style={s.flightVignette} />
    <View style={s.flightCaption}><Text style={s.flightKicker}>STAARWAARDD · TORONTO</Text><Text style={s.flightTitle}>{scene}</Text><Text style={s.flightSub}>One continuous presence. Seven ways into your life.</Text></View>
  </View>;
}

export function LaunchSequence({ onComplete }: { onComplete: () => void; onSelectPortal?: (id: PortalId) => void }) {
  const { width: SW } = useWindowDimensions();
  const audio = useStaarAudio();
  // Browsers do not permit audible autoplay. Hold the cinematic on frame zero
  // until one intentional entrance tap, then begin with its soundtrack on.
  const [started, setStarted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [portalCount, setPortalCount] = useState(0);
  const [flightElapsed, setFlightElapsed] = useState(0);
  const done = useRef(false);
  const videoRef = useRef<any>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const nativePlayer = useVideoPlayer(isWeb ? null : NATIVE_SRC, (p) => { p.loop = false; p.muted = false; });

  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    try { if (isWeb) videoRef.current?.pause?.(); else nativePlayer.pause(); } catch {}
    onComplete();
  };
  const skip = () => finish();

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setReduced(!!v)).catch(() => {}); }, []);

  // Web: RNW can strip media props — wire src/playsinline/ended imperatively.
  useEffect(() => {
    if (!isWeb || reduced) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      const chosen = pickWebSrc(v);
      if (chosen && v.getAttribute("src") !== chosen) v.setAttribute("src", chosen);
      v.setAttribute("playsinline", "true");
      v.setAttribute("preload", "auto");
      v.setAttribute("poster", POSTER_SRC);
      v.autoplay = false;
      v.muted = !started || !soundEnabled;
      v.defaultMuted = !started;
      v.volume = 0.65;
      const onEnd = () => finish();
      v.addEventListener("ended", onEnd);
      const tryPlay = () => {
        if (!started) return;
        try { const p = v.play?.(); p?.catch?.(() => {}); } catch {}
      };
      // Decode failure is non-fatal: the poster remains visible and the user can enter the Hub.
      const onErr = () => {};
      v.addEventListener("error", onErr);
      tryPlay();
      v.addEventListener("loadedmetadata", tryPlay);
      v.addEventListener("canplay", tryPlay);
      return () => {
        v.removeEventListener("ended", onEnd);
        v.removeEventListener("error", onErr);
        v.removeEventListener("loadedmetadata", tryPlay);
        v.removeEventListener("canplay", tryPlay);
      };
    } catch {}
  }, [reduced, soundEnabled, started]);

  // Reduced motion: hold the first frame briefly, then enter the hub calmly.
  useEffect(() => {
    if (!reduced) return;
    try { if (isWeb) videoRef.current?.pause?.(); else nativePlayer.pause(); } catch {}
    timers.current.push(setTimeout(finish, 2500));
  }, [reduced]);

  // Poll playback: drive portal overlays off real currentTime and finish on end.
  useEffect(() => {
    if (reduced || !started) return;
    if (isWeb && !WEB_SRC) {
      const startedAt = Date.now();
      const iv = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setFlightElapsed(elapsed);
        setPortalCount(Math.min(PORTALS.length, Math.max(0, Math.floor(Math.max(0, elapsed - 7600) / PORTAL_GAP / 1000) + 1)));
        if (elapsed >= WEB_FLIGHT_MS) { clearInterval(iv); finish(); }
      }, 250);
      return () => clearInterval(iv);
    }
    const iv = setInterval(() => {
      let t = 0; let d = 0; let isPlaying = false;
      try {
        if (isWeb) {
          const v = videoRef.current;
          if (!v) return;
          t = v.currentTime || 0; d = v.duration || 0; isPlaying = !v.paused && !v.ended;
          if (v.ended) { clearInterval(iv); finish(); return; }
          // Self-heal only after the user has entered with sound.
          if (v.paused && !v.ended && !done.current) {
            try { const p = v.play?.(); p?.catch?.(() => {}); } catch {}
          }
        } else {
          t = nativePlayer.currentTime || 0; d = nativePlayer.duration || 0; isPlaying = nativePlayer.playing;
          if (d > 0 && t >= d - 0.15) { clearInterval(iv); finish(); return; }
        }
      } catch { return; }
      setPlaying(isPlaying);
      if (d > 0) {
        const start = Math.max(d - PORTAL_WINDOW, 0);
        const n = t < start ? 0 : Math.min(PORTALS.length, Math.floor((t - start) / PORTAL_GAP) + 1);
        setPortalCount((c) => (n > c ? n : c));
      }
    }, 250);
    // Hard fallback so the entrance can never trap the user.
    timers.current.push(setTimeout(finish, 45000));
    if (!isWeb) { try { nativePlayer.play(); } catch {} }
    return () => clearInterval(iv);
  }, [reduced, started]);

  const startWithSound = () => {
    setStarted(true);
    setSoundEnabled(true);
    audio.update({ master: true, music: true, ambience: true });
    if (isWeb && !WEB_SRC) {
      setFlightElapsed(1);
      return;
    }
    try {
      if (isWeb && videoRef.current) {
        const v = videoRef.current;
        v.currentTime = 0;
        v.muted = false;
        v.defaultMuted = false;
        v.volume = 0.65;
        const p = v.play?.();
        p?.catch?.(() => {
          // Keep the first frame visible if the browser still refuses audio;
          // the same entrance control remains available for another tap.
          setStarted(false);
          try { v.pause?.(); v.currentTime = 0; } catch {}
        });
      } else {
        nativePlayer.currentTime = 0;
        nativePlayer.muted = false;
        nativePlayer.play();
      }
    } catch { setStarted(false); }
  };

  // Explicit user tap — the only thing that unmutes. Continues the same
  // timeline (never restarts); toggling back re-mutes without pausing.
  const enableSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audio.update({ master: next, music: next, ambience: next });
    try {
      if (isWeb && videoRef.current) {
        const v = videoRef.current;
        v.muted = !next;
        v.volume = 0.65;
        // If the browser paused on unmute (rare), resume from the same time.
        if (v.paused && !v.ended) { const p = v.play?.(); p?.catch?.(() => { v.muted = true; v.play?.()?.catch?.(() => {}); }); }
      } else nativePlayer.muted = !next;
    } catch {}
  };

  const desktop = SW >= 700;
  const stage = desktop ? { width: Math.min(SW * 0.52, 620), alignSelf: "center" as const } : null;

  return (
    <View style={s.root} testID="launch-root" accessibilityLabel="Guardian video entrance">
      {/* Desktop theatre treatment: preserve the full portrait cinematic while a blurred Toronto poster fills the widescreen frame. */}
      {isWeb && desktop && RNW.unstable_createElement("img", {
        src: POSTER_SRC,
        "aria-hidden": "true",
        style: {
          position: "absolute", inset: "-28px", width: "calc(100% + 56px)", height: "calc(100% + 56px)",
          objectFit: "cover", filter: "blur(24px) brightness(0.32) saturate(1.18)", transform: "scale(1.04)",
          opacity: 0.78, pointerEvents: "none",
        },
      })}
      {/* Single uninterrupted video backbone — never paused or swapped between beats */}
      <View style={[s.stage, stage]} testID="entrance-video-stage">
        {isWeb && !WEB_SRC
          ? <WebFlightScene started={started} elapsed={flightElapsed} />
          : isWeb
          ? RNW.unstable_createElement("video", {
              ref: videoRef,
              // src is wired imperatively (codec-aware mp4/webm pick) — see effect above.
              autoPlay: false,
              muted: !started || !soundEnabled,
              playsInline: true,
              preload: "auto",
              poster: POSTER_SRC,
              onEnded: finish,
              "data-testid": "entrance-video",
              "data-playing": String(playing),
              "aria-label": "Guardian video entrance",
              style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: desktop ? "contain" : "cover", background: "#000" },
            })
          : <VideoView player={nativePlayer} style={StyleSheet.absoluteFill} contentFit={desktop ? "contain" : "cover"} nativeControls={false} />}
      </View>

      {!started && !reduced && (
        <View style={s.entranceGate}>
          <Text style={s.gateKicker}>STAARWAARDD · TORONTO</Text>
          <Text style={s.gateTitle}>The Guardian is ready.</Text>
          <Text style={s.gateNote}>Your cinematic will begin from the first frame with sound.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Enter STAARWAARDD with sound" onPress={startWithSound} style={s.enterBtn} testID="enter-with-sound-btn">
            <Text style={s.enterText}>ENTER STAARWAARDD · SOUND ON</Text>
          </Pressable>
        </View>
      )}

      {/* Final section: seven canonical gateways materialize one by one OVER the moving video */}
      {portalCount > 0 && (
        <View style={s.portalRow} testID="portal-overlay-row">
          {PORTALS.slice(0, portalCount).map((p, i) => (
            <View key={p.id} style={s.portal} testID={`portal-summon-${i + 1}`} accessibilityLabel={`${p.label} gateway summoned`}>
              {RNW
                ? RNW.unstable_createElement("img", { src: p.img?.uri ?? p.img, style: { width: 56, height: 56, borderRadius: 12, objectFit: "cover" } })
                : null}
              {!isWeb && <ViewImage img={p.img} />}
              <Text style={s.portalLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Controls */}
      {started && <View style={s.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={soundEnabled ? "Disable sound" : "Enable sound"} onPress={enableSound} style={s.soundBtn} testID="enable-sound-btn">
          <Text style={s.soundText}>{soundEnabled ? "SOUND ON" : "ENABLE SOUND"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Enter the STAAR Hub" onPress={skip} style={s.skipBtn} testID="skip-cinematic-btn">
          <Text style={s.skipText}>ENTER THE HUB</Text>
        </Pressable>
      </View>}
    </View>
  );
}

// Native-only portal thumbnail (kept out of the web tree so no entrance <img> stills leak on web besides overlays)
function ViewImage({ img }: { img: any }) {
  const { Image } = require("react-native");
  return <Image source={img} style={{ width: 56, height: 56, borderRadius: 12 }} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  stage: { flex: 1, width: "100%", backgroundColor: "#000", overflow: "hidden" },
  flightRoot: { flex: 1, backgroundColor: "#071427", overflow: "hidden" },
  flightSky: { ...StyleSheet.absoluteFillObject, backgroundColor: "#102D4D", opacity: 0.64 },
  flightMoon: { position: "absolute", width: 170, height: 170, borderRadius: 100, top: "12%", right: "13%", backgroundColor: "#F5DFA5", opacity: 0.28, shadowColor: "#F5DFA5", shadowOpacity: 0.7, shadowRadius: 46 },
  flightCity: { position: "absolute", left: 0, right: 0, bottom: "10%", height: "28%", borderTopWidth: 1, borderTopColor: "#8FC5E855", backgroundColor: "#06101FBB" },
  towerA: { position: "absolute", left: "15%", bottom: 0, width: 42, height: "78%", backgroundColor: "#0B2942", borderTopWidth: 2, borderTopColor: "#A8D9EA77" },
  towerB: { position: "absolute", left: "47%", bottom: 0, width: 86, height: "100%", backgroundColor: "#0B233A", borderTopWidth: 2, borderTopColor: "#F4D79088" },
  towerC: { position: "absolute", right: "14%", bottom: 0, width: 54, height: "64%", backgroundColor: "#102C45", borderTopWidth: 2, borderTopColor: "#A8D9EA66" },
  cityLine: { position: "absolute", left: 0, right: 0, bottom: 12, height: 1, backgroundColor: "#E8C86F77" },
  flightGuardian: { position: "absolute", left: "35%", top: "32%", width: 136, height: 90, alignItems: "center", justifyContent: "center" },
  guardianGlow: { position: "absolute", width: 112, height: 54, borderRadius: 60, backgroundColor: "#9BE8FF22", shadowColor: "#9BE8FF", shadowOpacity: 0.9, shadowRadius: 26 },
  guardianBody: { position: "absolute", width: 24, height: 72, borderRadius: 18, backgroundColor: "#D9F5FF", shadowColor: "#D9F5FF", shadowOpacity: 0.95, shadowRadius: 12, transform: [{ rotate: "18deg" }] },
  guardianWingLeft: { position: "absolute", width: 86, height: 25, borderTopWidth: 4, borderColor: "#A7E9FF", borderRadius: 50, left: -8, top: 29, transform: [{ rotate: "-18deg" }] },
  guardianWingRight: { position: "absolute", width: 86, height: 25, borderTopWidth: 4, borderColor: "#A7E9FF", borderRadius: 50, right: -8, top: 20, transform: [{ rotate: "24deg" }] },
  guardianTrail: { position: "absolute", width: 110, height: 2, backgroundColor: "#F4D79088", left: -88, top: 58, transform: [{ rotate: "-11deg" }] },
  flightVignette: { ...StyleSheet.absoluteFillObject, borderWidth: 24, borderColor: "#02071177" },
  flightCaption: { position: "absolute", top: "13%", alignSelf: "center", alignItems: "center", paddingHorizontal: 18 },
  flightKicker: { color: "#F4D790", fontSize: 10, letterSpacing: 2.1, fontWeight: "900" },
  flightTitle: { color: "#FFFFFF", fontSize: 20, letterSpacing: 2.5, textAlign: "center", fontWeight: "900", marginTop: 10 },
  flightSub: { color: "#D4E7F5", fontSize: 11, textAlign: "center", marginTop: 7 },
  portalRow: {
    position: "absolute", bottom: 96, left: 12, right: 12,
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10,
    pointerEvents: "none",
  },
  captionStrip: {
    position: "absolute", top: 112, alignSelf: "center",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(232,200,111,0.5)", backgroundColor: "rgba(4,7,16,0.62)",
    pointerEvents: "none",
  },
  captionText: { color: "#F4E9C8", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
  portal: {
    alignItems: "center", padding: 6, borderRadius: 14,
    backgroundColor: "rgba(4,7,16,0.55)", borderWidth: 1, borderColor: "rgba(232,200,111,0.7)",
    ...glow("#7EDCF3", 14, 0.9),
  },
  portalLabel: { color: "#F4F7FF", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, marginTop: 3 },
  counter: { position: "absolute", bottom: 64, alignSelf: "center", color: "#E8C86F", fontSize: 11, letterSpacing: 2, fontWeight: "800" },
  controls: { position: "absolute", top: 54, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entranceGate: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(1,4,12,0.58)" },
  gateKicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 2.2, fontWeight: "900" },
  gateTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 34, textAlign: "center", fontWeight: "900", marginTop: 9 },
  gateNote: { color: "#D8E3F5", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 },
  enterBtn: { minHeight: 52, marginTop: 20, paddingHorizontal: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F2D980", backgroundColor: "rgba(232,200,111,0.18)", ...glow("#E8C86F", 22, 0.55) },
  enterText: { color: "#FFF2B8", fontSize: 11, letterSpacing: 1.25, fontWeight: "900" },
  soundBtn: { borderWidth: 1, borderColor: "rgba(232,200,111,0.6)", borderRadius: 12, paddingHorizontal: 14, minHeight: 44, justifyContent: "center", backgroundColor: "rgba(4,7,16,0.5)" },
  soundText: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },
  skipBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8, backgroundColor: "rgba(4,7,16,0.4)", borderRadius: 12 },
  skipText: { color: "#F4F7FF", fontSize: 11, letterSpacing: 1.6, fontWeight: "800" },
});
