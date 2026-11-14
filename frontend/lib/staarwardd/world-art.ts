import type { WorldId } from './world-directory';

export type SceneCrop = readonly [number, number, number, number];
export const HUB_MASTER = require('@/assets/images/staarwardd/locked/homepage.png');
// Frame only the central starfield, Toronto and platform on compact screens.
// The immutable source master is never changed.
export const HUB_CROP: SceneCrop = [.375, .20, .25, .66];
export const WORLD_ART: Record<WorldId, { source: number; crop: SceneCrop }> = {
  home: { source: require('@/assets/images/staarwardd/locked/home.png'), crop: [.012, .515, .735, .405] },
  work: { source: require('@/assets/images/staarwardd/locked/work.png'), crop: [0, 0, 1, 1] },
  creativity: { source: require('@/assets/images/staarwardd/locked/creativity.png'), crop: [0, 0, 1, 1] },
  wellbeing: { source: require('@/assets/images/staarwardd/locked/wellbeing.png'), crop: [0, 0, 1, 1] },
  relationships: { source: require('@/assets/images/staarwardd/locked/love.png'), crop: [0, 0, 1, 1] },
  events: { source: require('@/assets/images/staarwardd/locked/events.png'), crop: [0, 0, 1, 1] },
  style: { source: require('@/assets/images/staarwardd/locked/style.png'), crop: [0, 0, 1, 1] },
  staarverse: { source: require('@/assets/images/staarwardd/locked/staarverse.png'), crop: [0, 0, 1, 1] },
  staarsonic: { source: require('@/assets/images/staarwardd/locked/staarsonic.png'), crop: [0, 0, 1, 1] },
};
