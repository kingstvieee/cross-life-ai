import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/src/auth';
import { homeOrigin, lightCommandConfirmed, readHome, setHomeLight, setHomeLightColour, type HomeCredentials, type HomeEntity, type LightColour } from '@/src/home-assistant';

export function HomeConnection() {
  const { user } = useAuth();
  const [origin, setOrigin] = useState(''); const [token, setToken] = useState('');
  const [entities, setEntities] = useState<HomeEntity[]>([]); const [checked, setChecked] = useState<number | null>(null);
  const [notice, setNotice] = useState('Not connected.'); const [busy, setBusy] = useState(false);
  const [secureReady, setSecureReady] = useState(false);
  const credentials = useRef<HomeCredentials | null>(null); const request = useRef<AbortController | null>(null);
  const key = useRef<string | null>(null); const generation = useRef(0);
  function invalidate() { generation.current++; request.current?.abort(); request.current = null; setEntities([]); setChecked(null); setBusy(false); }
  useEffect(() => {
    let active = true; const id = ++generation.current;
    if (user && !user.is_demo && Platform.OS !== 'web') void Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, user.user_id)
      .then(async digest => { const k = 'staar.home.' + digest; const saved = await SecureStore.getItemAsync(k);
        if (!active || id !== generation.current) return; key.current = k; setSecureReady(true);
        if (saved) { const parsed = JSON.parse(saved); credentials.current = { origin: homeOrigin(parsed.origin), token: parsed.token }; setOrigin(parsed.origin); setNotice('Saved connection. Refresh to verify current device states.'); }
      }).catch(() => { if (active) setNotice('Could not load a saved home connection.'); });
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') { invalidate(); setToken(''); setNotice('Device readback paused. Refresh after returning to the app.'); } });
    return () => { active = false; generation.current++; request.current?.abort(); request.current = null; credentials.current = null; key.current = null; sub.remove(); };
  }, [user?.user_id]);
  async function run(connect = false, light?: HomeEntity, colour?: LightColour) {
    if (request.current || !user || user.is_demo || Platform.OS === 'web') return;
    const id = ++generation.current; const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000); setBusy(true); setChecked(null); setNotice('Reading Home Assistant…');
    try {
      const current = connect ? { origin: homeOrigin(origin), token: token.trim() } : credentials.current;
      if (!current?.token || /[\r\n]/.test(current.token)) throw new Error('Enter a valid Home Assistant access token.');
      const list = !light ? await readHome(current, controller.signal)
        : colour ? await setHomeLightColour(current, light.entity_id, colour, controller.signal)
        : await setHomeLight(current, light.entity_id, light.state !== 'on', controller.signal);
      if (id !== generation.current) return;
      if (connect) { if (!key.current) throw new Error('Secure storage is not ready. Try again.');
        await SecureStore.setItemAsync(key.current, JSON.stringify(current), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
        if (id !== generation.current) return; credentials.current = current; setToken(''); }
      setEntities(list); setChecked(Date.now());
      setNotice(!light ? 'Connection verified. States below were read from your server.'
        : lightCommandConfirmed(list, light.entity_id, colour ?? (light.state !== 'on'))
          ? 'Home Assistant reports the requested light setting.'
          : 'Home Assistant accepted the command but has not confirmed the requested setting. Refresh to check again.');
    } catch (e) { if (id === generation.current) { setEntities([]); setNotice(e instanceof Error ? e.message : 'Connection failed.'); } }
    finally { clearTimeout(timer); if (request.current === controller) request.current = null; if (id === generation.current) setBusy(false); }
  }
  async function disconnect() { invalidate(); credentials.current = null; setToken(''); if (key.current) await SecureStore.deleteItemAsync(key.current); setNotice('Disconnected on this device. Revoke the token in Home Assistant if you no longer need it.'); }
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ padding: 14, borderWidth: 1, borderColor: '#727F91', borderRadius: 12, opacity: disabled ? .4 : 1 }}><Text style={{ color: '#F3F5F8' }}>{label}</Text></Pressable>;
  return <View style={{ gap: 12 }}>
    <Text style={{ color: '#F3F5F8', fontSize: 22 }}>Your connected home</Text>
    <Text style={{ color: '#BCC5D1', lineHeight: 22 }}>Connect your own Home Assistant server to read lights, climate, sensors, media and security states. Light controls require your tap. Other devices are read-only.</Text>
    {Platform.OS === 'web' ? <Text style={{ color: '#BCC5D1' }}>Home credentials are supported in the iPhone/iPad app with secure device storage.</Text> : <>
      <TextInput accessibilityLabel="Home Assistant HTTPS address" placeholder="https://your-home.example" placeholderTextColor="#8F9BAD" autoCapitalize="none" autoCorrect={false} value={origin} onChangeText={setOrigin} style={{ color: '#F3F5F8', padding: 14, borderWidth: 1, borderColor: '#596578', borderRadius: 12 }} />
      <TextInput accessibilityLabel="Home Assistant access token" placeholder="Long-lived access token" placeholderTextColor="#8F9BAD" secureTextEntry autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} style={{ color: '#F3F5F8', padding: 14, borderWidth: 1, borderColor: '#596578', borderRadius: 12 }} />
      <Text style={{ color: '#9FAABC', lineHeight: 20 }}>Create the token in your Home Assistant profile. It stays in this device’s secure storage and is sent only to the server address you enter. Never paste it in chat. Devices must already be added to Home Assistant. HTTPS is required.</Text>
      {button(busy ? 'Checking…' : 'Verify and save connection', () => { void run(true); }, busy || !token.trim() || !secureReady)}
      {button('Refresh device states', () => { void run(); }, busy || !credentials.current)}
      {button('Disconnect this home', () => { void disconnect().catch(() => setNotice('Could not remove the saved connection. Try again.')); }, busy || !credentials.current)}
    </>}
    <Text accessibilityRole="alert" style={{ color: '#E1E7EF' }}>{notice}</Text>
    {!!checked && <Text style={{ color: '#9FAABC' }}>Read at {new Date(checked).toLocaleTimeString()}. Refresh for current status.</Text>}
    {entities.map(entity => <View key={entity.entity_id} style={{ borderTopWidth: 1, borderColor: '#3A4657', paddingVertical: 12, gap: 8 }}>
      <Text style={{ color: '#F3F5F8', fontSize: 17 }}>{entity.name}</Text><Text style={{ color: '#BCC5D1' }}>{entity.state}{entity.unit ? ' ' + entity.unit : ''} · {entity.entity_id}</Text>
      {entity.light && (entity.light.brightness !== undefined || entity.light.rgb !== undefined) && (
        <Text style={{ color: '#BCC5D1' }}>
          {[entity.light.brightness === undefined ? null : `Brightness ${entity.light.brightness}%`,
            entity.light.rgb ? `RGB ${entity.light.rgb.join(', ')}` : null].filter(Boolean).join(' · ')}
        </Text>
      )}
      {entity.entity_id.startsWith('light.') && ['on', 'off'].includes(entity.state) && <>
        {button(entity.state === 'on' ? 'Turn this light off' : 'Turn this light on', () => { void run(false, entity); }, busy)}
        {entity.light?.canDim && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[25, 50, 75, 100].map(brightness => <View key={brightness}>
            {button(`Set ${entity.name} to ${brightness}%`, () => { void run(false, entity, { brightness }); }, busy)}
          </View>)}
        </View>}
        {entity.light?.canSetColour && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['Red', 'Green', 'Blue'] as const).map((name, i) => {
            const rgb: [number, number, number] = [i === 0 ? 255 : 0, i === 1 ? 255 : 0, i === 2 ? 255 : 0];
            return <View key={name}>{button(`Set ${entity.name} to ${name.toLowerCase()}`, () => { void run(false, entity, { rgb }); }, busy)}</View>;
          })}
        </View>}
      </>}
    </View>)}
  </View>;
}
