export const worldIds = ['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic','diggitstaar'];
export const worldNames = ['STAAR Hub','STAAR Work','STAAR Dreams','STAAR Health','STAAR Love','STAAR Village','STAAR Closet','STARVERSE','STAARSONIC','DIGGITSTAAR'];

// These controls remain usable when the device has no WebGL capability.
export function fallbackActions(world) {
  if (world === 'hub') return worldIds.map((id, i) => [worldNames[i], 'world:' + id]);
  if (!worldIds.includes(world)) return [];
  const actions = [['Open conversation', 'conversation:0'], ['Device & tool setup', 'connections']];
  if (world === 'home') actions.push(['Daily check-in', 'checkins']);
  return actions;
}
