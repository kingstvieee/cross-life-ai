import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessField } from './access-field';
import { WORLDS } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';

export function WorldHub() {
  const router = useRouter();
  const { user } = useAuth();
  const audio = useStaarAudio();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 3;
  const portalSize = width >= 900 ? 225 : width >= 600 ? 185 : Math.max(96, Math.floor((width - 68) / 3));
  const drift = useRef(new Animated.Value(0)).current;
  const arrival = useRef(new Animated.Value(0)).current;
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem('staarwardd.guardian.proactive-greeting.v1').then(value => { if (alive) { setGreetingEnabled(value === 'enabled'); setPreferenceReady(true); } }).catch(() => { if (alive) setPreferenceReady(true); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setMotionReduced(value); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setMotionReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    drift.stopAnimation(); arrival.stopAnimation();
    if (motionReduced) { drift.setValue(0); arrival.setValue(1); return; }
    drift.setValue(0); arrival.setValue(0);
    const loop = Animated.loop(Animated.sequence([Animated.timing(drift, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(drift, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    Animated.spring(arrival, { toValue: 1, damping: 17, stiffness: 65, useNativeDriver: true }).start();
    return () => { loop.stop(); arrival.stopAnimation(); };
  }, [arrival, drift, motionReduced]);
  const greeted = useRef(false);
  useEffect(() => {
    if (!preferenceReady || !greetingEnabled || !audio.master || !audio.voice || audio.speechQuiet || greeted.current) return;
    greeted.current = true;
    void audio.speak('Welcome back. Guardian is here. Your nine worlds are ready when you are.');
  }, [preferenceReady, greetingEnabled, audio.master, audio.voice, audio.speechQuiet, audio.speak]);
  const setGreeting = (enabled: boolean) => { setGreetingEnabled(enabled); greeted.current = !enabled; void AsyncStorage.setItem('staarwardd.guardian.proactive-greeting.v1', enabled ? 'enabled' : 'disabled'); };
  const companion = user?.companion === 'kaia' ? 'Kaia' : user?.companion === 'guardian' ? 'Guardian' : 'Atlas';
  useFocusEffect(useCallback(() => { setSelected(null); return () => audio.stopAll(); }, [audio.stopAll]));
  return <View style={s.root}>
    <LinearGradient colors={['#171A1E', '#030405', '#111418']} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}><View><Text style={s.brand}>STAARWARDD</Text><Text style={s.micro}>YOUR CONNECTED UNIVERSE</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={s.icon}><Ionicons name="options-outline" size={22} color="#E4E8EE" /></Pressable></View>
        <View style={s.stage}>
          <AccessField />
          <Animated.View style={[s.stageCopy, { opacity: arrival, transform: [{ translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }]}><Text style={s.micro}>{companion.toUpperCase()} · YOUR COMPANION</Text><Text style={s.title}>Welcome to{ '\n' }STAARWAARDD</Text><Text style={s.description}>Your Guardian. Your nine worlds. Your command.</Text></Animated.View>
        </View>
        <LinearGradient colors={['#BBC2CB', '#3A414A', '#8B949F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.frame}>
          <BlurView intensity={35} tint="dark" style={s.companion}>
            <View style={{ flex: 1, gap: 7 }}><Text style={s.panelTitle}>Speak with {companion}</Text><Text style={s.description}>Bring an idea, a question, or a plan.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open conversation with ${companion}`} onPress={() => router.push('/chat')} style={s.primary}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#101317" /></Pressable>
          </BlurView>
        </LinearGradient>
        <View style={s.voiceRow}><View style={{ flex: 1 }}><Text style={s.panelTitle}>Guardian welcome</Text><Text style={s.description}>{!audio.master ? 'Enable master audio in settings to hear greetings.' : greetingEnabled ? 'Speaks once when the Hub starts, unless muted.' : 'Off by default. Enable to hear a welcome on entry.'}</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: greetingEnabled }} accessibilityLabel="Proactive Guardian greeting" onPress={() => setGreeting(!greetingEnabled)} style={[s.toggle, greetingEnabled && s.toggleOn]}><Text style={s.toggleText}>{greetingEnabled ? 'ON' : 'OFF'}</Text></Press><Pressable accessibilityRole="button" accessibilityLabel="Silence Guardian" onPress={() => { audio.setSpeechQuiet(true); audio.stopAll(); }} style={s.silence}><Ionicons name="volume-mute-outline" size={21} color="#F3F4F6" /></Pressable></View>
        <View style={s.section}><Text style={s.micro}>ENTER YOUR NINE WORLDS</Text><Text style={s.count}>09</Text></View>
        <View style={s.grid}>{WORLDS.map((world, index) => <Pressable key={world.id} accessibilityRole="button" accessibilityLabel={`Open ${world.name}`} disabled={selected !== null} onPress={() => { setSelected(world.id); router.push({ pathname: '/world/[id]', params: { id: world.id } } as never); }} style={({ pressed }) => [s.world, { width: portalSize, height: portalSize, borderRadius: portalSize / 2 }, pressed && s.pressed]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [index % 2 ? 4 : -4, index % 2 ? -4 : 4] }) }, { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.08] }) }] }]}><Image source={world.image} style={s.art} accessibilityLabel={`${world.name} approved portal artwork`} /></Animated.View>
          <View pointerEvents="none" style={[s.glassRing, { borderRadius: portalSize / 2 }]} />
          <LinearGradient colors={['transparent', 'rgba(3,4,5,.65)', '#080A0D']} locations={[0, .45, 1]} style={StyleSheet.absoluteFill} />
          <View style={s.worldTop}><Text style={s.number}>{String(index + 1).padStart(2, '0')}</Text><Ionicons name="arrow-forward-outline" size={18} color="#DDE3EB" /></View>
          <View style={s.worldCopy}><Text style={s.worldName}>{world.name}</Text><Text style={s.worldDetail}>{world.title}</Text></View>
        </Pressable>)}</View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/device-checks')} style={s.icon}><Text style={s.panelTitle}>Voice & device checks</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/guardian-tools')} style={s.icon}><Text style={s.panelTitle}>Life Map & Guardian controls</Text></Pressable>
        <Text style={s.footer}>GUARDIAN AT THE HEART. YOU IN CONTROL.</Text>
      </ScrollView>
    </SafeAreaView>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030405' }, safe: { flex: 1 }, content: { padding: 22, paddingBottom: 38, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, brand: { color: '#F3F5F8', fontSize: 18, letterSpacing: 4, fontWeight: '700' }, micro: { color: '#B2BAC5', fontSize: 10, letterSpacing: 2, lineHeight: 17 }, icon: { padding: 12, borderWidth: 1, borderColor: '#4D555F', borderRadius: 16 },
  stage: { height: 285, overflow: 'hidden', marginVertical: 12 }, stageCopy: { paddingTop: 63, paddingHorizontal: 12, gap: 10 }, title: { color: '#F1F3F7', fontSize: 44, lineHeight: 49, letterSpacing: -1.5, fontWeight: '600' }, description: { color: '#B3BCC9', fontSize: 13, lineHeight: 21 },
  frame: { borderRadius: 21, padding: 1 }, companion: { borderRadius: 20, overflow: 'hidden', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(10,13,17,.8)' }, panelTitle: { color: '#F1F3F6', fontSize: 18, fontWeight: '600' }, primary: { padding: 15, borderRadius: 18, backgroundColor: '#D4DAE2' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 18, borderColor: '#747B85', borderWidth: 1, backgroundColor: '#101318' }, toggle: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: '#AAB2BD' }, toggleOn: { backgroundColor: '#CFD5DF' }, toggleText: { color: '#777F8C', fontWeight: '800' }, silence: { padding: 10 }, glassRing: { ...StyleSheet.absoluteFillObject, borderWidth: 3, borderColor: 'rgba(235,240,248,.72)', borderTopColor: 'rgba(255,255,255,.95)', borderBottomColor: 'rgba(125,135,149,.55)' },
  section: { marginTop: 30, marginBottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, count: { color: '#858E9A', fontSize: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 },
  world: { overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', backgroundColor: '#12161B' }, art: { width: '100%', height: '100%', resizeMode: 'cover' }, worldTop: { position: 'absolute', top: 17, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' }, number: { color: '#E3E8EF', fontSize: 11, letterSpacing: 3 }, worldCopy: { position: 'absolute', bottom: 18, left: 20, right: 20, gap: 6 }, worldName: { color: '#F4F6F9', fontSize: 13, fontWeight: '600', letterSpacing: .3 }, worldDetail: { color: '#C0C8D2', fontSize: 9, lineHeight: 19 }, pressed: { opacity: .7 }, footer: { color: '#7F8996', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 30 },
});
