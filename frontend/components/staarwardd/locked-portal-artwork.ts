import diggitstaarStudio from './diggitstaar-studio-source';

export const lockedPortalArtwork = {
  home: require('@/assets/images/staarwardd/locked/home.png'),
  work: require('@/assets/images/staarwardd/locked/work.png'),
  creativity: require('@/assets/images/staarwardd/locked/creativity.png'),
  wellbeing: require('@/assets/images/staarwardd/locked/wellbeing.png'),
  relationships: require('@/assets/images/staarwardd/locked/love.png'),
  events: require('@/assets/images/staarwardd/locked/events.png'),
  style: require('@/assets/images/staarwardd/locked/style.png'),
  staarverse: require('@/assets/images/staarwardd/locked/staarverse.png'),
  staarsonic: require('@/assets/images/staarwardd/locked/staarsonic.png'),
  diggitstaar: require('@/scene-src/portal-art/diggitstaar.png'),
} as const;

const singlesArtwork = require('@/assets/images/staarwardd/locked/love-singles.png');

export function artworkForSignedInPortal(id: keyof typeof lockedPortalArtwork, variant: 'realm' | 'singles', allowStudio = true) {
  if (id === 'relationships' && variant === 'singles') return singlesArtwork;
  if (id === 'diggitstaar' && allowStudio && diggitstaarStudio !== null) return diggitstaarStudio;
  return lockedPortalArtwork[id];
}

export const hasDiggitstaarStudio = diggitstaarStudio !== null;
