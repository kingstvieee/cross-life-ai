import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/src/auth';
type Provider = { id: string; configured: boolean; connected: boolean };
type Event = { id: string; title: string; start: string; end: string };
export function ProviderConnections() {
  const { user, api } = useAuth(); const generation = useRef(0); const controller = useRef<AbortController | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]); const [flow, setFlow] = useState<{ provider: string; id: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]); const [eventsProvider, setEventsProvider] = useState<string | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { generation.current++; setProviders([]); setEvents([]); setEventsProvider(null); setFlow(null); setMessage(''); setBusy(false); void load();
    const sub = AppState.addEventListener('change', s => { if (s !== 'active') { controller.current?.abort(); generation.current++; setEvents([]); setEventsProvider(null); setBusy(false); } });
    return () => { generation.current++; controller.current?.abort(); sub.remove(); };
  }, [user?.user_id]);
  async function request(path: string, method = 'GET') {
    const epoch = generation.current; controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 30000);
    try { const r = await api('/api/connections' + path, { method, signal: abort.signal });
      if (epoch !== generation.current) throw new Error('Connection request cancelled.');
      if (!r.ok) { const body = await r.json().catch(() => ({})); throw new Error(body.detail === 'provider_app_not_configured' || body.detail === 'provider_vault_not_configured' ? 'This provider needs its app registration on the server before connecting.' : body.detail === 'consent_not_finished_or_expired' ? 'Complete provider consent first, or start a new connection.' : 'The provider connection could not complete. Try reconnecting.'); }
      const data = await r.json(); if (epoch !== generation.current) throw new Error('Connection request cancelled.'); return data;
    } finally { clearTimeout(timeout); }
  }
  async function load() { try { const data = await request(''); if (Array.isArray(data)) setProviders(data); } catch { setMessage('Calendar connections are not available from this server yet.'); } }
  async function act(fn: () => Promise<void>) { if (busy) return; const epoch = generation.current; setBusy(true); setMessage(''); try { await fn(); } catch (e) { if (epoch === generation.current) setMessage(e instanceof Error ? e.message : 'Connection failed.'); } finally { if (epoch === generation.current) setBusy(false); } }
  const button = (label: string, fn: () => Promise<void>, disabled = false) => <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={() => { void act(fn); }} style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#74849B', opacity: busy || disabled ? .4 : 1 }}><Text style={{ color: '#EDF2FA' }}>{label}</Text></Pressable>;
  return <View style={{ gap: 16 }}><Text style={{ color: '#EDF2FA', fontSize: 22 }}>Calendar connections</Text>
    <Text style={{ color: '#B8C5D5', lineHeight: 23 }}>Connect Google or Microsoft with their consent screen. Read the next seven days on demand. STAAR Hub cannot edit events, email people or access your files through this connection.</Text>
    {providers.map(p => <View key={p.id} style={{ gap: 12, padding: 16, borderColor: '#455368', borderWidth: 1, borderRadius: 16 }}><Text style={{ color: '#EDF2FA', fontSize: 18 }}>{p.id === 'google' ? 'Google Calendar' : 'Microsoft Calendar'}</Text><Text style={{ color: '#B8C5D5' }}>{p.connected ? 'Account connected · refresh to read current events' : p.configured ? 'Ready for your consent' : 'Provider app registration required'}</Text>
      {!p.connected && button('Connect ' + p.id, async () => { const result = await request('/' + p.id + '/start', 'POST');
        const url = new URL(result.url); const expected = p.id === 'google' ? 'accounts.google.com' : 'login.microsoftonline.com';
        if (url.protocol !== 'https:' || url.hostname !== expected || typeof result.flow !== 'string') throw new Error('Invalid provider authorization destination.');
        setFlow({ provider: p.id, id: result.flow }); await WebBrowser.openBrowserAsync(result.url); }, !p.configured)}
      {flow?.provider === p.id && button('Verify and finish calendar connection', async () => { const verified = await request('/' + p.id + '/finish/' + encodeURIComponent(flow.id), 'POST'); if (verified.readback_verified !== true || verified.connected !== true) throw new Error('Live calendar access could not be verified. Connection was not completed.'); setFlow(null); await load(); setMessage('Verified read-only calendar connection. Choose Refresh to read events.'); })}
      {p.connected && button('Refresh next seven days', async () => { setEvents([]); setEventsProvider(null); const data = await request('/' + p.id + '/calendar'); setEvents(Array.isArray(data.events) ? data.events : []); setEventsProvider(p.id); setMessage('Read from ' + p.id + ' at ' + new Date(data.read_at).toLocaleTimeString()); })}
      {p.connected && button('Disconnect ' + p.id, async () => { await request('/' + p.id, 'DELETE'); setEvents([]); setEventsProvider(null); setFlow(null); await load(); setMessage('Saved connection removed. You may also revoke access in your provider account.'); })}
    </View>)}
    {button('Refresh connection status', load)}
    {!!message && <Text accessibilityRole="alert" style={{ color: '#D7E1EF', lineHeight: 22 }}>{message}</Text>}
    {!!eventsProvider && <Text style={{ color: '#D7E1EF', fontWeight: '700' }}>Showing read-only events from {eventsProvider === 'google' ? 'Google Calendar' : 'Microsoft Calendar'}. No changes have been made.</Text>}
    {events.map((event, i) => <View key={event.id || i} style={{ padding: 12, gap: 8 }}><Text style={{ color: '#EDF2FA', fontSize: 16 }}>{event.title}</Text><Text style={{ color: '#A8B7CA' }}>{event.start} — {event.end}</Text></View>)}
  </View>;
}
