import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { bindCheckinAccount, cancelCheckins, checkinStatus, scheduleCheckin, type CheckinStatus } from '@/src/checkins';

export default function Checkins() {
  const router = useRouter(); const { user } = useAuth();
  const [status, setStatus] = useState<CheckinStatus>({ supported: false });
  const [hour, setHour] = useState('13'); const [minute, setMinute] = useState('30');
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const account = user && !user.is_demo && !user.cross_life_paused ? user.user_id : '';
  const refresh = useCallback(async () => {
    try { await bindCheckinAccount(account); const next = await checkinStatus(); setStatus(next);
      if (next.scheduled && next.hour !== undefined && next.minute !== undefined) { setHour(String(next.hour)); setMinute(String(next.minute).padStart(2, '0')); }
    } catch { setNotice('Could not read the notification schedule.'); }
  }, [account]);
  useEffect(() => { void refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => sub.remove(); }, [refresh]);
  async function save() {
    setBusy(true); setNotice('');
    try {
      const next = await scheduleCheckin(account, Number(hour), Number(minute)); setStatus(next);
      setNotice(next.scheduled ? 'Daily check-in registered with this device. Focus and notification settings can affect delivery.' : 'Notifications are not enabled. Allow them in iPhone or iPad Settings to schedule a check-in.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not schedule the check-in.'); }
    finally { setBusy(false); }
  }
  async function cancel() { setBusy(true); try { await cancelCheckins(); await refresh(); setNotice('Daily check-in cancelled on this device.'); } catch { setNotice('Could not cancel the check-in. Try again.'); } finally { setBusy(false); } }
  const button = (text: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ padding: 16, borderWidth: 1, borderColor: '#8A96A7', borderRadius: 14, opacity: disabled ? .4 : 1 }}><Text style={{ color: '#EDF1F7' }}>{text}</Text></Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}><ScrollView contentContainerStyle={{ padding: 24, gap: 20, maxWidth: 700, width: '100%', alignSelf: 'center' }}>
    {button('Back', () => router.back())}
    <Text style={{ color: '#F2F5F9', fontSize: 30 }}>Your daily check-in</Text>
    <Text style={{ color: '#BAC4D2', lineHeight: 23 }}>Choose a daily reminder after noon, in Toronto time. Your device can deliver it while STAAR Hub is closed. Open the notification to return to the app.</Text>
    <Text style={{ color: '#BAC4D2', lineHeight: 23 }}>The reminder contains no private conversation or account details. It does not turn on the microphone, speak a reply or run external actions.</Text>
    {!status.supported && <Text style={{ color: '#DCE3EE' }}>Available in an updated native iPhone/iPad build. This version cannot schedule device check-ins.</Text>}
    {!account && <Text style={{ color: '#DCE3EE' }}>Sign in and resume cross-life context to enable a check-in. Signing out or pausing cancels this device’s schedule.</Text>}
    <Text style={{ color: '#F2F5F9' }}>Hour (12–23) · America/Toronto</Text>
    <TextInput accessibilityLabel="Check-in hour" keyboardType="number-pad" maxLength={2} value={hour} onChangeText={setHour} style={{ color: '#F2F5F9', padding: 15, borderWidth: 1, borderColor: '#66748A', borderRadius: 12 }} />
    <Text style={{ color: '#F2F5F9' }}>Minute (00–59)</Text>
    <TextInput accessibilityLabel="Check-in minute" keyboardType="number-pad" maxLength={2} value={minute} onChangeText={setMinute} style={{ color: '#F2F5F9', padding: 15, borderWidth: 1, borderColor: '#66748A', borderRadius: 12 }} />
    {button(busy ? 'Updating…' : 'Enable daily check-in', () => { void save(); }, busy || !status.supported || !account)}
    {button('Cancel daily check-in', () => { void cancel(); }, busy || !status.supported)}
    <Text style={{ color: '#C5CFDD' }}>{status.scheduled ? `Scheduled · ${String(status.hour).padStart(2, '0')}:${String(status.minute).padStart(2, '0')} Toronto` : 'No daily check-in is scheduled.'}</Text>
    {!!status.nextAt && <Text style={{ color: '#C5CFDD' }}>Next scheduled time: {new Date(status.nextAt * 1000).toLocaleString('en-CA', { timeZone: 'America/Toronto' })} Toronto</Text>}
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#E6EDF7', lineHeight: 23 }}>{notice}</Text>}
  </ScrollView></SafeAreaView>;
}
