import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from "expo-audio";
import { Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import type { AmbientKey } from "@/lib/staarwardd/experience";

export type CinematicCue = "opening" | "flight" | "shield" | "portal" | "transition" | "traverse" | "storm";

type AudioSettings = {
  master: boolean;
  music: boolean;
  ambience: boolean;
  voice: boolean;
  volume: number;
};

type AudioContextValue = AudioSettings & {
  activeAmbient: AmbientKey | null;
  update: (patch: Partial<AudioSettings>) => void;
  toggleAmbient: (key: AmbientKey) => void;
  playCue: (cue: CinematicCue) => void;
  speak: (text: string, rate?: number) => Promise<void>;
  stopAll: () => void;
};

const STORAGE_KEY = "staarwardd.v13.audio-settings";
const DEFAULT_SETTINGS: AudioSettings = { master: false, music: false, ambience: false, voice: true, volume: 0.28 };
const AudioContext = createContext<AudioContextValue | null>(null);

// On web, browsers need real URLs with an audio/mpeg MIME type; the same files are
// served statically from /public/audio. Native keeps bundled require() assets.
const webSrc = (name: string): AudioSource => ({ uri: `/audio/${name}` });
const isWeb = Platform.OS === "web";

const SOURCES: Record<AmbientKey, AudioSource> = isWeb
  ? {
      hub: webSrc("hub.mp3"),
      creativity: webSrc("creativity.mp3"),
      work: webSrc("work.mp3"),
      home: webSrc("home.mp3"),
      wellbeing: webSrc("wellbeing.mp3"),
      relationships: webSrc("relationships.mp3"),
      events: webSrc("events.mp3"),
      style: webSrc("style.mp3"),
    }
  : {
      hub: require("@/assets/audio/hub.mp3"),
      creativity: require("@/assets/audio/creativity.mp3"),
      work: require("@/assets/audio/work.mp3"),
      home: require("@/assets/audio/home.mp3"),
      wellbeing: require("@/assets/audio/wellbeing.mp3"),
      relationships: require("@/assets/audio/relationships.mp3"),
      events: require("@/assets/audio/events.mp3"),
      style: require("@/assets/audio/style.mp3"),
    };
const CUES: Record<CinematicCue, AudioSource> = isWeb
  ? {
      opening: webSrc("opening.mp3"),
      flight: webSrc("flight.mp3"),
      shield: webSrc("shield.mp3"),
      portal: webSrc("portal.mp3"),
      transition: webSrc("transition.mp3"),
      traverse: webSrc("toronto-portal.mp3"),
      storm: webSrc("cloud-rumble-lightning-prominent.mp3"),
    }
  : {
      opening: require("@/assets/audio/opening.mp3"),
      flight: require("@/assets/audio/flight.mp3"),
      shield: require("@/assets/audio/shield.mp3"),
      portal: require("@/assets/audio/portal.mp3"),
      transition: require("@/assets/audio/transition.mp3"),
      traverse: require("@/assets/audio/toronto-portal.mp3"),
      storm: require("@/assets/audio/cloud-rumble-lightning-prominent.mp3"),
    };

export function StaarAudioProvider({ children }: PropsWithChildren) {
  const [guardianVoice, setGuardianVoice] = useState<string | undefined>();
  useEffect(() => {
    let mounted = true;
    void Speech.getAvailableVoicesAsync().then((voices) => {
      if (!mounted) return;
      const canadian = voices.filter((voice) => voice.language.toLowerCase().replace("_", "-").startsWith("en-ca"));
      const preferred = canadian.find((voice) => /liam/i.test(voice.name + " " + voice.identifier))
        ?? canadian.find((voice) => /natural|enhanced|male/i.test(voice.name + " " + voice.identifier))
        ?? canadian[0]
        ?? voices.find((voice) => /liam/i.test(voice.name + " " + voice.identifier));
      setGuardianVoice(preferred?.identifier);
    }).catch(() => { /* System voice discovery is optional. */ });
    return () => { mounted = false; };
  }, []);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [activeAmbient, setActiveAmbient] = useState<AmbientKey | null>(null);
  // One cached player per sound. expo-audio's web replace()/remove() strips the element
  // src and calls load(), which fires spurious "no supported source" MediaErrors — so we
  // never swap sources; we pause/rewind/reuse dedicated players instead.
  const ambientPlayers = useRef<Partial<Record<AmbientKey, AudioPlayer>>>({});
  const cuePlayers = useRef<Partial<Record<CinematicCue, AudioPlayer>>>({});
  const lastCue = useRef<CinematicCue | null>(null);

  const pauseAllAmbient = () => {
    Object.values(ambientPlayers.current).forEach((p) => { try { p?.pause(); } catch { /* noop */ } });
  };

  useEffect(() => {
    // expo-audio's web player calls media.play() without catching the promise and
    // initializes players with an empty src before the real source resolves. Both fire
    // benign unhandled rejections (NotSupportedError / AbortError). Suppress only those.
    let off: (() => void) | undefined;
    if (isWeb && typeof window !== "undefined") {
      const handler = (event: PromiseRejectionEvent) => {
        const reason = event?.reason;
        const name = reason?.name ?? "";
        const message = String(reason?.message ?? reason ?? "");
        const benign =
          name === "NotSupportedError" ||
          name === "AbortError" ||
          message.includes("no supported source") ||
          message.includes("The play() request was interrupted");
        if (benign) event.preventDefault();
      };
      window.addEventListener("unhandledrejection", handler);
      off = () => window.removeEventListener("unhandledrejection", handler);
    }
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) }); } catch { /* preserve safe defaults */ }
    }).catch(() => undefined);
    return () => {
      off?.();
      Object.values(ambientPlayers.current).forEach((p) => { try { p?.remove(); } catch { /* noop */ } });
      Object.values(cuePlayers.current).forEach((p) => { try { p?.remove(); } catch { /* noop */ } });
      void Speech.stop();
    };
  }, []);

  const update = useCallback((patch: Partial<AudioSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (!next.master || (!next.music && !next.ambience)) {
        pauseAllAmbient();
        setActiveAmbient(null);
      }
      return next;
    });
  }, []);

  const stopAll = useCallback(() => {
    pauseAllAmbient();
    Object.values(cuePlayers.current).forEach((p) => { try { p?.pause(); } catch { /* noop */ } });
    setActiveAmbient(null);
    void Speech.stop();
  }, []);

  const toggleAmbient = useCallback((key: AmbientKey) => {
    if (activeAmbient === key) {
      ambientPlayers.current[key]?.pause();
      setActiveAmbient(null);
      return;
    }
    if (!settings.master || (!settings.music && !settings.ambience)) return;
    try {
      void setAudioModeAsync({ playsInSilentMode: false });
      pauseAllAmbient();
      let player = ambientPlayers.current[key];
      if (!player) {
        player = createAudioPlayer(SOURCES[key]);
        ambientPlayers.current[key] = player;
      }
      player.loop = true;
      player.volume = settings.volume;
      player.seekTo(0);
      player.play();
      setActiveAmbient(key);
    } catch {
      setActiveAmbient(null);
    }
  }, [activeAmbient, settings.ambience, settings.master, settings.music, settings.volume]);

  const playCue = useCallback((cue: CinematicCue) => {
    if (!settings.master || (!settings.music && !settings.ambience)) return;
    try {
      void setAudioModeAsync({ playsInSilentMode: false });
      if (lastCue.current && lastCue.current !== cue) {
        cuePlayers.current[lastCue.current]?.pause();
      }
      let player = cuePlayers.current[cue];
      if (!player) {
        player = createAudioPlayer(CUES[cue]);
        cuePlayers.current[cue] = player;
      }
      player.volume = Math.min(settings.volume * 0.85, 0.32);
      player.seekTo(0);
      player.play();
      lastCue.current = cue;
    } catch { /* controlled cinematic audio remains optional and may fail gracefully */ }
  }, [settings.ambience, settings.master, settings.music, settings.volume]);

  const speak = useCallback(async (text: string, rate = 0.95) => {
    if (!settings.master || !settings.voice) return;
    try {
      const alreadySpeaking = await Speech.isSpeakingAsync();
      if (alreadySpeaking) await Speech.stop();
      Speech.speak(text, { language: "en-CA", voice: guardianVoice, rate: Math.min(Math.max(rate * 1.03, 0.94), 1.06), pitch: 0.96, volume: settings.volume, useApplicationAudioSession: false });
    } catch { /* audio is optional; fail silently without misrepresenting playback */ }
  }, [guardianVoice, settings.master, settings.voice, settings.volume]);

  const value = useMemo(() => ({ ...settings, activeAmbient, update, toggleAmbient, playCue, speak, stopAll }), [activeAmbient, playCue, settings, speak, stopAll, toggleAmbient, update]);
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useStaarAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("useStaarAudio must be used inside StaarAudioProvider");
  return value;
}
