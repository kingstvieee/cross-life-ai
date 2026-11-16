/** Production acceptance must be evidence-based, not inferred from green CI or preview geometry. */
export type ReleaseEvidence = {
  startupFilmHashPassed: boolean;
  elevenVisualMasterHashesPassed: boolean;
  nineLocked3DWorldsAccepted: boolean;
  guardianApprovedRigAndLipSync: boolean;
  realProviderAuthReadbackPassed: boolean;
  actualIphoneAndWatchAccepted: boolean;
  nativeSignedIpaVerified: boolean;
  founderTestFlightAccepted: boolean;
};
export const RELEASE_REQUIREMENTS: ReadonlyArray<keyof ReleaseEvidence> = [
  'startupFilmHashPassed', 'elevenVisualMasterHashesPassed',
  'nineLocked3DWorldsAccepted', 'guardianApprovedRigAndLipSync',
  'realProviderAuthReadbackPassed', 'actualIphoneAndWatchAccepted',
  'nativeSignedIpaVerified', 'founderTestFlightAccepted'
] as const;
export function evaluateProductionReadiness(evidence: Partial<ReleaseEvidence> | null | undefined) {
  const blockers = RELEASE_REQUIREMENTS.filter(k => evidence?.[k] !== true);
  return { ready: blockers.length === 0, blockers };
}
