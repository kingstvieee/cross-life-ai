import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { glow } from "@/lib/staarwardd/shadow";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";

const LAUNCH_KEY = "staarwardd.launch-seen";
const isWeb = Platform.OS === "web";
const WEB_MP4 = "/video/guardian-toronto-traverse-hd.mp4";
const WEB_WEBM = "/video/guardian-toronto-traverse-hd.webm";
const WEB_POSTER = "/video/guardian-toronto-traverse-poster.jpg";
const OPENING_AUDIO = "/audio/opening.mp3";
const FLIGHT_AUDIO = "/audio/flight.mp3";
const NATIVE_SRC = require("@/assets/videos/guardian-toronto-traverse-hd.mp4");

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

const PORTALS: { id: PortalId; label: string; img: any }[] = [
  { id: "creativity", label: "Creativity", img: require("@/assets/images/staarwardd/portal-creativity-v7.webp") },
  { id: "work", label: "Work", img: require("@/assets/images/staarwardd/portal-work-v7.webp") },
  { id: "home", label: "Home", img: require("@/assets/images/staarwardd/portal-home-v7.webp") },
  { id: "wellbeing", label: "Wellbeing", img: require("@/assets/images/staarwardd/portal-wellbeing-v7.webp") },
  { id: "relationships", label: "Relationships", img: require("@/assets/images/staarwardd/portal-relationships-v7.webp") },
  { id: "events", label: "Community", img: require("@/assets/images/staarwardd/portal-community-v7.webp") },
  { id: "style", label: "Style", img: require("@/assets/images/staarwardd/portal-style-v7.webp") },
];

const RNW = isWeb ? require("react-native-web") : null;

