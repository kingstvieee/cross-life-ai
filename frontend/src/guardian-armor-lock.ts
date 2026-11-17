/** STAARWAARDD — founder-approved Guardian ARMOUR reference.
 * Approval applies ONLY to the pictured 2D visual design, not to a new 3D mesh.
 * Source: Library /STAARWAARDD/Guardian/Locked References/
 * STAARWAARDD_Guardian_Armored_Locked_Reference.png
 */
import { GUARDIAN_VISEMES, type GuardianFacialRig } from './guardian-visemes.ts';

/** Owner's exact material decision for the Guardian armour; not a release approval. */
export const LOCKED_GUARDIAN_ARMOR_FINISH = Object.freeze({
  id: 'chrome-and-gold',
  sourceBuild: 229,
  approvedFaceBuild228Sha256: '4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b',
  selectionScope: 'armor-material-finish-only',
  bodyRigReleaseApproved: false,
} as const);

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
    'Chrome and gold armour is the locked finish; black titanium is not approved as the production default',
    'Toronto dusk skyline and CN Tower are scene context, not part of the mesh',
  ],
} as const);

// A 2D cinematic approval does not override the Build 202 rejected 3D-model verdict.
export const REJECTED_BUILD202_GUARDIAN_MODEL_SHA256 = '847c2f412b0184a372cd8a6a9149b78fcfe33a7e3127297196a80611f5e0f50d' as const;

export const PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256 = '09dcb3cb56b70f5a2b38e5d5f68de627a62df5ad42ad89e2f9d9123d92cf70b5' as const;
export const PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256 = '325bc975ccae49db54e5c5ac761a229d7b66930663cb68f5ff5844a507771a36' as const;
export const PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256 = '3332367a0085c1c7a873704564aa7decbde906a17a95960eb7eb39805d59228a' as const;
// Review-only Build 227 profile/neck repair has no final likeness or physical-device proof.
export const PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256 = '8168758c8d8b3c448069315b451147f7d655227f8e1963adfc7fac915e595ab3' as const;
// Founder has visually accepted the exact Build 228 binary; physical-device/neck/armour/release evidence has NOT been accepted.
export const PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256 = '4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b' as const;
// Private Build 229 static-body and 230 approximate-body-rig candidates have no owner/full device acceptance.
export const PRIVATE_BUILD229_STATIC_BODY_REVIEW_SHA256 = '84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4' as const;
export const PRIVATE_BUILD230_EXPERIMENTAL_BODY_RIG_SHA256 = '656a12b79a334e6d0a4301b666df5098f0ab6ae1387a5195904b978fc5415130' as const;
// Build 231 has improved rigid plate binding, but no production animation or physical iPhone proof.
export const PRIVATE_BUILD231_REFINED_RIG_QA_SHA256 = 'cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c' as const;

export const REJECTED_LEGACY_GUARDIAN_MODEL_SHA256 = Object.freeze([
  'da1848abf56884827abe3315a7ed2108a4301eb62be9bfd5b6d0e058354e8395',
  'e6e81a37cbc142c4d82fe8aff53adce3fb39b18f364aac18b599dccb4a80b8a1',
]) as readonly string[];

export type GuardianArmoredRigEvidence = {
  sourceImageSha256: string;
  identityAssetId: string;
  rigModelSha256: string;
  armorFinish: string;
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
    && evidence.rigModelSha256 !== REJECTED_BUILD202_GUARDIAN_MODEL_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD229_STATIC_BODY_REVIEW_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD230_EXPERIMENTAL_BODY_RIG_SHA256
    && evidence.rigModelSha256 !== PRIVATE_BUILD231_REFINED_RIG_QA_SHA256
    && !REJECTED_LEGACY_GUARDIAN_MODEL_SHA256.includes(evidence.rigModelSha256)
    && evidence.armorFinish === LOCKED_GUARDIAN_ARMOR_FINISH.id
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
