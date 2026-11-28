import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth';
import { PETCARE_DEVICES, readPetcareDevices, recordPetcareEmergency } from '@/src/petcare-status';

const base = '/api/staarhealth/petcare';

export default function PetCare() {
  const { user, loading } = useAuth();
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#10151e' }}>
    {loading ? <Text style={{ color: '#fff', padding: 20 }}>Loading pet care…</Text>
      : !user || user.is_demo ? <Text style={{ color: '#fff', padding: 20 }}>Sign in to access pet care.</Text>
        : <Dashboard key={user.user_id} />}
  </SafeAreaView>;
}

function Dashboard() {
  const { api } = useAuth();
  const [data, setData] = useState<ReturnType<typeof readPetcareDevices>>({});
  const [status, setStatus] = useState('Checking monitoring status…');
  const [emergency, setEmergency] = useState<'idle' | 'sending' | 'recorded' | 'unconfirmed'>('idle');
  const emergencyPending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let pending = false;
    async function poll() {
      if (pending || AppState.currentState !== 'active') return;
      pending = true;
      const id = generation;
      try {
        const response = await api(base + '/dashboard');
        if (!response.ok) throw new Error('Dashboard unavailable');
        const devices = readPetcareDevices(await response.json());
        if (active && id === generation) {
          setData(devices);
          setStatus('Device telemetry only. Check on your pet in person.');
        }
      } catch {
        if (active && id === generation) {
          setData({});
          setStatus('Connection unavailable. Check on your pet in person or contact a caregiver.');
        }
      } finally {
        pending = false;
      }
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { void poll(); return; }
      generation++;
      setData({});
      setStatus('Monitoring paused. Check on your pet in person.');
    });
    void poll();
    const timer = setInterval(poll, 10000);
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [api]);

  async function requestEmergency() {
    if (emergencyPending.current) return;
    emergencyPending.current = true;
    setEmergency('sending');
    const result = await recordPetcareEmergency(() => api(base + '/emergency', { method: 'POST' }));
    emergencyPending.current = false;
    if (mounted.current) setEmergency(result);
  }

  return <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
    <Text style={{ color: '#e5c88d', fontSize: 25, fontWeight: '700' }}>STAARHEALTH · PET CARE</Text>
    <Text style={{ color: '#fff', fontSize: 22 }}>STAAR | ATLAS & KAYA</Text>
    <Text style={{ color: '#e5c88d' }}>{status}</Text>
    {PETCARE_DEVICES.map(device => <View key={device} style={{ borderColor: '#87909e', borderWidth: 1, borderRadius: 12, padding: 18, backgroundColor: '#242c36' }}>
      <Text style={{ color: '#fff' }}>{device.toUpperCase()} · {data[device] || 'unavailable'}</Text>
    </View>)}
    <Text style={{ color: '#fff' }}>Automatic feeding and companion playback are off pending hardware validation.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: emergency === 'sending' }}
      disabled={emergency === 'sending'} onPress={() => { void requestEmergency(); }}
      style={{ padding: 16, borderColor: '#b97575', borderWidth: 1, borderRadius: 10 }}>
      <Text style={{ color: '#ffcaca' }}>
        {emergency === 'sending' ? 'Recording…' : 'Record emergency request (does not send an alert)'}
      </Text>
    </Pressable>
    {emergency !== 'idle' && <Text accessibilityRole="alert" style={{ color: '#ffcaca' }}>
      {emergency === 'recorded' ? 'Request recorded. No alert was sent. '
        : emergency === 'unconfirmed' ? 'Could not confirm the recording. No alert is sent by this screen. ' : ''}
      Contact a caregiver or emergency veterinarian directly now.
    </Text>}
  </ScrollView>;
}