export function LaunchSequence({ onComplete }: { onComplete: () => void; onSelectPortal?: (id: PortalId) => void }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 700;
  const audio = useStaarAudio();
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(!isWeb);
  const [portalCount, setPortalCount] = useState(0);
  const [reduced, setReduced] = useState(false);
  const videoRef = useRef<any>(null);
  const openingRef = useRef<any>(null);
  const flightRef = useRef<any>(null);
  const done = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativePlayer = useVideoPlayer(isWeb ? null : NATIVE_SRC, (p) => { p.loop = false; p.muted = false; });

  const stopWebAudio = () => {
    for (const ref of [openingRef, flightRef]) {
      try { ref.current?.pause?.(); ref.current && (ref.current.currentTime = 0); } catch {}
    }
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    try { if (isWeb) videoRef.current?.pause?.(); else nativePlayer.pause(); } catch {}
    stopWebAudio();
    onComplete();
  };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setReduced(!!v)).catch(() => {});
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); stopWebAudio(); };
  }, []);

  useEffect(() => {
    if (!reduced) return;
    const t = setTimeout(finish, 1800);
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (!started) return;
    intervalRef.current = setInterval(() => {
      let t = 0; let d = 0;
      try {
        if (isWeb) {
          const v = videoRef.current;
          if (!v) return;
          t = v.currentTime || 0;
          d = v.duration || 0;
          if (v.ended) { finish(); return; }
        } else {
          t = nativePlayer.currentTime || 0;
          d = nativePlayer.duration || 0;
          if (d > 0 && t >= d - 0.1) { finish(); return; }
        }
      } catch { return; }
      if (d > 0) {
        const revealAt = Math.max(d - 8, 0);
        const next = t < revealAt ? 0 : Math.min(7, Math.floor((t - revealAt) / 0.95) + 1);
        setPortalCount((n) => Math.max(n, next));
      }
    }, 200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started]);

  const beginWebSound = () => {
    if (typeof window === "undefined") return;
    try {
      const opening = new window.Audio(OPENING_AUDIO);
      const flight = new window.Audio(FLIGHT_AUDIO);
      opening.preload = "auto";
      flight.preload = "auto";
      opening.volume = 0.9;
      flight.volume = 0.72;
      flight.loop = true;
      openingRef.current = opening;
      flightRef.current = flight;
      opening.onended = () => { flight.play().catch(() => {}); };
      opening.play().catch(() => { flight.play().catch(() => {}); });
    } catch {}
  };

  const startWithSound = () => {
    if (started || (!ready && isWeb)) return;
    setStarted(true);
    audio.update({ master: true, music: true, ambience: true });
    try {
      if (isWeb) {
        const v = videoRef.current;
        if (!v) { setStarted(false); return; }
        v.currentTime = 0;
        v.muted = true;
        v.volume = 1;
        beginWebSound();
        const p = v.play?.();
        p?.catch?.(() => { setStarted(false); stopWebAudio(); try { v.currentTime = 0; } catch {} });
      } else {
        nativePlayer.currentTime = 0;
        nativePlayer.muted = false;
        nativePlayer.volume = 1;
        nativePlayer.play();
      }
    } catch { setStarted(false); stopWebAudio(); }
  };

  const stage = desktop ? { width: Math.min(width * 0.52, 620), alignSelf: "center" as const } : null;

  return (
    <View style={s.root} testID="launch-root" accessibilityLabel="Guardian video entrance">
      {isWeb && desktop && RNW.unstable_createElement("img", {
        src: WEB_POSTER,
        "aria-hidden": "true",
        style: { position: "absolute", inset: "-24px", width: "calc(100% + 48px)", height: "calc(100% + 48px)", objectFit: "cover", filter: "blur(20px) brightness(.34)", transform: "scale(1.04)", opacity: .8, pointerEvents: "none" },
      })}

      <View style={[s.stage, stage]} testID="entrance-video-stage">
        {isWeb
          ? RNW.unstable_createElement("video", {
              ref: videoRef,
              playsInline: true,
              preload: "auto",
              poster: WEB_POSTER,
              muted: true,
              onCanPlay: () => setReady(true),
              onCanPlayThrough: () => setReady(true),
              onLoadedData: () => setReady(true),
              onEnded: finish,
              "data-testid": "entrance-video",
              "aria-label": "Guardian Toronto cinematic entrance",
              style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: desktop ? "contain" : "cover", background: "#000", transform: "translateZ(0)", backfaceVisibility: "hidden" },
              children: [
                RNW.unstable_createElement("source", { key: "mp4", src: WEB_MP4, type: "video/mp4" }),
                RNW.unstable_createElement("source", { key: "webm", src: WEB_WEBM, type: "video/webm" }),
              ],
            })
          : <VideoView player={nativePlayer} style={StyleSheet.absoluteFill} contentFit={desktop ? "contain" : "cover"} nativeControls={false} />}
      </View>

      {!started && !reduced && (
        <View style={s.gate}>
          <Text style={s.kicker}>STAARWAARDD · TORONTO</Text>
          <Text style={s.title}>The Guardian is ready.</Text>
          <Text style={s.note}>{ready ? "Cinematic loaded. Sound will start with your tap." : "Preparing the cinematic for smooth playback…"}</Text>
          <Pressable disabled={!ready && isWeb} onPress={startWithSound} style={[s.enter, !ready && isWeb && s.enterDisabled]} testID="enter-with-sound-btn">
            <Text style={s.enterText}>{ready ? "ENTER STAARWAARDD · SOUND ON" : "LOADING CINEMATIC"}</Text>
          </Pressable>
        </View>
      )}

      {portalCount > 0 && (
        <View style={s.portalRow} testID="portal-overlay-row">
          {PORTALS.slice(0, portalCount).map((p, i) => (
            <View key={p.id} style={s.portal} testID={`portal-summon-${i + 1}`}>
              {isWeb && RNW.unstable_createElement("img", { src: p.img?.uri ?? p.img, style: { width: 54, height: 54, borderRadius: 12, objectFit: "cover" } })}
              {!isWeb && <NativeImage img={p.img} />}
              <Text style={s.portalLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function NativeImage({ img }: { img: any }) {
  const { Image } = require("react-native");
  return <Image source={img} style={{ width: 54, height: 54, borderRadius: 12 }} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  stage: { flex: 1, width: "100%", backgroundColor: "#000", overflow: "hidden" },
  gate: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(1,4,12,.58)" },
  kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 2.2, fontWeight: "900" },
  title: { color: "#FFF", fontSize: 28, lineHeight: 34, textAlign: "center", fontWeight: "900", marginTop: 9 },
  note: { color: "#D8E3F5", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 },
  enter: { minHeight: 52, marginTop: 20, paddingHorizontal: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F2D980", backgroundColor: "rgba(232,200,111,.18)", ...glow("#E8C86F", 22, .55) },
  enterDisabled: { opacity: .45 },
  enterText: { color: "#FFF2B8", fontSize: 11, letterSpacing: 1.25, fontWeight: "900" },
  portalRow: { position: "absolute", bottom: 86, left: 12, right: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, pointerEvents: "none" },
  portal: { alignItems: "center", padding: 6, borderRadius: 14, backgroundColor: "rgba(4,7,16,.62)", borderWidth: 1, borderColor: "rgba(232,200,111,.72)", ...glow("#7EDCF3", 14, .8) },
  portalLabel: { color: "#F4F7FF", fontSize: 9, fontWeight: "800", letterSpacing: .4, marginTop: 3 },
});