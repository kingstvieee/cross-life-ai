import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
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
  const useApprovedMusic = approvedMusicAvailable && !approvedMusicFailed;
  const soundtrack = useAudioPlayer(approvedStartupSoundtrackSource);
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
    // The same on-screen mute button controls the one audible source.
    player.muted = useApprovedMusic || muted;
    soundtrack.muted = muted;
  }, [player, soundtrack, muted, useApprovedMusic]);

  useEffect(() => {
    if (!audioSessionReady) return;
    try {
      if (playing) player.play();
      else player.pause();
    } catch {
      onError();
      return;
    }
    if (!useApprovedMusic) {
      try { soundtrack.pause(); } catch { /* No source in public builds. */ }
      return;
    }
    try {
      if (playing) soundtrack.play();
      else soundtrack.pause();
    } catch {
      // If the staged AAC cannot play, fall back to the film's existing audio
      // instead of double-playing or trapping the owner at the splash screen.
      try { soundtrack.pause(); } catch { /* Already stopped. */ }
      setApprovedMusicFailed(true);
    }
  }, [audioSessionReady, playing, player, soundtrack, useApprovedMusic, onError]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} playsInline />;
}
