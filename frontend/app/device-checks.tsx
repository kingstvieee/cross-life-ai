import { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { speakCompanion, stopCompanion } from '@/src/companions';
import { shareWithWatch, watchStatus, WatchStatus } from '@/src/watch';
import { VoiceInput } from '@/components/staarwardd/voice-input';

export default function DeviceChecks() {
  const router = useRouter(); const { user } = useAuth();
  const [watch, setWatch] = useState<WatchStatus>({ supported: false });
  const [notice, setNotice] = useState('');
  const [played, setPlayed] = useState(false); const [playing, setPlaying] = useState(false);
  const [approved, setApproved] = useState(false); const [transcript, setTranscript] = useState('');
  const [sharing, setSharing] = useState(false);
  const companion = user?.companion === 'kaia' ? 'kaia' : 'atlas';
  async function refresh() { try { const status = await watchStatus(); setWatch(status); setSharing(!!status.sharing); } catch { setNotice('Could not read Watch status.'); } }
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 3000);
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') { void stopCompanion(); setPlaying(false); } });
    return () => { clearInterval(interval); sub.remove(); void stopCompanion(); };
  }, []);
  useEffect(() => { setPlayed(false); setApproved(false); }, [companion]);
  async function preview() {
    setPlaying(true); setPlayed(false); setApproved(false); setNotice('');
    try { await speakCompanion('', companion, () => setPlayed(true)); }
    catch { setNotice('Voice preview failed. Approval stays pending.'); }
    finally { setPlaying(false); }
  }
  async function share() {
    try { await shareWithWatch(!sharing, user?.companion || 'atlas'); setSharing(!sharing); await refresh(); }
    catch { setNotice('Watch sharing could not be updated.'); }
  }
  const line = (label: string, value: string) => <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#363D46' }}><Text style={{ color: '#AEB7C3' }}>{label}</Text><Text style={{ color: '#F2F4F7', marginTop: 5 }}>{value}</Text></View>;
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ padding: 15, borderWidth: 1, borderColor: '#818C9B', borderRadius: 14, marginVertical: 7, opacity: disabled ? .4 : 1 }}><Text style={{ color: '#F2F4F7' }}>{label}</Text></Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080A0D' }}><ScrollView contentContainerStyle={{ padding: 22, gap: 12, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
    {button('Back', () => router.back())}
    <Text style={{ color: '#F3F5F8', fontSize: 30, fontWeight: '600' }}>Voice & device checks</Text>
    <Text style={{ color: '#AEB7C3' }}>These checks report this device. They do not certify other devices or background wake-word listening.</Text>
    {line('Device', `${Platform.OS} ${Platform.Version}`)}
    {line('AI voice approval', approved ? `${companion === 'kaia' ? 'Kaia' : 'Atlas'} approved for this listening session` : 'Pending your listening approval')}
    {button(playing ? 'Playing preview…' : `Play ${companion === 'kaia' ? 'Kaia' : 'Atlas'} preview`, () => { void preview(); }, playing)}
    {button('I heard the complete preview and approve this voice', () => setApproved(true), !played || playing)}
    {button('Quiet / stop preview', () => { void stopCompanion(); setPlaying(false); setPlayed(false); })}
    <Text style={{ color: '#F3F5F8', fontSize: 20 }}>Microphone readback</Text>
    <VoiceInput onTranscript={setTranscript} disabled={!user || !!user.is_demo || playing} />
    {line('Transcription', transcript || 'Not tested. Say a short phrase, stop, and compare the words here.')}
    <Text style={{ color: '#F3F5F8', fontSize: 20 }}>Apple Watch</Text>
    {line('Native Watch bridge', watch.supported ? 'Available in this build' : 'Unavailable in this build or platform')}
    {line('Paired with this iPhone', watch.paired === undefined ? 'Not available' : watch.paired ? 'Yes' : 'No — pair in Apple’s Watch app')}
    {line('STAAR Watch installed', watch.installed === undefined ? 'Not available' : watch.installed ? 'Yes' : 'Not detected')}
    {line('Reachable now', watch.reachable ? 'Yes' : 'Not currently reachable')}
    {line('Live handshake', watch.verifiedAt && Date.now() / 1000 - watch.verifiedAt < 120 ? 'Watch verification request received in the last two minutes' : 'Pending — open STAAR Watch and tap Verify iPhone')}
    {button(sharing ? 'Turn off Watch sharing' : 'Enable Watch companion sharing', () => { void share(); }, !watch.supported || !user || !!user.is_demo)}
    <Text style={{ color: '#AEB7C3' }}>Only your selected companion and connection status are shared. Account credentials and private conversations stay off the Watch. Pairing is managed by Apple’s Watch app.</Text>
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#F3F5F8' }}>{notice}</Text>}
  </ScrollView></SafeAreaView>;
}
