import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from "expo-audio";
import { AppState, Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useAuth } from '@/src/auth';
import { playServerSpeech, stopServerSpeech } from '@/src/server-speech';
import {fetchGuardianAlignmentForClip} from '@/src/guardian-alignment-client';
import type {GuardianAudioFrame} from '@/src/guardian-audio-frame';
import {canStartGuardianVoice, GUEST_GUARDIAN_WELCOME, guardianQuietOnDevice} from '@/src/guardian-voice-policy';

import type { AmbientKey } from "@/lib/staarwardd/experience";
import { initialGuardianSpeechState, transitionGuardianSpeech, type GuardianSpeechEvent } from "./guardian-speech-lifecycle";

export type CinematicCue = "opening" | "flight" | "shield" | "portal" | "transition" | "traverse" | "storm";

type AudioSettings = {
  master: boolean;
  music: boolean;
  ambience: boolean;
  voice: boolean;
  volume: number;
};

type AudioContextValue = AudioSettings & {
  speechQuiet: boolean;
  accountSpeechQuiet: boolean;
  audioHydrated: boolean;
  setAccountSpeechQuiet: (quiet: boolean) => void;
  speakGuestWelcome: () => Promise<boolean>;
  voiceNotice: string;
  speechPhase: "idle" | "speaking" | "waiting" | "muted";
  voicePlaybackActive: boolean;
  guardianAudioFrame: GuardianAudioFrame | null;
  setGuardianRigHash: (sha: string | null) => void;
  stopSpeech: () => void;
  activeAmbient: AmbientKey | null;
  update: (patch: Partial<AudioSettings>) => void;
  setSpeechQuiet: (quiet: boolean) => void;
  toggleAmbient: (key: AmbientKey) => void;
  playAmbient: (key: AmbientKey) => void;
  stopAmbient: () => void;
  playCue: (cue: CinematicCue) => void;
  speak: (text: string, rate?: number, speaker?: 'guardian') => Promise<boolean>;
  stopAll: () => void;
};

