import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/src/auth';

type Status = { configured: boolean; connected: boolean; reconnect_required?: boolean };
type Design = { id: string; title: string };
type Result = { url?: unknown; flow?: unknown; connected?: boolean; readback_verified?: boolean; designs?: unknown; provider?: unknown };

export function CanvaConnection() {
  const { user, api } = useAuth();
  if (!user || user.is_demo) return null;
  return <CanvaForAccount key={user.user_id} api={api} />;
}

function CanvaForAccount({ api }: { api: ReturnType<typeof useAuth>['api'] }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [designs, setDesigns] = useState<Design[] | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const active = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const call = useCallback(async (path: string, controller: AbortController, method = 'GET') => {
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await api('/api/connections' + path, { method, signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail === 'consent_not_finished_or_expired' ? 'Complete Canva consent first or start again.'
          : data?.detail === 'provider_reconnect_required' ? 'Canva access needs to be reconnected.'
          : data?.detail === 'provider_app_not_configured' || data?.detail === 'provider_vault_not_configured' ? 'Canva integration is not configured on this server.'
          : 'Canva could not complete the request.');
      }
      return data;
    } finally { clearTimeout(timeout); }
  }, [api]);

  const load = useCallback(async (controller: AbortController, current: () => boolean) => {
    const data = await call('', controller);
    if (!current()) return;
    if (!Array.isArray(data)) throw new Error('Connection status could not be verified.');
    const row = data.find(item => item?.id === 'canva' && item.capability === 'design_metadata_read_only');
    if (!row) throw new Error('This server does not have the Canva integration.');
    setStatus({ configured: row.configured === true, connected: row.connected === true, reconnect_required: row.reconnect_required === true });
  }, [call]);

  const run = useCallback(async (fn: (c: AbortController, current: () => boolean) => Promise<void>) => {
    if (!active.current || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const generation = epoch.current;
    const current = () => active.current && generation === epoch.current;
    setBusy(true); setNotice('');
    try { await fn(controller, current); }
    catch (error) { if (current()) setNotice(error instanceof Error ? error.message : 'Canva connection could not be verified.'); }
    finally { if (operation.current === controller) operation.current = null; if (current()) setBusy(false); }
  }, []);
  useEffect(() => {
    const invalidate = () => { active.current = false; epoch.current++; operation.current?.abort(); operation.current = null; };
    const change = (state: string | null) => {
      if (state === 'active' || state === null) { active.current = true; void run(load); }
      else { invalidate(); setStatus(null); setDesigns(null); setBusy(false); }
    };
    change(AppState.currentState);
    const listener = AppState.addEventListener('change', change);
    return () => { invalidate(); listener.remove(); };
  }, [load, run]);

  const button = (label: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action} disabled={busy}
    style={{ padding: 12, borderWidth: 1, borderColor: '#74664C', borderRadius: 10, opacity: busy ? .5 : 1 }}>
    <Text style={{ color: '#F1DDAF' }}>{label}</Text>
  </Pressable>;
  return <View style={{ gap: 12, padding: 14, borderWidth: 1, borderColor: '#74664C', borderRadius: 14 }}>
    <Text accessibilityRole="header" style={{ color: '#F1F4F8', fontSize: 20 }}>Canva design library</Text>
    <Text style={{ color: '#C5CEDB' }}>Connect your Canva account to list recent design names. No uploads, edits, publishing, or Canva charges are initiated here.</Text>
    {status && <Text style={{ color: '#C5CEDB' }}>{status.reconnect_required ? 'Reconnect required.' : status.connected ? 'Canva read access was verified on connection.' : status.configured ? 'Ready for your consent.' : 'The app needs its Canva registration on the server.'}</Text>}
    {status?.configured && !status.connected && button(flow ? 'Start Canva consent again' : 'Connect Canva', () => { void run(async (controller, current) => {
      const result: Result = await call('/canva/start', controller, 'POST');
      if (!current()) return;
      if (typeof result?.url !== 'string' || typeof result.flow !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(result.flow)) throw new Error('Invalid Canva authorization response.');
      const location = new URL(result.url);
      if (location.origin !== 'https://www.canva.com' || location.pathname !== '/api/oauth/authorize' || location.username || location.password || location.hash)
        throw new Error('Invalid Canva authorization destination.');
      setFlow(result.flow);
      await WebBrowser.openBrowserAsync(location.href);
    }); })}
    {status?.configured && flow && !status.connected && button('Finish Canva connection', () => { void run(async (controller, current) => {
      const result: Result = await call('/canva/finish/' + encodeURIComponent(flow), controller, 'POST');
      if (!current()) return;
      if (result?.connected !== true || result.readback_verified !== true) throw new Error('Live Canva access was not verified.');
      setFlow(null);
      await load(controller, current);
      if (current()) setNotice('Canva read access verified. Choose Read latest designs to load names.');
    }); })}
    {status?.connected && button('Read latest Canva designs', () => { void run(async (controller, current) => {
      setDesigns(null);
      let result: Result;
      try { result = await call('/canva/designs', controller); }
      catch (error) { if (current()) await load(controller, current).catch(() => { if (current()) setStatus(null); }); throw error; }
      if (!current()) return;
      if (result?.provider !== 'canva' || !Array.isArray(result.designs)) throw new Error('Canva did not return a verified design list.');
      const designs = result.designs.filter((item): item is Design => typeof item?.id === 'string' && typeof item?.title === 'string').slice(0, 25);
      setDesigns(designs);
    }); })}
    {status?.connected && button('Disconnect Canva from STAAR Hub', () => { void run(async (controller, current) => {
      setDesigns(null);
      await call('/canva', controller, 'DELETE');
      if (current()) { setStatus(null); setFlow(null); await load(controller, current); }
    }); })}
    {button('Refresh Canva connection status', () => { void run(load); })}
    {designs?.length === 0 && <Text style={{ color: '#C5CEDB' }}>Canva returned no designs.</Text>}
    {designs?.map(item => <Text key={item.id} style={{ color: '#F1F4F8' }}>{item.title}</Text>)}
    {notice ? <Text accessibilityLiveRegion="polite" style={{ color: '#C5CEDB' }}>{notice}</Text> : null}
  </View>;
}
