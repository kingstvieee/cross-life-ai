import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';

/** Bounded, device-local demo: no account access, microphone, tools, or stored history. */
export function CompanionPreview() {
  const [persona, setPersona] = useState<'atlas' | 'kaia'>('atlas');
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState('Choose your companion and hear a welcome or a sample focus plan.');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; void Speech.stop(); }, []);
  const stop = () => { generation.current++; void Speech.stop(); setSpeaking(false); };
  const demonstrate = async (plan: boolean) => {
    const current = ++generation.current;
    await Speech.stop();
    const name = persona === 'atlas' ? 'Atlas' : 'Kaia';
    const text = plan
      ? `${name} here. This is a sample plan: choose one priority, give it twenty minutes of focused attention, then pause and review. Nothing has been scheduled or saved.`
      : `I'm ${name}. Welcome to STAARWARDD. ${persona === 'atlas' ? 'Kaia and I share the same capabilities. I bring a composed, direct approach.' : 'Atlas and I share the same capabilities. I bring a warm, gentle approach.'} This guest experience is a guided preview. Your private world begins with an account.`;
    setMessage(text);
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (generation.current !== current) return;
      const language = persona === 'atlas' ? 'en-GB' : 'en-US';
      const voice = voices.find(v => v.language === language);
      setSpeaking(true);
      const finish = () => { if (generation.current === current) setSpeaking(false); };
      Speech.speak(text, { language, voice: voice?.identifier, rate: persona === 'atlas' ? 0.94 : 0.9,
        onDone: finish, onStopped: finish, onError: () => { finish(); if (generation.current === current) setMessage(text + ' Audio is unavailable on this device.'); },
      });
    } catch { if (generation.current === current) { setSpeaking(false); setMessage(text + ' Audio is unavailable on this device.'); } }
  };
  return <LinearGradient colors={['#343A42', '#090B0E', '#181D23']} style={s.shell}>
    <Text style={s.eyebrow}>COMPANION SIGNAL · {speaking ? 'SPEAKING' : 'READY'}</Text>
    <Image source={require("@/assets/images/staarwardd/atlas-kaia-locked.jpeg")} accessibilityLabel="Approved Atlas on the left and Kaia on the right" style={{ width: "100%", aspectRatio: 1134 / 648, borderRadius: 14 }} resizeMode="contain" />
    <Text style={s.name}>{persona.toUpperCase()}</Text>
    <Text style={s.subtitle}>Two perspectives. One shared intelligence.</Text>
    <View style={s.row}>{(['atlas', 'kaia'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: persona === id }} onPress={() => { stop(); setPersona(id); setMessage('Hear a welcome or explore a sample focus plan.'); }} style={[s.choice, persona === id && s.active]}><Text style={s.text}>{id === 'atlas' ? 'Atlas · Direct' : 'Kaia · Warm'}</Text></Pressable>)}</View>
    <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>
    <View style={s.row}><Pressable accessibilityRole="button" onPress={() => void demonstrate(false)} style={s.choice}><Text style={s.text}>Hear welcome</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void demonstrate(true)} style={s.choice}><Text style={s.text}>Sample plan</Text></Pressable>{speaking && <Pressable accessibilityRole="button" onPress={stop} style={s.choice}><Text style={s.text}>Stop voice</Text></Pressable>}</View>
    <Text style={s.note}>Guided demo · device voice · no microphone or account access</Text>
  </LinearGradient>;
}
const s = StyleSheet.create({
  shell: { padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#7E8792', gap: 15, width: '100%', maxWidth: 640 },
  eyebrow: { color: '#CDD3DC', letterSpacing: 2, fontSize: 10 }, name: { color: '#F3F5F8', fontSize: 37, letterSpacing: 7, fontWeight: '600' }, subtitle: { color: '#AEB7C4', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, choice: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#515B68', backgroundColor: '#10151B' }, active: { borderColor: '#E4EBF2', backgroundColor: '#303842' },
  text: { color: '#E3E8F0', fontSize: 13 }, message: { color: '#BBC5D2', lineHeight: 22, fontSize: 14 }, note: { color: '#919BA9', fontSize: 11, lineHeight: 17 },
});
