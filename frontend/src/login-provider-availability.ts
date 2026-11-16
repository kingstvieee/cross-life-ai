/** Build 148 — only trusted configured identity brokers are offered in the app.
 * A configured sign-in option still needs its own successful session exchange.
 */
export const LOGIN_PROVIDER_IDS=['apple','google','microsoft','yahoo','email'] as const;
export type LoginProviderId=typeof LOGIN_PROVIDER_IDS[number];
export function enabledLoginProviders(payload: unknown, native: boolean): LoginProviderId[] {
  if (!payload || typeof payload !== 'object') return [];
  const data=payload as {providers?:unknown;nativeEnabled?:unknown};
  if (native && data.nativeEnabled !== true) return [];
  if (!Array.isArray(data.providers)) return [];
  const enabled=new Set<string>();
  for(const p of data.providers) {
    if(!p || typeof p !== 'object') continue;
    const item=p as {id?:unknown;enabled?:unknown};
    if(typeof item.id==='string' && item.enabled===true && LOGIN_PROVIDER_IDS.includes(item.id as LoginProviderId)) enabled.add(item.id);
  }
  return LOGIN_PROVIDER_IDS.filter(id=>enabled.has(id));
}
