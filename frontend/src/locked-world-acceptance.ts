/** Build 146. Locked 2026-11-14 founder world identities.
 * Evidence must be from reviewed 3D assets and real runtime captures; these
 * requirements cannot be satisfied by labeling generated geometry "approved".
 */
export const LOCKED_WORLD_REQUIREMENTS = {
  home: { name: 'STAAR Hub', anchors: ['cinematic residence','rooms','smart controls','security','Guardian presence'], variants: ['residence'] },
  work: { name: 'STAAR Work', anchors: ['bright Toronto command centre','central Earth console','no executive chair','employment','businesses'], variants: ['command'] },
  creativity: { name: 'STAAR Dreams', anchors: ['floating dream universe','day and night','waterfalls','trees','floating Guardian head'], variants: ['dream'] },
  wellbeing: { name: 'STAAR Health', anchors: ['Yonge–Dundas','Eaton Centre','medical streets','appointments','first aid'], variants: ['health'] },
  relationships: { name: 'STAAR Love', anchors: ['ruby/champagne Relationship Realm','fireplace','Cupid bear','obsidian Singles Lounge','circular fire'], variants: ['realm','singles'] },
  events: { name: 'STAAR Village', anchors: ['Scotiabank Arena','CN Tower','GTA map','Brampton','Mississauga'], variants: ['village'] },
  style: { name: 'STAAR Closet', anchors: ['character-free interior','white fur','crystal','chrome','RSF boutique'], variants: ['closet'] },
  staarverse: { name: 'STARVERSE', anchors: ['central star gateway','floating islands','Milo','holographic bridges','games library'], variants: ['universe'] },
  staarsonic: { name: 'STAARSONIC', anchors: ['luxury studio','Toronto skyline','waterfalls','oversized headphones rotate once in 30 seconds','music production'], variants: ['studio'] },
} as const;
export type LockedWorldId = keyof typeof LOCKED_WORLD_REQUIREMENTS;
export type WorldAcceptance = {
  id: LockedWorldId;
  approvedAssetId: string;
  signedDesignEvidence: string;
  actualDeviceCapture: string;
  visualReviewerApproved: boolean;
  navigationVerified: boolean;
  animationsVerified: boolean;
};
export function isLockedWorldApproved(acceptance: WorldAcceptance): boolean {
  return Boolean(LOCKED_WORLD_REQUIREMENTS[acceptance.id]
    && acceptance.approvedAssetId.trim()
    && acceptance.signedDesignEvidence.trim()
    && acceptance.actualDeviceCapture.trim()
    && acceptance.visualReviewerApproved
    && acceptance.navigationVerified
    && acceptance.animationsVerified);
}
export function allNineWorldsApproved(records: readonly WorldAcceptance[]): boolean {
  const keys = Object.keys(LOCKED_WORLD_REQUIREMENTS);
  return records.length === keys.length
    && new Set(records.map(r=>r.id)).size === keys.length
    && records.every(isLockedWorldApproved)
    && keys.every(id=>records.some(r=>r.id===id));
}
