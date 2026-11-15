import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { cancelCheckins, checkinStatus, scheduleCheckin, type CheckinStatus } from '@/src/checkins';

export default function Checkins() {
  const router = useRouter(); const { user } = useAuth();
  const [time, setTime] = useState('13:30'); const [status, setStatus] = useState<CheckinStatus>({ supported: false });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const refresh = () => checkinStatus().then(setStatus).catch(() => setMessage('Could not read notification status.'));
  useEffect(() => { void refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => sub.remove(); }, []);
  async function enable() {
    if (!user || user.is_demo || busy) return;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
    if (!match) { setMessage('Use a 24-hour time, such as 13:30.'); return; }
    setBusy(true);
    try { await scheduleCheckin(Number(match[1]), Number(match[2])); await refresh(); setMessage('Daily check-in scheduled in your device’s local time.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not schedule check-in.'); }
    finally { setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={action} style={{ padding: 18, borderWidth: 1, borderColor: '#6E7B8E', borderRadius: 16, opacity: busy || disabled ? .4 : 1 }}><Text style={{ color: '#EDF2F7' }}>{label}</Text></Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}><ScrollView contentContainerStyle={{ padding: 24, gap: 20, maxWidth: 700, width: '100%', alignSelf: 'center' }}>
    {button('Back', () => router.back())}<Text style={{ color: '#F0F4FA', fontSize: 30 }}>Guardian check-ins</Text>
    <Text style={{ color: '#BEC9D6', lineHeight: 24 }}>Choose when your Guardian invites you back. iOS delivers the notification even while STAAR Hub is closed. Tap it to open the app. Your microphone stays off until you choose Speak.</Text>
    <Text style={{ color: '#BEC9D6' }}>{status.supported ? `${status.scheduled || 0} scheduled · notification permission ${status.authorization === 2 || status.authorization === 3 ? 'allowed' : status.authorization === 1 ? 'denied' : 'not requested'}` : 'Requires an iPhone build with Guardian check-ins.'}</Text>
    <Text style={{ color: '#BEC9D6' }}>Daily local time · 24-hour format</Text><TextInput accessibilityLabel="Daily check-in time" value={time} onChangeText={setTime} maxLength={5} placeholder="13:30" placeholderTextColor="#8D9BAE" style={{ color: '#EDF2F7', padding: 18, borderWidth: 1, borderColor: '#6E7B8E', borderRadius: 16 }} />
    {button('Enable daily check-in', () => { void enable(); }, !status.supported || !user || user.is_demo)}
    {button('Disable check-ins', () => { setBusy(true); void cancelCheckins().then(refresh).then(() => setMessage('Check-ins disabled.')).catch(() => setMessage('Could not disable check-ins.')).finally(() => setBusy(false)); }, !status.supported)}
    {button('Open notification settings', () => { void Linking.openSettings(); }, !status.supported)}
    <Text style={{ color: '#9CAABD', lineHeight: 22 }}>No background listening or automatic device actions. Reminders contain no private account data. They clear when the app next opens or your account changes; enable them again when wanted.</Text>
    {!!message && <Text accessibilityRole="alert" style={{ color: '#EDF2F7' }}>{message}</Text>}
  </ScrollView></SafeAreaView>;
}
