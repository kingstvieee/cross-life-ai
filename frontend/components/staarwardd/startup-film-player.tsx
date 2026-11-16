import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { decideStartupPlayback } from "./startup-audio-gate";
import { useVideoPlayer, VideoView } from "expo-video";
import approvedStartupSoundtrackSource from "./startup-approved-soundtrack-source";

export type FilmProps = { muted: boolean; playing: boolean; onEnd: () => void; onError: () => void; onReady: () => void };

/**
 * The original hash-locked film remains untouched.
 * When the privately staged approved soundtrack is present, play its AAC
 * track while muting the movie's embedded soundtrack to prevent doubled audio.
 * In source-only development builds, retain existing movie-audio fallback.
 */
export default function StartupFilmPlayer({ muted, playing, onEnd, onError, onReady }: FilmProps) {
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const [approvedMusicFailed, setApprovedMusicFailed] = useState(false);
  const approvedMusicAvailable = approvedStartupSoundtrackSource !== null;
  const soundtrack = useAudioPlayer(approvedStartupSoundtrackSource);
  const soundtrackStatus = useAudioPlayerStatus(soundtrack);
  const gate = decideStartupPlayback({
    sessionReady: audioSessionReady,
    filmRequested: playing,
    approvedMusicAvailable,
    approvedMusicLoaded: soundtrackStatus.isLoaded,
    approvedMusicFailed,
    muted
  });
  const player = useVideoPlayer(require("@/assets/videos/guardian-startup.mp4"), p => {
    p.loop = false;
    // Mute the video itself if the owner-approved standalone music is bundled.
    p.muted = approvedMusicAvailable || muted;
  });

  useEffect(() => {
    let active = true;
    // Foreground-only audio. Do not authorize microphone or background play.
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {
      // The film remains skippable if iOS refuses the audio-session request.
    }).finally(() => {
      if (active) setAudioSessionReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const end = player.addListener("playToEnd", onEnd);
    const status = player.addListener("statusChange", event => {
      if (event.status === "error") onError();
      if (event.status === "readyToPlay") onReady();
    });
    if (player.status === "readyToPlay") onReady();
    return () => { end.remove(); status.remove(); };
  }, [player, onEnd, onError, onReady]);

  useEffect(() => {
    if (!approvedMusicAvailable || approvedMusicFailed) return;
    // Native decoding errors often surface asynchronously, not in play().
    // Switch to the original locked movie audio instead of leaving silence.
    const subscription = soundtrack.addListener("playbackStatusUpdate", status => {
      if (status.error) {
        try { soundtrack.pause(); } catch { /* Player already stopped. */ }
        setApprovedMusicFailed(true);
      }
    });
    return () => subscription.remove();
  }, [soundtrack, approvedMusicAvailable, approvedMusicFailed]);

  useEffect(() => {
    // A missing or stalled AAC must never leave the startup film black and silent.
    if (!gate.waitingForMusic) return;
    const timeout = setTimeout(() => setApprovedMusicFailed(true), 3500);
    return () => clearTimeout(timeout);
  }, [gate.waitingForMusic]);

  useEffect(() => {
    // Always expose exactly one audible source at a time.
    player.muted = gate.muteFilm;
    soundtrack.muted = gate.muteMusic;
  }, [player, soundtrack, gate.muteFilm, gate.muteMusic]);

  useEffect(() => {
    if (!audioSessionReady) return;
    try {
      if (gate.playFilm) player.play();
      else player.pause();
    } catch {
      onError();
      return;
    }
    if (!gate.playApprovedMusic) {
      try { soundtrack.pause(); } catch { /* No private source in public builds. */ }
      return;
    }
    try {
      soundtrack.play();
    } catch {
      // If the staged AAC cannot play, fall back to the film's existing audio
      // instead of double-playing or trapping the owner at the splash screen.
      try { soundtrack.pause(); } catch { /* Already stopped. */ }
      setApprovedMusicFailed(true);
    }
  }, [audioSessionReady, gate.playFilm, gate.playApprovedMusic, player, soundtrack, onError]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} playsInline />;
}