const STORAGE_KEY = "staarwardd.v13.audio-settings";
const QUIET_KEY = "staarwardd.guardian.voice-quiet.v1";
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
  const { user, api } = useAuth();
  const [voiceNotice, setVoiceNotice] = useState("");
  const [speechPhase, setSpeechPhase] = useState<"idle" | "speaking" | "waiting" | "muted">("idle");
  const [voicePlaybackActive, setVoicePlaybackActive] = useState(false);
  const [guardianAudioFrame,setGuardianAudioFrame] = useState<GuardianAudioFrame | null>(null);
  const guardianRigShaRef=useRef<string|null>(null);
  const setGuardianRigHash=useCallback((sha: string | null)=>{
    const accepted=sha && /^[a-f0-9]{64}$/.test(sha) ? sha : null;
    if(guardianRigShaRef.current===accepted)return;
    guardianRigShaRef.current=accepted;
    setGuardianAudioFrame(null);
  },[]);

  const companion = user?.companion;
  useEffect(() => { stopServerSpeech(); return stopServerSpeech; }, [companion]);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [speechQuiet, setSpeechQuietState] = useState(false);
  const [accountSpeechQuiet, setAccountSpeechQuietState] = useState(false);
  const [audioHydrated, setAudioHydrated] = useState(false);
  const [activeAmbient, setActiveAmbient] = useState<AmbientKey | null>(null);
  // One cached player per sound. expo-audio's web replace()/remove() strips the element
  // src and calls load(), which fires spurious "no supported source" MediaErrors — so we
  // never swap sources; we pause/rewind/reuse dedicated players instead.
  const ambientPlayers = useRef<Partial<Record<AmbientKey, AudioPlayer>>>({});
  const cuePlayers = useRef<Partial<Record<CinematicCue, AudioPlayer>>>({});
  const lastCue = useRef<CinematicCue | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRequest = useRef(0);
  useEffect(() => {
    // A previous account's speech must never persist as the next account's active avatar.
    speechRequest.current += 1;
    setVoicePlaybackActive(false);
    guardianRigShaRef.current=null;
    setGuardianAudioFrame(null);
    stopServerSpeech();
    void Speech.stop();
    accountQuietRef.current = false;
    setAccountSpeechQuietState(false);
    applyEffectiveQuiet(localQuietRef.current);
  }, [user?.user_id]);
  const guardianSpeech = useRef({ ...initialGuardianSpeechState });
  const dispatchGuardianSpeech = (event: GuardianSpeechEvent) => {
    guardianSpeech.current = transitionGuardianSpeech(guardianSpeech.current, event).state;
    setSpeechPhase(guardianSpeech.current.phase);
  };
  const speechQuietRef = useRef(false); // Effective, for all transport callbacks.
  const localQuietRef = useRef(false);
  const accountQuietRef = useRef(false);
  const audioHydratedRef = useRef(false);
  const settingsRef = useRef(settings);

  function applyEffectiveQuiet(quiet: boolean) {
    if (speechQuietRef.current === quiet) return;
    speechQuietRef.current = quiet;
    setSpeechQuietState(quiet);
    dispatchGuardianSpeech({ type: quiet ? 'MUTE' : 'UNMUTE' });
    if (quiet) {
      setGuardianAudioFrame(null);
      speechRequest.current += 1;
      setVoicePlaybackActive(false);
      stopServerSpeech();
      void Speech.stop();
    }
  }

  const setAccountSpeechQuiet = useCallback((quiet: boolean) => {
    if (!user || user.is_demo) return;
    accountQuietRef.current = quiet;
    setAccountSpeechQuietState(quiet);
    applyEffectiveQuiet(guardianQuietOnDevice(localQuietRef.current, quiet));
  }, [user?.user_id, user?.is_demo]);

  const clearFade = () => {
    if (fadeTimer.current) { clearInterval(fadeTimer.current); fadeTimer.current = null; }
  };

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
    let alive = true;
    void Promise.all([
      AsyncStorage.getItem(QUIET_KEY).catch(() => null),
      AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
    ]).then(([savedQuiet, savedSettings]) => {
      if (!alive) return;
      if (savedSettings) {
        try {
          settingsRef.current = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
          setSettings(settingsRef.current);
        } catch { /* preserve safe defaults */ }
      }
      localQuietRef.current = savedQuiet === 'true';
      applyEffectiveQuiet(guardianQuietOnDevice(localQuietRef.current, accountQuietRef.current));
      audioHydratedRef.current = true;
      setAudioHydrated(true);
    });
    return () => {
      alive = false;
      off?.();
      Object.values(ambientPlayers.current).forEach((p) => { try { p?.remove(); } catch { /* noop */ } });
      Object.values(cuePlayers.current).forEach((p) => { try { p?.remove(); } catch { /* noop */ } });
      stopServerSpeech();
    void Speech.stop();
    };
  }, []);

  const update = useCallback((patch: Partial<AudioSettings>) => {
    if (!audioHydratedRef.current) return;
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (!next.voice || !next.master || next.volume <= 0) {
      speechRequest.current += 1;
      setVoicePlaybackActive(false);
      setGuardianAudioFrame(null);
      dispatchGuardianSpeech({ type: 'REVOKE' });
      stopServerSpeech();
      void Speech.stop();
    }
    if (!next.master || (!next.music && !next.ambience)) {
      pauseAllAmbient();
      setActiveAmbient(null);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    speechRequest.current += 1;
    setVoicePlaybackActive(false);
    setGuardianAudioFrame(null);
    dispatchGuardianSpeech({ type: "STOP" });
    stopServerSpeech();
    void Speech.stop();
  }, []);

  useEffect(() => {
    // No background-audio permission has been granted for autonomous narration.
    // Native reminders can alert while the app is closed, but must never resume speech.
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') stopSpeech();
    });
    return () => sub.remove();
  }, [stopSpeech]);

  const stopAll = useCallback(() => {
    pauseAllAmbient();
    Object.values(cuePlayers.current).forEach((p) => { try { p?.pause(); } catch { /* noop */ } });
    setActiveAmbient(null);
    stopSpeech();
  }, [stopSpeech]);

  const setSpeechQuiet = useCallback((quiet: boolean) => {
    if (!audioHydratedRef.current) return;
    localQuietRef.current = quiet;
    void AsyncStorage.setItem(QUIET_KEY, quiet ? 'true' : 'false');
    applyEffectiveQuiet(guardianQuietOnDevice(quiet, accountQuietRef.current));
  }, []);

  // Each world's soundscape fades in softly on entry (non-toggling variant).
  const playAmbient = useCallback((key: AmbientKey) => {
    if (activeAmbient === key) return;
    if (!settings.master || (!settings.music && !settings.ambience)) return;
    try {
      void setAudioModeAsync({ playsInSilentMode: false });
      clearFade();
      pauseAllAmbient();
      let player = ambientPlayers.current[key];
      if (!player) {
        player = createAudioPlayer(SOURCES[key]);
        ambientPlayers.current[key] = player;
      }
      player.loop = true;
      player.volume = 0;
      player.seekTo(0);
      player.play();
      const target = settings.volume;
      const step = Math.max(target / 12, 0.01);
      fadeTimer.current = setInterval(() => {
        try {
          const current = player?.volume ?? 0;
          const next = Math.min(current + step, target);
          if (player) player.volume = next;
          if (next >= target) clearFade();
        } catch { clearFade(); }
      }, 150);
      setActiveAmbient(key);
    } catch {
      setActiveAmbient(null);
    }
  }, [activeAmbient, settings.ambience, settings.master, settings.music, settings.volume]);

  const stopAmbient = useCallback(() => {
    clearFade();
    pauseAllAmbient();
    setActiveAmbient(null);
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

  const canSpeakNow = () => canStartGuardianVoice({
    ...settingsRef.current,
    foreground: AppState.currentState === 'active',
    audioHydrated: audioHydratedRef.current,
    quiet: speechQuietRef.current,
  });

  const playDeviceSpeech = useCallback(async (text: string, rate: number, requestId: number, taskId: string, utteranceId: string) => {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
    const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
    if (requestId !== speechRequest.current || !canSpeakNow()) return false;
    const installed = voices.find(voice => voice.language === 'en-GB');
    return new Promise<boolean>(resolve => {
      let settled = false;
      const finish = (played: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (requestId === speechRequest.current) {
          setVoicePlaybackActive(false);
          dispatchGuardianSpeech({ type: 'TASK_COMPLETED', taskId });
          dispatchGuardianSpeech({ type: 'UTTERANCE_ENDED', utteranceId });
        }
        resolve(played && requestId === speechRequest.current);
      };
      const timer = setTimeout(() => { if (requestId === speechRequest.current) void Speech.stop(); finish(false); }, 120000);
      const failed = () => {
        if (requestId === speechRequest.current) setVoiceNotice('Device speech did not play. Check Silent Mode and media volume.');
        finish(false);
      };
      try {
        Speech.speak(text.slice(0,2000), {language:'en-GB',voice:installed?.identifier,rate,volume:settingsRef.current.volume,onStart:()=>{if(requestId===speechRequest.current && !speechQuietRef.current)setVoicePlaybackActive(true);},onDone:()=>finish(true),onStopped:()=>finish(false),onError:failed});
      } catch { failed(); }
    });
  }, []);

  const speakGuestWelcome = useCallback(async () => {
    if ((user && !user.is_demo) || !canSpeakNow()) return false;
    stopSpeech();
    const requestId = speechRequest.current;
    const taskId = `guest-welcome-${requestId}`;
    const utteranceId = `guest-voice-${requestId}`;
    dispatchGuardianSpeech({ type: 'START', taskId, utteranceId });
    setVoiceNotice('Guest welcome uses this device’s voice.');
    return playDeviceSpeech(GUEST_GUARDIAN_WELCOME, 0.95, requestId, taskId, utteranceId);
  }, [playDeviceSpeech, stopSpeech, user?.user_id, user?.is_demo]);

  const speak = useCallback(async (text: string, rate = 0.95, speaker?: 'guardian') => {
    if (!user || user.is_demo || !canSpeakNow() || !text.trim()) return false;
    const requestId = ++speechRequest.current;
    setVoicePlaybackActive(false);
    setGuardianAudioFrame(null);
    const taskId = `guardian-task-${requestId}`;
    const utteranceId = `guardian-utterance-${requestId}`;
    // New speech replaces any prior utterance, but navigation never cancels it.
    stopServerSpeech();
    void Speech.stop();
    dispatchGuardianSpeech({ type: 'START', taskId, utteranceId });
    setVoiceNotice('');
    try {
      let completed = false;
      await playServerSpeech(async signal => {
        const endpoint = speaker === 'guardian' ? '/api/guardian/speak-line' : '/api/companion/speak';
        const limit = speaker === 'guardian' ? 480 : 2000;
        const response = await api(endpoint, { method: 'POST', signal, body: JSON.stringify({ text: text.slice(0, limit) }) });
        return response;
      }, {
        volume: settingsRef.current.volume,
        resolveAlignment: async (clip,signal) => {
          const exactRigSha=guardianRigShaRef.current;
          if(!exactRigSha||signal.aborted||speechQuietRef.current) return null;
          const alignment=await fetchGuardianAlignmentForClip(clip,api,{
            signal,approvedRigReady:true,
          });
          if(!alignment||signal.aborted||guardianRigShaRef.current!==exactRigSha||
            requestId!==speechRequest.current)return null;
          return {modelSha256:exactRigSha,alignment};
        },
        onAlignedFrame: frame => {
          if(requestId!==speechRequest.current)return;
          if(!settingsRef.current.master||!settingsRef.current.voice||
             speechQuietRef.current||guardianRigShaRef.current!==frame?.modelSha256){
             setGuardianAudioFrame(null);return;
          }
          setGuardianAudioFrame(frame);
        },
        onStart:()=>{/* Playback clock owns measured mouth cue positions. */},
        onPlaybackChange: playing => {
          if(requestId===speechRequest.current&&!speechQuietRef.current){
            setVoicePlaybackActive(playing);
            if(!playing)setGuardianAudioFrame(null);
          }
        },
        onDone:()=>{
          completed=true;
          if(requestId===speechRequest.current){setVoicePlaybackActive(false);setGuardianAudioFrame(null);}
        },
      });
      if (requestId !== speechRequest.current) return false;
      setVoicePlaybackActive(false);
      dispatchGuardianSpeech({ type: 'TASK_COMPLETED', taskId });
      dispatchGuardianSpeech({ type: 'UTTERANCE_ENDED', utteranceId });
      return completed;
    } catch {
      if (requestId !== speechRequest.current || speechQuietRef.current) return false;
      setVoicePlaybackActive(false);
      setVoiceNotice('Using installed device speech. Server voice is unavailable.');
      return playDeviceSpeech(text, rate, requestId, taskId, utteranceId);
    }
  }, [api, playDeviceSpeech, user?.user_id, user?.is_demo]);

  const value = useMemo(() => ({
    ...settings, speechQuiet, accountSpeechQuiet, audioHydrated, setAccountSpeechQuiet, speakGuestWelcome,
    speechPhase, voicePlaybackActive, voiceNotice,
    guardianAudioFrame,setGuardianRigHash,
    activeAmbient, update, setSpeechQuiet, toggleAmbient, playAmbient,
    stopAmbient, playCue, speak, stopSpeech, stopAll,
  }), [activeAmbient, guardianAudioFrame, setGuardianRigHash, playAmbient, playCue,
       settings, setSpeechQuiet, speak, speakGuestWelcome, speechQuiet, accountSpeechQuiet, audioHydrated,
       setAccountSpeechQuiet, speechPhase, voicePlaybackActive,
       voiceNotice, stopSpeech, stopAll, stopAmbient, toggleAmbient, update]);
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useStaarAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("useStaarAudio must be used inside StaarAudioProvider");
  return value;
}
