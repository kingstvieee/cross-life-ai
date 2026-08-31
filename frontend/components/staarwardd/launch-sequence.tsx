import { glow } from "@/lib/staarwardd/shadow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions,
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
const WEB_SRC = "/video/guardian-toronto-traverse-hd.mp4";
const WEB_SRC_WEBM = "/video/guardian-toronto-traverse-hd.webm";

function pickWebSrc(v: any): string {
  try {
    const h264 = v.canPlayType?.('video/mp4; codecs="avc1.42E01E"') || "";
    if (h264 === "probably" || h264 === "maybe") return WEB_SRC;
    const vp9 = v.canPlayType?.('video/webm; codecs="vp9"') || "";
    if (vp9) return WEB_SRC_WEBM;
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
      if (v.getAttribute("src") !== chosen) v.setAttribute("src", chosen);
      v.setAttribute("playsinline", "true");
      v.setAttribute("preload", "auto");
      v.setAttribute("poster", "/video/guardian-toronto-traverse-poster.jpg");
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
      // Decode failure (unsupported codec) — swap to the webm encoding once.
      const onErr = () => {
        try {
          if (v.getAttribute("src") !== WEB_SRC_WEBM) {
            v.setAttribute("src", WEB_SRC_WEBM);
            v.load?.();
            tryPlay();
          }
        } catch {}
      };
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
        src: "/video/guardian-toronto-traverse-poster.jpg",
        "aria-hidden": "true",
        style: {
          position: "absolute", inset: "-28px", width: "calc(100% + 56px)", height: "calc(100% + 56px)",
          objectFit: "cover", filter: "blur(24px) brightness(0.32) saturate(1.18)", transform: "scale(1.04)",
          opacity: 0.78, pointerEvents: "none",
        },
      })}
      {/* Single uninterrupted video backbone — never paused or swapped between beats */}
      <View style={[s.stage, stage]} testID="entrance-video-stage">
        {isWeb
          ? RNW.unstable_createElement("video", {
              ref: videoRef,
              // src is wired imperatively (codec-aware mp4/webm pick) — see effect above.
              autoPlay: false,
              muted: !started || !soundEnabled,
              playsInline: true,
              preload: "auto",
              poster: "/video/guardian-toronto-traverse-poster.jpg",
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
      {/* Subtle caption strip naming each gateway as it materializes */}
      {portalCount > 0 && (
        <View style={s.captionStrip} testID="gateway-caption">
          <Text style={s.captionText}>✦ {PORTALS[Math.min(portalCount, PORTALS.length) - 1].label.toUpperCase()} GATEWAY</Text>
        </View>
      )}
      {portalCount > 0 && portalCount < 7 && (
        <Text style={s.counter} testID="portal-counter">{portalCount} / 7 GATEWAYS</Text>
      )}

      {/* Controls */}
      {started && <View style={s.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={soundEnabled ? "Disable sound" : "Enable sound"} onPress={enableSound} style={s.soundBtn} testID="enable-sound-btn">
          <Text style={s.soundText}>{soundEnabled ? "SOUND ON" : "ENABLE SOUND"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip cinematic" onPress={skip} style={s.skipBtn} testID="skip-cinematic-btn">
          <Text style={s.skipText}>SKIP CINEMATIC</Text>
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
