import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONNECTIONS } from '@/lib/staarwardd/connections';
import { WORLD_BY_ID } from '@/lib/staarwardd/world-directory';
import { HomeConnection } from '@/components/staarwardd/home-connection';
import { CanvaConnection } from '@/components/staarwardd/canva-connection';
import { ProviderConnections } from '@/components/staarwardd/provider-connections';
import { useAuth } from '@/src/auth';
import { accountStorageKey } from '@/src/account-storage';

export default function Connections() {
  const { world: raw } = useLocalSearchParams<{ world: string }>();
  const world = typeof raw === 'string' ? raw : ''; const entry = CONNECTIONS[world];
  const router = useRouter(); const { user } = useAuth();
  const [note, setNote] = useState(''); const [notice, setNotice] = useState(''); const [loaded, setLoaded] = useState(false);
  const key = user && !user.is_demo && entry ? accountStorageKey('staar.connection-plan.' + world, user.user_id) : null;
  useEffect(() => { let active = true; setLoaded(false); setNote(''); setNotice('');
    if (key) void AsyncStorage.getItem(key).then(value => { if (active) { setNote(value || ''); setLoaded(true); } }).catch(() => { if (active) setNotice('Could not load your setup checklist.'); });
    return () => { active = false; };
  }, [key]);
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#758195', opacity: disabled ? .4 : 1 }}><Text style={{ color: '#F1F4F8', fontSize: 16 }}>{label}</Text></Pressable>;
  async function open(url: string) { try { await Linking.openURL(url); setNotice('Opened the provider. Its account and data are not linked to STAAR Hub.'); } catch { setNotice('Could not open the provider. Try again.'); } }
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18, maxWidth: 850, width: '100%', alignSelf: 'center' }}>
    {button('Back', () => router.back())}
    <Text style={{ color: '#F1F4F8', fontSize: 30 }}>{WORLD_BY_ID[world]?.name || 'Portal'} connections</Text>
    {!entry || !key ? <Text style={{ color: '#C0CAD7' }}>Sign in with your own account and choose a portal to set up connections.</Text> : <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{entry.areas.map(area => <Text key={area} style={{ color: '#D9E1EC', backgroundColor: '#1A2230', padding: 12, borderRadius: 12 }}>{area}</Text>)}</View>
      {world === 'home' && <HomeConnection key={user?.user_id} />}
      {world === 'work' && <ProviderConnections key={user?.user_id} />}
      {(world === 'diggitstaar' || world === 'creativity') && <CanvaConnection key={user?.user_id} />}
      {!!entry.tools.length && <Text style={{ color: '#F1F4F8', fontSize: 22 }}>External websites — not connected</Text>}
      {!!entry.tools.length && <Text style={{ color: '#BBC5D3', lineHeight: 22 }}>These shortcuts only open provider websites. Google and Microsoft calendar connections above use a separate, authorized read-only API when configured.</Text>}
      {entry.tools.map(tool => <View key={tool.name} style={{ gap: 5 }}>{button('Open ' + tool.name, () => { void open(tool.url); })}<Text style={{ color: '#96A4B8' }}>External tool · {new URL(tool.url).hostname}</Text></View>)}
      <Text style={{ color: '#F1F4F8', fontSize: 22 }}>Connections still to establish</Text><Text style={{ color: '#BCC6D4', lineHeight: 23 }}>{entry.pending}</Text>
      <Text style={{ color: '#F1F4F8', fontSize: 22 }}>Your setup checklist</Text>
      <Text style={{ color: '#A5B2C4', lineHeight: 21 }}>List the rooms, tools or equipment you want to add. Saved on this device for your account. Keep passwords, tokens and private records in their provider apps.</Text>
      <TextInput accessibilityLabel="Connection setup checklist" multiline maxLength={2000} value={note} onChangeText={setNote} editable={loaded} style={{ minHeight: 120, color: '#F1F4F8', borderColor: '#66748B', borderWidth: 1, borderRadius: 14, padding: 16, textAlignVertical: 'top' }} />
      {button('Save setup checklist', () => { void AsyncStorage.setItem(key, note).then(() => setNotice('Setup checklist saved on this device.')).catch(() => setNotice('Could not save the checklist.')); }, !loaded)}
      {!!notice && <Text accessibilityRole="alert" style={{ color: '#D9E1EC', lineHeight: 23 }}>{notice}</Text>}
    </>}
  </ScrollView></SafeAreaView>;
}
