/** Host-to-Guardian timeline packet. This is a transport contract, not proof
 * of an accurate or owner-approved phoneme alignment. The producer must bind
 * exact model/audio hashes to separately accepted recording evidence.
 */
export type GuardianAudioFrame = {
  modelSha256: string;
  audioSha256: string;
  expectedAudioSha256: string;
  approvedAlignmentEvidenceId: string;
  approvedAlignment: boolean;
  playing: boolean;
  playheadMs: number;
  durationMs: number;
  cues: Array<{atMs: number; viseme: string; weight: number}>;
};
export function guardianWireFrame(frame: GuardianAudioFrame | null, session: string) {
  return frame
    ? { ...frame, source:'staar-native-guardian-audio-v1',session }
    : { source:'staar-native-guardian-audio-v1', session,
        playing:false, approvedAlignment:false };
}

/** A verified server alignment is audio-derived; it never approves the face.
 * No host packet exists until a distinct, SHA-bound 3D model actually loads.
 */
export type GuardianAudioAlignment = {
  durationMs: number;
  source: string;
  cues: GuardianAudioFrame['cues'];
};
export type GuardianAlignedClip = {
  modelSha256: string;
  alignment: GuardianAudioAlignment;
};
type PlaybackClock = { currentTime: number; duration: number; playing: boolean;
  isBuffering?: boolean; didJustFinish?: boolean; error?: unknown };
type ClipIdentity = { audioSha256: string };
const sha = (value: string) => /^[a-f0-9]{64}$/.test(value);
export function guardianFrameFromPlayback(
  clip: ClipIdentity,
  bound: GuardianAlignedClip | null,
  status: PlaybackClock,
): GuardianAudioFrame | null {
  if (!bound || !sha(bound.modelSha256) || !sha(clip.audioSha256) ||
    bound.alignment.source !== 'rhubarb-audio-mouth-shapes' ||
    !Array.isArray(bound.alignment.cues) || !bound.alignment.cues.length ||
    !Number.isFinite(bound.alignment.durationMs) ||
    bound.alignment.durationMs < 100 || bound.alignment.durationMs > 240000 ||
    !status.playing || status.isBuffering || status.didJustFinish || status.error ||
    !Number.isFinite(status.currentTime) || status.currentTime < 0 ||
    !Number.isFinite(status.duration) || status.duration <= 0) return null;
  const playheadMs = Math.round(status.currentTime * 1000);
  // Native decoders can report slight MP3 duration-padding differences.
  // Large discrepancies indicate an altered or mismatched playback track.
  if (Math.abs(status.duration * 1000 - bound.alignment.durationMs) > 1500 ||
    playheadMs >= bound.alignment.durationMs) return null;
  return {
    modelSha256: bound.modelSha256,
    audioSha256: clip.audioSha256,
    expectedAudioSha256: clip.audioSha256,
    approvedAlignmentEvidenceId: 'rhubarb_' + clip.audioSha256.slice(0, 32),
    approvedAlignment: true, // verified audio timing ONLY, not founder likeness approval
    playing: true,
    playheadMs,
    durationMs: bound.alignment.durationMs,
    cues: bound.alignment.cues,
  };
}
