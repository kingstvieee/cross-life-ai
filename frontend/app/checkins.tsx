import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { bindCheckinAccount, cancelCheckins, canDeliverCheckin, checkinStatus, scheduleCheckin, type CheckinStatus } from '@/src/checkins';

export default function Checkins() {
  const router = useRouter(); const { user, api } = useAuth();
  const [status, setStatus] = useState<CheckinStatus>({ supported: false });
  const [hour, setHour] = useState('13'); const [minute, setMinute] = useState('30');
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [serverConsentReady, setServerConsentReady] = useState(false);
  const [serverCheckinConsent, setServerCheckinConsent] = useState(false);
  const [serverGreetingConsent, setServerGreetingConsent] = useState(false);
  const [serverPrivateMode, setServerPrivateMode] = useState(false);
  const verificationEpoch = useRef(0);
  const account = user && !user.is_demo && !user.cross_life_paused ? user.user_id : '';
  const refresh = useCallback(async () => {
    const epoch = ++verificationEpoch.current;
    setServerConsentReady(false);
    setServerCheckinConsent(false);
    setServerPrivateMode(false);
    try {
      if (!account) {
        await bindCheckinAccount('');
        setStatus(await checkinStatus());
        return;
      }
      const response = await api('/api/guardian/life-map/overview');
      if (!response.ok) throw new Error('Guardian check-in consent could not be verified.');
      const state = await response.json();
      if (epoch !== verificationEpoch.current) return;
      const privateMode = state.privateMode === true;
      const allowed = state.consent?.checkIns === true && !privateMode;
      const greetings = state.consent?.greetings === true;
      // Native pending notifications may outlive JavaScript; revoke immediately when consent is off.
      await bindCheckinAccount(allowed ? account : '');
      const next = await checkinStatus();
      if (epoch !== verificationEpoch.current) return;
      setStatus(next);
      setServerCheckinConsent(allowed);
      setServerGreetingConsent(greetings);
      setServerPrivateMode(privateMode);
      setServerConsentReady(true);
      if (next.scheduled && next.hour !== undefined && next.minute !== undefined) {
        setHour(String(next.hour)); setMinute(String(next.minute).padStart(2, '0'));
      }
    } catch {
      if (epoch !== verificationEpoch.current) return;
      await bindCheckinAccount('');
      const next = await checkinStatus();
      if (epoch !== verificationEpoch.current) return;
      setStatus(next);
      setNotice('Guardian consent is unavailable. Daily reminders remain disabled.');
    }
  }, [account, api]);
  useEffect(() => { void refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => { verificationEpoch.current += 1; sub.remove(); }; }, [refresh]);
  async function save() {
    const startingEpoch = verificationEpoch.current;
    setBusy(true); setNotice('');
    try {
      if (!serverConsentReady) throw new Error('Guardian check-in consent has not been verified.');
      if (serverPrivateMode) throw new Error('Turn off Guardian private mode before enabling daily check-ins.');
      if (!serverCheckinConsent) {
        const response = await api('/api/guardian/core/workflows/rsf-fabric-sourcing/proactive-consent', {
          method: 'POST', body: JSON.stringify({ greetings: serverGreetingConsent, check_ins: true }),
        });
        if (!response.ok) throw new Error('Guardian could not enable check-in consent.');
        setServerCheckinConsent(true);
        await bindCheckinAccount(account);
      }
      // Re-check consent immediately before asking iOS to schedule a recurring background alert.
      const recheck = await api('/api/guardian/life-map/overview');
      if (!recheck.ok) throw new Error('Guardian permission could not be reverified.');
      const latest = await recheck.json();
      if (startingEpoch !== verificationEpoch.current || latest.privateMode === true || latest.consent?.checkIns !== true) {
        await bindCheckinAccount('');
        throw new Error('Guardian check-in permission changed. No reminder was scheduled.');
      }
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
    {account && !serverConsentReady && <Text style={{ color: '#E8CDA2' }}>Verifying Guardian check-in consent. Reminders cannot be scheduled until verification succeeds.</Text>}
    {serverPrivateMode && <Text style={{ color: '#E8CDA2' }}>Guardian private mode is active. Daily check-ins cannot be scheduled.</Text>}
    {account && serverConsentReady && !serverCheckinConsent && <Text style={{ color: '#E8CDA2' }}>Enabling this reminder will also request Guardian check-in consent. No microphone or external action is activated.</Text>}
    <Text style={{ color: '#F2F5F9' }}>Hour (12–23) · America/Toronto</Text>
    <TextInput accessibilityLabel="Check-in hour" keyboardType="number-pad" maxLength={2} value={hour} onChangeText={setHour} style={{ color: '#F2F5F9', padding: 15, borderWidth: 1, borderColor: '#66748A', borderRadius: 12 }} />
    <Text style={{ color: '#F2F5F9' }}>Minute (00–59)</Text>
    <TextInput accessibilityLabel="Check-in minute" keyboardType="number-pad" maxLength={2} value={minute} onChangeText={setMinute} style={{ color: '#F2F5F9', padding: 15, borderWidth: 1, borderColor: '#66748A', borderRadius: 12 }} />
    {button(busy ? 'Updating…' : 'Enable daily check-in', () => { void save(); }, busy || !status.supported || !account || !serverConsentReady || serverPrivateMode)}
    {button('Cancel daily check-in', () => { void cancel(); }, busy || !status.supported)}
    <Text style={{ color: '#C5CFDD' }}>{status.scheduled ? `Scheduled · ${String(status.hour).padStart(2, '0')}:${String(status.minute).padStart(2, '0')} Toronto` : 'No daily check-in is scheduled.'}{status.scheduled && !canDeliverCheckin(status) ? ' · Notification permission currently unavailable. Enable alerts in iPhone Settings.' : ''}</Text>
    {!!status.nextAt && <Text style={{ color: '#C5CFDD' }}>Next scheduled time: {new Date(status.nextAt * 1000).toLocaleString('en-CA', { timeZone: 'America/Toronto' })} Toronto</Text>}
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#E6EDF7', lineHeight: 23 }}>{notice}</Text>}
  </ScrollView></SafeAreaView>;
}
