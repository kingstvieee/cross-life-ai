import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';

const PREFIX = 'diggitstaar:studio-command:v1';
type Task = { id: string; title: string; client: string; status: 'Inbox' | 'In production' | 'Awaiting approval' | 'Delivered' };
const STATES: Task['status'][] = ['Inbox', 'In production', 'Awaiting approval', 'Delivered'];
export default function Diggitstaar() {
  const router = useRouter();
  const { user } = useAuth();
  const authorized = !!user?.user_id && !user.is_demo;
  const key = `${PREFIX}:${encodeURIComponent(authorized ? user!.user_id : 'guest')}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true; setLoaded(false); setTasks([]); setNotice('');
    if (!authorized) { setLoaded(true); return () => { active = false; }; }
    void AsyncStorage.getItem(key).then(raw => {
      if (!active) return;
      if (raw) { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed)) setTasks(parsed.filter(x => x && typeof x.id === 'string' && typeof x.title === 'string' && STATES.includes(x.status))); }
      setLoaded(true);
    }).catch(() => { if (active) { setLoaded(true); setNotice('Local workload could not be loaded.'); } });
    return () => { active = false; };
  }, [key, authorized]);
  const save = (next: Task[]) => {
    if (!authorized) return;
    void AsyncStorage.setItem(key, JSON.stringify(next)).then(() => setTasks(next)).catch(() => Alert.alert('Not saved', 'Could not save workload on this device.'));
  };
  const add = () => {
    if (!title.trim() || !authorized) return;
    save([...tasks, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: title.trim(), client: client.trim(), status: 'Inbox' }]);
    setTitle(''); setClient('');
  };
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ padding: 14, borderRadius: 13, borderWidth: 1, borderColor: '#B8A274', backgroundColor: disabled ? '#30343A' : '#1B2738', minHeight: 46 }}><Text style={{ color: '#F4E5C4', fontWeight: '800', textAlign: 'center' }}>{label}</Text></Pressable>;
  const field = (label: string, value: string, change: (v: string) => void) => <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor="#9EA9BA" value={value} onChangeText={change} editable={authorized && loaded} style={{ color: '#FFFFFF', borderWidth: 1, borderColor: '#68768B', borderRadius: 12, padding: 13, minHeight: 46 }} />;
  return <ScrollView style={{ flex: 1, backgroundColor: '#060B14' }} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 65, gap: 16 }}>
    {button('Back to STAARWAARDD portals', () => router.replace('/hub'))}
    <Text style={{ color: '#F3D9A4', fontSize: 29, fontWeight: '900', letterSpacing: 1 }}>DIGGITSTAAR</Text>
    <Text style={{ color: '#D5DFEE', fontSize: 15 }}>AI Content Agency · Business Command Centre</Text>
    <View style={{ padding: 17, backgroundColor: '#121D2D', borderRadius: 18, borderWidth: 1, borderColor: '#6C7990', gap: 10 }}>
      <Text style={{ color: '#F5E3BE', fontSize: 19, fontWeight: '800' }}>Gmail workspace</Text>
      <Text style={{ color: '#F1C9A0', fontWeight: '700' }}>Not connected</Text>
      <Text style={{ color: '#D2DAE6', lineHeight: 21 }}>The studio will use a separate, consent-based Google authorization to read selected business mail and build a reviewable client inbox. Signing in to STAARWAARDD does not grant Gmail access.</Text>
      <Text style={{ color: '#C3CDDB', lineHeight: 20 }}>Planned permissions: read-only Gmail access, revocable at any time. No automatic sending, deleting, or sharing. Inbox classification, deadlines, and client matching stay disabled until a secure connection is implemented and verified.</Text>
      {button('Gmail connection · Setup pending', () => setNotice('Secure Gmail authorization is not yet available in this build. No mailbox has been accessed.'), true)}
    </View>
    <Text style={{ color: '#F3D9A4', fontSize: 21, fontWeight: '800' }}>Workload overview</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{STATES.map(status => <View key={status} style={{ backgroundColor: '#152237', borderRadius: 12, padding: 12, minWidth: '45%', flexGrow: 1 }}><Text style={{ color: '#D7E3F1', fontSize: 12 }}>{status}</Text><Text style={{ color: '#FFFFFF', fontSize: 25, fontWeight: '800' }}>{tasks.filter(t => t.status === status).length}</Text></View>)}</View>
    <Text style={{ color: '#D8E2EE', fontWeight: '700' }}>Add a client task manually</Text>
    {field('Client / brand', client, setClient)}
    {field('Deliverable or request', title, setTitle)}
    {button('Add to workload', add, !authorized || !loaded || !title.trim())}
    {!authorized && <Text style={{ color: '#F1C9A0' }}>Sign in to save business tasks. Guest accounts cannot store client data.</Text>}
    {tasks.map(task => <View key={task.id} style={{ padding: 15, borderWidth: 1, borderColor: '#4F6178', borderRadius: 14, gap: 9 }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{task.title}</Text><Text style={{ color: '#C7D3E3' }}>{task.client || 'Unassigned client'} · {task.status}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{STATES.map(status => <Pressable key={status} accessibilityRole="button" accessibilityLabel={`Mark ${task.title} ${status}`} onPress={() => save(tasks.map(t => t.id === task.id ? { ...t, status } : t))} style={{ padding: 8, borderRadius: 8, backgroundColor: task.status === status ? '#72603F' : '#273449' }}><Text style={{ color: '#FFFFFF', fontSize: 11 }}>{status}</Text></Pressable>)}</View>{button('Remove task', () => Alert.alert('Remove task?', 'This removes the local task only.', [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => save(tasks.filter(t => t.id !== task.id)) }]))}</View>)}
    {button('Share workload summary', () => { void Share.share({ message: `DIGGITSTAAR workload\n${tasks.map(t => `${t.status}: ${t.client} — ${t.title}`).join('\n') || 'No tasks recorded'}` }).catch(() => setNotice('Sharing is unavailable.')); }, !authorized)}
    <Text style={{ color: '#AEBBCD', lineHeight: 20 }}>Local, account-scoped preview only. Gmail, Drive, Calendar, and production integrations are not yet connected. No messages are read or sent from this screen.</Text>
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#F1D9AA' }}>{notice}</Text>}
  </ScrollView>;
}
