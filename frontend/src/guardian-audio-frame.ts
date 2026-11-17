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
