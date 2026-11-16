import { parseGuardianAudioAlignment } from './guardian-visemes';
import type { GuardianSpeechClip } from './guardian-speech-clip';

/** An opt-in, account-authorized local alignment request.
 * Call only once the approved Guardian rig is ready; this does not run speech TTS.
 * The backend enforces ownership, cache expiry and an exact audio digest.
 */
export async function fetchGuardianAlignmentForClip(
  clip: GuardianSpeechClip,
  authorizedApi: (path: string, options: RequestInit) => Promise<Response>,
  options: { signal?: AbortSignal; approvedRigReady: boolean },
) {
  if (!options.approvedRigReady) return null;
  const response = await authorizedApi('/api/guardian/speech-alignment/' + encodeURIComponent(clip.key), {
    method: 'POST', signal: options.signal,
  });
  if (!response.ok) throw new Error('guardian_alignment_unavailable');
  const data: unknown = await response.json();
  if (options.signal?.aborted) throw new Error('guardian_alignment_cancelled');
  return parseGuardianAudioAlignment(data, clip.audioSha256);
}
