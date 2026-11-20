const worlds = new Set(['hub', 'home', 'work', 'creativity', 'wellbeing', 'relationships', 'events', 'style', 'staarverse', 'staarsonic', 'diggitstaar']);
/** Renderer events request local navigation only, never device or provider actions. */
export function sceneAction(value: unknown, world: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (event.source !== 'staar-scene-v1' || event.type !== 'select' || event.world !== world || typeof event.action !== 'string') return null;
  const action = event.action;
  if (world === 'hub') return action.startsWith('world:') && worlds.has(action.slice(6)) && action !== 'world:hub' ? action : null;
  if (!worlds.has(world)) return null;
  if (world === 'diggitstaar' && (action === 'diggitstaar:studio' || action === 'diggitstaar:website')) return action;
  if (action === 'connections' || /^conversation:[012]$/.test(action)) return action;
  return world === 'home' && action === 'checkins' ? action : null;
}

/** Host-side fallback when the sandboxed 3D WebView cannot load. No provider/device execution. */
export function sceneFallbackActions(world: string): Array<[string, string]> {
  const ids = ['home', 'work', 'creativity', 'wellbeing', 'relationships', 'events', 'style', 'staarverse', 'staarsonic', 'diggitstaar'];
  const names = ['STAAR Hub', 'STAAR Work', 'STAAR Dreams', 'STAAR Health', 'STAAR Love', 'STAAR Village', 'STAAR Closet', 'STARVERSE', 'STAARSONIC', 'DIGGITSTAAR'];
  if (world === 'hub') return ids.map((id, index) => [names[index], 'world:' + id]);
  if (!ids.includes(world)) return [];
  if (world === 'diggitstaar') return [['Open production workstation', 'diggitstaar:studio'], ['Visit DIGGITSTAAR.com', 'diggitstaar:website']];
  return world === 'home'
    ? [['Open conversation', 'conversation:0'], ['Device & tool setup', 'connections'], ['Daily check-in', 'checkins']]
    : [['Open conversation', 'conversation:0'], ['Device & tool setup', 'connections']];
}
