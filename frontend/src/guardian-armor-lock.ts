/** STAARWAARDD — founder-approved Guardian ARMOUR reference.
 * Approval applies ONLY to the pictured 2D visual design, not to a new 3D mesh.
 * Source: Library /STAARWAARDD/Guardian/Locked References/
 * STAARWAARDD_Guardian_Armored_Locked_Reference.png
 */
import { GUARDIAN_VISEMES, type GuardianFacialRig } from './guardian-visemes';

export const LOCKED_ARMORED_GUARDIAN = Object.freeze({
  version: '2026-11-15-armored-v1',
  libraryPath: '/STAARWAARDD/Guardian/Locked References/STAARWAARDD_Guardian_Armored_Locked_Reference.png',
  sourceImageSha256: 'd7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c',
  sourceWidth: 1199,
  sourceHeight: 1312,
  approval: '2d-character-appearance-only',
  visualRequirements: [
    'Maintain face and hairstyle from the locked image without substitution',
    'Short closely cropped hair with visible curved shaved detailing',
    'Visible stud earrings and subtle nose stud',
    'Layered silver and gunmetal hard-surface armour, not a tracksuit',
    'Oversized articulated silver shoulder plates and high armoured collar',
    'Fine illuminated gold seams across chest, shoulders and collar',
    'Large circular gold maple-leaf emblem centered on breastplate',
    'Toronto dusk skyline and CN Tower are scene context, not part of the mesh',
  ],
} as const);

export type GuardianArmoredRigEvidence = {
  sourceImageSha256: string;
  identityAssetId: string;
  rigModelSha256: string;
  founderApprovedRig: boolean;
  faceFidelityReviewed: boolean;
  armorFidelityReviewed: boolean;
  frontThreeQuarterProfileReviewed: boolean;
  blendshapeTargets: readonly string[];
  speechSyncDeviceVerified: boolean;
};

/** Only a verified, founder-reviewed rig can replace the static Guardian art.
 * A color-matched generic 3D person or a 2D reference image can NEVER pass.
 */
export function canActivateArmoredGuardian3D(
  evidence: GuardianArmoredRigEvidence | null | undefined,
): boolean {
  if (!evidence) return false;
  return evidence.sourceImageSha256 === LOCKED_ARMORED_GUARDIAN.sourceImageSha256
    && /^[a-f0-9]{64}$/.test(evidence.rigModelSha256)
    && evidence.identityAssetId.trim().length > 0
    && evidence.founderApprovedRig === true
    && evidence.faceFidelityReviewed === true
    && evidence.armorFidelityReviewed === true
    && evidence.frontThreeQuarterProfileReviewed === true
    && evidence.speechSyncDeviceVerified === true
    && GUARDIAN_VISEMES.every(v => evidence.blendshapeTargets.includes(v));
}
export function armoredGuardianFacialRig(
  evidence: GuardianArmoredRigEvidence | null | undefined,
): GuardianFacialRig | null {
  if (!canActivateArmoredGuardian3D(evidence)) return null;
  return {
    identityAssetId: evidence!.identityAssetId,
    approvedIdentitySha256: LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
    morphTargetNames: GUARDIAN_VISEMES,
    approved: true,
  };
}
