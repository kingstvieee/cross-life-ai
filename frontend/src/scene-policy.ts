export const SCENE_IDS = ['hub', 'home', 'work', 'creativity', 'wellbeing', 'relationships', 'singles', 'events', 'style', 'staarverse', 'staarsonic'];
export function sceneAction(world: string, action: unknown) {
  if (typeof action !== 'string' || action.length > 80) return null;
  const [prefix, area, extra] = action.split('.'); if (extra || !area) return null;
  if (world === 'hub' && prefix === 'world' && SCENE_IDS.includes(area) && !['hub', 'singles'].includes(area)) return { world: area };
  const allowed: Record<string, string[]> = {
    home: ['rooms', 'lighting', 'climate', 'safety', 'kitchen', 'routines'], work: ['employment', 'businesses', 'career', 'teams'],
    creativity: ['create', 'film', 'design', 'write', 'build', 'learn'], wellbeing: ['wellbeing', 'movement', 'clinics', 'appointments'],
    relationships: ['connect', 'conversations', 'boundaries', 'together'], events: ['events', 'transit', 'community', 'volunteer'],
    style: ['rsf', 'wardrobe', 'outfits', 'fit'], staarverse: ['milo', 'adventure', 'cooperative', 'library'], staarsonic: ['create', 'record', 'mix', 'release'],
  };
  const effective = world === 'singles' ? 'relationships' : world;
  return prefix === effective && allowed[effective]?.includes(area) ? { world: effective, area } : null;
}
