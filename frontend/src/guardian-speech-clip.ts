/** Bound metadata for the exact MP3 returned by the authenticated speech backend.
 * A valid clip descriptor does NOT confer approval for facial identity or use
 * third-party image generation. Alignment requires a separate authenticated call.
 */
export type GuardianSpeechClip = { key: string; url: string; audioSha256: string };
export function parseGuardianSpeechClip(value: unknown): GuardianSpeechClip {
  if (!value || typeof value !== 'object') throw new Error('invalid_speech_clip');
  const item = value as Record<string, unknown>;
  if (typeof item.url !== 'string' || !/^\/api\/tts\/([A-Za-z0-9_.-]{1,128})\.mp3$/.test(item.url)) {
    throw new Error('invalid_speech_clip_url');
  }
  if (typeof item.audioSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.audioSha256)) {
    throw new Error('missing_audio_identity');
  }
  const key = item.url.slice('/api/tts/'.length, -'.mp3'.length);
  return { key, url: item.url, audioSha256: item.audioSha256 };
}
