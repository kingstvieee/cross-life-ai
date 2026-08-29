import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
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

const SOURCES: Record<AmbientKey, number> = {
  hub: require("@/assets/audio/hub.mp3"),
  creativity: require("@/assets/audio/creativity.mp3"),
  work: require("@/assets/audio/work.mp3"),
  home: require("@/assets/audio/home.mp3"),
  wellbeing: require("@/assets/audio/wellbeing.mp3"),
  relationships: require("@/assets/audio/relationships.mp3"),
  events: require("@/assets/audio/events.mp3"),
  style: require("@/assets/audio/style.mp3"),
};
const CUES: Record<CinematicCue, number> = {
  opening: require("@/assets/audio/opening.mp3"),
  flight: require("@/assets/audio/flight.mp3"),
  shield: require("@/assets/audio/shield.mp3"),
  portal: require("@/assets/audio/portal.mp3"),
  transition: require("@/assets/audio/transition.mp3"),
  traverse: require("@/assets/audio/toronto-portal.mp3"),
  storm: require("@/assets/audio/cloud-rumble-lightning-prominent.mp3"),
};

export function StaarAudioProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [activeAmbient, setActiveAmbient] = useState<AmbientKey | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const cueRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) }); } catch { /* preserve safe defaults */ }
    }).catch(() => undefined);
    return () => { playerRef.current?.remove(); cueRef.current?.remove(); void Speech.stop(); };
  }, []);

  const update = useCallback((patch: Partial<AudioSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (!next.master || (!next.music && !next.ambience)) {
        playerRef.current?.pause();
        setActiveAmbient(null);
      }
      return next;
    });
  }, []);

  const stopAll = useCallback(() => {
    playerRef.current?.pause();
    cueRef.current?.pause();
    setActiveAmbient(null);
    void Speech.stop();
  }, []);

  const toggleAmbient = useCallback((key: AmbientKey) => {
    if (activeAmbient === key) {
      playerRef.current?.pause();
      setActiveAmbient(null);
      return;
    }
    if (!settings.master || (!settings.music && !settings.ambience)) return;
    try {
      void setAudioModeAsync({ playsInSilentMode: false });
      playerRef.current?.remove();
      const player = createAudioPlayer(SOURCES[key]);
      player.loop = true;
      player.volume = settings.volume;
      player.play();
      playerRef.current = player;
      setActiveAmbient(key);
    } catch {
      setActiveAmbient(null);
    }
  }, [activeAmbient, settings.ambience, settings.master, settings.music, settings.volume]);

  const playCue = useCallback((cue: CinematicCue) => {
    if (!settings.master || (!settings.music && !settings.ambience)) return;
    try {
      void setAudioModeAsync({ playsInSilentMode: false });
      cueRef.current?.remove();
      const player = createAudioPlayer(CUES[cue]);
      player.volume = Math.min(settings.volume * 0.85, 0.32);
      player.play();
      cueRef.current = player;
    } catch { /* controlled cinematic audio remains optional and may fail gracefully */ }
  }, [settings.ambience, settings.master, settings.music, settings.volume]);

  const speak = useCallback(async (text: string, rate = 0.95) => {
    if (!settings.master || !settings.voice) return;
    try {
      const alreadySpeaking = await Speech.isSpeakingAsync();
      if (alreadySpeaking) await Speech.stop();
      Speech.speak(text, { language: "en-US", rate, pitch: 1, volume: settings.volume, useApplicationAudioSession: false });
    } catch { /* audio is optional; fail silently without misrepresenting playback */ }
  }, [settings.master, settings.voice, settings.volume]);

  const value = useMemo(() => ({ ...settings, activeAmbient, update, toggleAmbient, playCue, speak, stopAll }), [activeAmbient, playCue, settings, speak, stopAll, toggleAmbient, update]);
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useStaarAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("useStaarAudio must be used inside StaarAudioProvider");
  return value;
}
