import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/src/auth';
import { cleanWorkFocus, workFocusHandoff, workFocusKey } from '@/src/work-focus';

export default function WorkFocus() {
  const { user, api } = useAuth();
  const id = user && !user.is_demo ? user.user_id : null;
  return id ? <OwnerWorkFocus key={id} owner={id} api={api} /> : null;
}

function OwnerWorkFocus({ owner, api }: { owner: string; api: ReturnType<typeof useAuth>['api'] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [status, setStatus] = useState('Loading open tasks…');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const key = workFocusKey(owner);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let live = true;
    const controller = new AbortController();
    void Promise.resolve().then(() => Platform.OS === 'web' ? globalThis.sessionStorage.getItem(key) : SecureStore.getItemAsync(key))
      .then(value => { if (live) { const name = cleanWorkFocus(value); setSaved(name); setTitle(name); setReady(true); } })
      .catch(() => { if (live) setNotice('Could not read project storage on this device.'); });
    void api('/api/portal/work/state', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Work unavailable');
      const body = await response.json();
      const open = Array.isArray(body.data?.tasks) ? body.data.tasks
        .filter((task: { done?: boolean } | null) => task?.done === false)
        .map((task: { title?: string }) => cleanWorkFocus(task.title)).filter(Boolean).slice(0, 20) : [];
      if (live) { setTasks(Array.from(new Set<string>(open))); setStatus(open.length ? 'Choose an open task or name a project.' : 'No open tasks. Name a project below.'); }
    }).catch(() => { if (live) setStatus('Could not load open tasks. You can still name a project.'); });
    return () => { live = false; mounted.current = false; controller.abort(); };
  }, [api, key]);

  async function save() {
    const clean = cleanWorkFocus(title);
    if (!ready || !clean || saving) return;
    setSaving(true);
    try {
      if (Platform.OS === 'web') globalThis.sessionStorage.setItem(key, clean);
      else await SecureStore.setItemAsync(key, clean);
      if (mounted.current) { setSaved(clean); setNotice(Platform.OS === 'web' ? 'Saved for this browser session.' : 'Saved on this device.'); }
    } catch { if (mounted.current) setNotice('Project focus could not be saved.'); }
    finally { if (mounted.current) setSaving(false); }
  }

  async function gmail() {
    if (Platform.OS === 'ios') {
      try { await Linking.openURL('googlegmail://'); return; } catch { /* Fall back to Google’s sign-in; no inbox access is granted. */ }
    }
    try { await Linking.openURL('https://mail.google.com/'); }
    catch { if (mounted.current) setNotice('Gmail could not open.'); }
  }

  const button = (label: string, onPress: () => void, disabled = false) => <Pressable key={label} accessibilityRole="button"
    disabled={disabled} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#74664C', opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: '#F1DDAF' }}>{label}</Text>
  </Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 13 }}>
      {button('Back', () => router.back())}
      <Text accessibilityRole="header" style={{ fontSize: 28, color: '#F1F4F8' }}>Current Work</Text>
      <Text style={{ color: '#C5CEDB' }}>{status}</Text>
      {tasks.map(task => button(task, () => setTitle(task)))}
      <TextInput accessibilityLabel="Project or task name" placeholder="Name a project" placeholderTextColor="#AAB3C3"
        value={title} onChangeText={setTitle} maxLength={120} style={{ padding: 12, borderWidth: 1, borderColor: '#74664C', color: '#F1F4F8' }} />
      {button('Save current focus', () => { void save(); }, !ready || saving || !cleanWorkFocus(title))}
      {saved ? <Text style={{ color: '#C5CEDB' }}>Current focus: {saved}</Text> : null}
      {button('Review focus with Guardian', () => {
        if (workFocusHandoff.stage(owner, saved)) router.push({ pathname: '/chat', params: { portal: 'work', workFocus: 'review' } } as never);
      }, !saved)}
      {button('Open Gmail', () => { void gmail(); })}
      <Text style={{ color: '#C5CEDB' }}>Gmail opens separately. This does not link your inbox to STAAR Hub.</Text>
      {notice ? <Text accessibilityLiveRegion="polite" style={{ color: '#C5CEDB' }}>{notice}</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
