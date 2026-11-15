const worlds = new Set(['hub', 'home', 'work', 'creativity', 'wellbeing', 'relationships', 'events', 'style', 'staarverse', 'staarsonic']);
/** Renderer events request local navigation only, never device or provider actions. */
export function sceneAction(value: unknown, world: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (event.source !== 'staar-scene-v1' || event.type !== 'select' || event.world !== world || typeof event.action !== 'string') return null;
  const action = event.action;
  if (world === 'hub') return action.startsWith('world:') && worlds.has(action.slice(6)) && action !== 'world:hub' ? action : null;
  if (!worlds.has(world)) return null;
  if (action === 'connections' || /^conversation:[012]$/.test(action)) return action;
  return world === 'home' && action === 'checkins' ? action : null;
}
