import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';

type Event = { id: string; title: string; start: string; venue: string; details_url?: string | null };
const allowedDetails = (value?: string | null) => {
  try {
    if (!value) return null;
    const url = new URL(value);
    return ['https://ticketmaster.ca', 'https://www.ticketmaster.ca', 'https://ticketmaster.com', 'https://www.ticketmaster.com'].includes(url.origin)
      && !url.username && !url.password && !url.search && !url.hash && /^(?:\/[A-Za-z0-9_-]+){0,3}\/event\/[A-Za-z0-9_-]+\/?$/i.test(url.pathname) ? url.href : null;
  } catch { return null; }
};

export default function CommunityDiscovery() {
  const { user, api } = useAuth();
  return user && !user.is_demo ? <TorontoEvents key={user.user_id} api={api} /> : null;
}

function TorontoEvents({ api }: { api: ReturnType<typeof useAuth>['api'] }) {
  const router = useRouter();
  const [last, setLast] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  const refresh = async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    const current = () => pending.current === controller;
    setBusy(true); setLast(null); setEvents([]); setNotice('');
    try {
      const r = await api('/api/community/discovery/toronto', { signal: controller.signal });
      const body = await r.json();
      if (!current()) return;
      if (!r.ok) {
        setNotice(body?.detail === 'ticketmaster_not_configured'
          ? 'This server does not have a Ticketmaster Discovery registration yet.'
          : 'Current listings could not be verified. Try later.');
        return;
      }
      if (body.source !== 'ticketmaster_discovery' || body.city !== 'Toronto' || !Array.isArray(body.events)
        || !Number.isFinite(Date.parse(body.read_at))) throw new Error('Unexpected discovery response');
      const received = body.events.filter((event: Partial<Event> | null): event is Event =>
        typeof event?.id === 'string' && typeof event.title === 'string' && typeof event.start === 'string'
          && Number.isFinite(Date.parse(event.start)) && typeof event.venue === 'string').slice(0, 25);
      setEvents(received);
      setLast(body.read_at);
      if (!received.length) setNotice('Ticketmaster returned no matching Toronto listings for the next 21 days.');
    } catch { if (current()) setNotice('Current listings could not be verified. Try later.'); }
    finally { clearTimeout(timeout); if (current()) { pending.current = null; setBusy(false); } }
  };
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled}
    onPress={onPress} style={{ padding: 12, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#74664C', opacity: disabled ? .5 : 1 }}>
    <Text style={{ color: '#F1DDAF' }}>{label}</Text>
  </Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      {button('Back', () => router.back())}
      <Text accessibilityRole="header" style={{ color: '#F1F4F8', fontSize: 28 }}>Toronto Events</Text>
      <Text style={{ color: '#C5CEDB' }}>Find upcoming Toronto listings from Ticketmaster’s Discovery feed. This is not a complete city calendar and doesn’t book or guarantee tickets.</Text>
      {button(busy ? 'Checking listings…' : 'Check current listings', () => { void refresh(); }, busy)}
      {last ? <Text style={{ color: '#C5CEDB' }}>Checked {new Date(last).toLocaleString('en-CA', { timeZone: 'America/Toronto' })} Toronto time.</Text> : null}
      {notice ? <Text style={{ color: '#C5CEDB' }} accessibilityLiveRegion="polite">{notice}</Text> : null}
      {events.map(event => {
        const target = allowedDetails(event.details_url);
        return <View key={event.id} style={{ padding: 12, gap: 8, borderWidth: 1, borderColor: '#74664C', borderRadius: 12 }}>
          <Text accessibilityRole="header" style={{ color: '#F1F4F8', fontSize: 19 }}>{event.title}</Text>
          <Text style={{ color: '#C5CEDB' }}>{new Date(event.start).toLocaleString('en-CA', { timeZone: 'America/Toronto' })}{event.venue ? ' · ' + event.venue : ''}</Text>
          {target && button('Open event details on Ticketmaster', () => { void Linking.openURL(target).catch(() => setNotice('Could not open the provider listing.')); })}
        </View>;
      })}
    </ScrollView>
  </SafeAreaView>;
}
