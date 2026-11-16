/** Build 145 — approved-rig-only facial animation timeline.
 * Audio playback state alone does not create phoneme-accurate visemes.
 * Do not render these cues against the approved static Guardian face.
 * A separately approved, identity-matched blendshape rig must consume them.
 */
export const GUARDIAN_VISEMES = ['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'] as const;
export type GuardianViseme = typeof GUARDIAN_VISEMES[number];
export type GuardianVisemeCue = { atMs: number; viseme: GuardianViseme; weight: number };
export type GuardianFacialRig = {
  identityAssetId: string;
  approvedIdentitySha256: string;
  morphTargetNames: readonly GuardianViseme[];
  approved: boolean;
};

export function validateGuardianVisemeTimeline(input: unknown, durationMs: number): GuardianVisemeCue[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 240000) throw new Error('invalid_audio_duration');
  if (!Array.isArray(input) || input.length > 12000) throw new Error('invalid_viseme_timeline');
  let previous = -1;
  return input.map((cue: unknown) => {
    if (!cue || typeof cue !== 'object') throw new Error('invalid_viseme_cue');
    const { atMs, viseme, weight } = cue as Record<string, unknown>;
    if (!Number.isFinite(atMs) || (atMs as number) < 0 || (atMs as number) > durationMs || (atMs as number) <= previous) throw new Error('invalid_viseme_time');
    if (typeof viseme !== 'string' || !GUARDIAN_VISEMES.includes(viseme as GuardianViseme)) throw new Error('unknown_viseme');
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error('invalid_viseme_weight');
    previous = atMs as number;
    return { atMs: atMs as number, viseme: viseme as GuardianViseme, weight };
  });
}
export function mayAnimateApprovedGuardianFace(rig: GuardianFacialRig | null | undefined, expectedIdentitySha256: string): boolean {
  return Boolean(
    rig?.approved && rig.approvedIdentitySha256 === expectedIdentitySha256 &&
    /^[a-f0-9]{64}$/.test(expectedIdentitySha256) &&
    rig.identityAssetId.length > 0 &&
    GUARDIAN_VISEMES.every(v => rig.morphTargetNames.includes(v))
  );
}
export function guardianVisemeAt(cues: readonly GuardianVisemeCue[], playheadMs: number): GuardianVisemeCue {
  const neutral: GuardianVisemeCue = { atMs: 0, viseme: 'rest', weight: 0 };
  if (!Number.isFinite(playheadMs) || playheadMs < 0) return neutral;
  let low = 0, high = cues.length - 1, found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (cues[mid].atMs <= playheadMs) { found = mid; low = mid + 1; }
    else high = mid - 1;
  }
  return found < 0 ? neutral : cues[found];
}
