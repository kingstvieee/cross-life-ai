import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessField } from './access-field';
import { GuardianCharacter, type GuardianState } from './guardian-character';
import { WORLDS } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { accountStorageKey } from '@/src/account-storage';
import { isProactiveWelcomeTime } from '@/src/guardian-greeting-policy';

export function WorldHub() {
  const router = useRouter();
  const { user, api } = useAuth();
  const audio = useStaarAudio();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const [guardianState, setGuardianState] = useState<GuardianState>('flying');
  const [stageHeight, setStageHeight] = useState(380);
  const [guardianMessage, setGuardianMessage] = useState('Guardian standing by.');
  const [greetingError, setGreetingError] = useState(false);
  const [guardianSpeaking, setGuardianSpeaking] = useState(false);
  const portalSize = width >= 900 ? 225 : width >= 600 ? 185 : Math.max(96, Math.floor((width - 68) / 3));
  const drift = useRef(new Animated.Value(0)).current;
  const arrival = useRef(new Animated.Value(0)).current;
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const greetingKey = user && !user.is_demo ? accountStorageKey('staarwardd.guardian.proactive-greeting.v2', user.user_id) : null;
  const greeted = useRef(false);
  const voiceEpoch = useRef(0);
  const activeGreetingKey = useRef<string | null>(null);
  activeGreetingKey.current = greetingKey;
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [serverConsentReady, setServerConsentReady] = useState(false);
  const [serverGreetingConsent, setServerGreetingConsent] = useState(false);
  const [serverCheckIns, setServerCheckIns] = useState(false);
  const [serverPrivate, setServerPrivate] = useState(false);
  const [serverSpeechQuiet, setServerSpeechQuiet] = useState(false);
  const [savingGreeting, setSavingGreeting] = useState(false);
  const lastBackground = useRef<number | null>(null);
  const [foregroundEpoch, setForegroundEpoch] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [motionReduced, setMotionReduced] = useState(true);
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const arrivalFinished = useRef(false);
  useEffect(() => {
    let alive = true;
    // Never inherit the previous account's opt-in while the new one is loading.
    setPreferenceReady(false);
    setGreetingEnabled(false);
    greeted.current = false;
    voiceEpoch.current += 1;
    if (!greetingKey) return () => { alive = false; };
    void AsyncStorage.getItem(greetingKey).then(value => {
      if (alive) { setGreetingEnabled(value === 'enabled'); setPreferenceReady(true); }
    }).catch(() => { if (alive) setPreferenceReady(true); });
    return () => { alive = false; };
  }, [greetingKey]);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setSavingGreeting(false);
    setServerConsentReady(false);
    setServerGreetingConsent(false);
    setServerCheckIns(false);
    setServerPrivate(false);
    setServerSpeechQuiet(false);
    if (greetingKey) void api('/api/guardian/life-map/overview', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Guardian consent could not be verified');
        const state = await response.json();
        if (!alive) return;
        setServerGreetingConsent(state.consent?.greetings === true);
        setServerCheckIns(state.consent?.checkIns === true);
        setServerPrivate(state.privateMode === true);
        setServerSpeechQuiet(state.speechQuiet === true);
        setServerConsentReady(true);
      }).catch(() => { /* Fail closed: an unverified server cannot authorize unsolicited speech. */ });
    return () => { alive = false; controller.abort(); clearTimeout(timeout); };
  }, [api, greetingKey, foregroundEpoch]);
  useEffect(() => {
    let alive = true;
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
  useEffect(() => { if (motionReduced) setArrivalComplete(true); }, [motionReduced]);
  const onGuardianMotionEnd = useCallback(() => {
    if (!arrivalFinished.current) {
      arrivalFinished.current = true;
      setArrivalComplete(true);
    }
    setGuardianState(state => state === 'flying' ? 'hover' : state);
  }, []);
  const focused = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setAppActive(state === 'active');
      if (state !== 'active') { if (lastBackground.current === null) lastBackground.current = Date.now(); return; }
      const awaySince = lastBackground.current;
      lastBackground.current = null;
      if (awaySince === null || Date.now() - awaySince < 20 * 60 * 1000) return;
      // Never create a new automatic welcome during protected focus or rest hours.
      if (!isProactiveWelcomeTime(new Date())) return;
      greeted.current = false;
      // Require fresh server permission before another unsolicited welcome.
      setServerConsentReady(false);
      setServerGreetingConsent(false);
      setForegroundEpoch(epoch => epoch + 1);
    });
    return () => sub.remove();
  }, []);
  const greet = useCallback(async () => {
    if (!focused.current || AppState.currentState !== 'active') return;
    const epoch = ++voiceEpoch.current;
    if (!audio.master || !audio.voice || audio.speechQuiet) { setGuardianMessage('Voice is muted or disabled. Use settings to enable audio.'); return; }
    // Transport emits playback-active only after the voice actually starts.
    setGuardianState('hover'); setGuardianSpeaking(true);
    setGuardianMessage('Welcome back. Your nine worlds are ready.');
    try {
      setGreetingError(false);
      const spoken = await audio.speak('Welcome back. Guardian is here. Your nine worlds are ready when you are.');
      if (!spoken && focused.current && epoch === voiceEpoch.current) {
        setGreetingError(true);
        setGuardianMessage('Guardian is present, but voice playback is unavailable. Continue in chat.');
      }
    } catch {
      if (focused.current && epoch === voiceEpoch.current) {
        setGreetingError(true);
        setGuardianMessage('Voice playback failed. Text chat remains available.');
      }
    } finally {
      if (focused.current && epoch === voiceEpoch.current) {
        setGuardianSpeaking(false);
        setGuardianState('hover');
      }
    }
  }, [audio.master, audio.voice, audio.speechQuiet, audio.speak]);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; voiceEpoch.current += 1; }; }, []));
  useEffect(() => {
    if (!focused.current || !appActive || !isProactiveWelcomeTime(new Date()) || !preferenceReady || !arrivalComplete || !serverConsentReady || !serverGreetingConsent || serverPrivate || serverSpeechQuiet || !greetingKey || !greetingEnabled || !audio.master || !audio.voice || audio.speechQuiet || greeted.current) return;
    greeted.current = true;
    void greet();
  }, [arrivalComplete, appActive, preferenceReady, serverConsentReady, serverGreetingConsent, serverPrivate, serverSpeechQuiet, greetingKey, greetingEnabled, foregroundEpoch, audio.master, audio.voice, audio.speechQuiet, greet]);
  const setGreeting = (enabled: boolean) => {
    if (!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting) return;
    const savedFor = greetingKey;
    setSavingGreeting(true);
    // Revocation is immediate locally; enabling never triggers speech before server acknowledgement.
    setGreetingEnabled(false);
    greeted.current = true;
    void (async () => {
      try {
        const response = await api('/api/guardian/core/workflows/rsf-fabric-sourcing/proactive-consent', {
          method: 'POST',
          body: JSON.stringify({ greetings: enabled, check_ins: serverCheckIns }),
        });
        if (!response.ok) throw new Error('Guardian consent could not be saved');
        if (activeGreetingKey.current !== savedFor) return;
        await AsyncStorage.setItem(savedFor, enabled ? 'enabled' : 'disabled');
        if (activeGreetingKey.current !== savedFor) return;
        setServerGreetingConsent(enabled);
        setGreetingEnabled(enabled);
        greeted.current = !enabled;
      } catch {
        if (activeGreetingKey.current !== savedFor) return;
        setServerConsentReady(false);
        setServerGreetingConsent(false);
        setGreetingEnabled(false);
        greeted.current = true;
        setGuardianMessage('Guardian could not verify consent. Automatic greeting remains off.');
      } finally {
        if (activeGreetingKey.current === savedFor) setSavingGreeting(false);
      }
    })();
  };
  const greetingActive = greetingEnabled && serverGreetingConsent && !serverPrivate && !serverSpeechQuiet;
  const companion = user?.companion === 'kaia' ? 'Kaia' : user?.companion === 'guardian' ? 'Guardian' : 'Atlas';
  useFocusEffect(useCallback(() => { setSelected(null); }, []));
  return <View style={s.root}>
    <LinearGradient colors={['#171A1E', '#030405', '#111418']} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}><View><Text style={s.brand}>STAARWAARDD</Text><Text style={s.micro}>YOUR CONNECTED UNIVERSE</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={s.icon}><Ionicons name="options-outline" size={22} color="#E4E8EE" /></Pressable></View>
        <View style={[s.stage, { height: stageHeight }]} onLayout={event => {
          const available = event.nativeEvent.layout.width;
          const target = Math.max(380, Math.min(560, available * 1.06));
          if (Math.abs(stageHeight - target) > 1) setStageHeight(target);
        }}>
          <Image source={require('@/assets/images/staarwardd/toronto-skyline-pan.png')} resizeMode="cover" style={s.skyline} />
          <AccessField />
          <View style={s.guardianFigure}><GuardianCharacter state={audio.voicePlaybackActive ? 'speaking' : guardianState} size={Math.min(width * 0.56, 285)} reducedMotion={motionReduced} onMotionEnd={onGuardianMotionEnd} /></View>
          <Animated.View style={[s.stageCopy, { opacity: arrival, transform: [{ translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }]}><Text style={s.micro}>{companion.toUpperCase()} · YOUR COMPANION</Text><Text style={s.title}>STAARWAARDD</Text><Text style={s.description}>{guardianMessage}</Text></Animated.View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Hear Guardian welcome" accessibilityHint="Plays only when Guardian voice is enabled and consent permits" disabled={guardianSpeaking} onPress={() => { void greet(); }} style={s.greetButton}><Ionicons name="volume-high-outline" size={18} color="#F1F3F7" /><Text style={s.greetLabel}>{audio.voicePlaybackActive ? 'GUARDIAN SPEAKING' : guardianSpeaking ? 'GUARDIAN PREPARING VOICE' : greetingError ? 'RETRY GUARDIAN VOICE' : 'HEAR GUARDIAN'}</Text></Pressable>
        <LinearGradient colors={['#BBC2CB', '#3A414A', '#8B949F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.frame}>
          <BlurView intensity={35} tint="dark" style={s.companion}>
            <View style={{ flex: 1, gap: 7 }}><Text style={s.panelTitle}>Speak with {companion}</Text><Text style={s.description}>Ask a question or continue a conversation. Recording requires a tap.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open conversation with ${companion}`} onPress={() => router.push('/chat')} style={s.primary}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#101317" /></Pressable>
          </BlurView>
        </LinearGradient>
        <View style={s.voiceRow}><View style={{ flex: 1 }}><Text style={s.panelTitle}>Guardian welcome</Text><Text style={s.description}>{!audio.master ? 'Enable master audio in settings to hear greetings.' : greetingEnabled ? 'Greets after arrival only with verified consent and during permitted hours.' : 'Automatic welcome off. Tap the microphone or chat to speak.'}</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: greetingActive }} accessibilityLabel="Proactive Guardian greeting" disabled={!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting || serverPrivate || serverSpeechQuiet} onPress={() => setGreeting(!greetingActive)} style={[s.toggle, greetingActive && s.toggleOn]}><Text style={[s.toggleText, greetingActive && s.toggleTextOn]}>{greetingActive ? 'ON' : 'OFF'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Silence Guardian" onPress={() => { voiceEpoch.current += 1; audio.setSpeechQuiet(true); audio.stopAll(); setGuardianSpeaking(false); setGuardianState('hover'); }} style={s.silence}><Ionicons name="volume-mute-outline" size={21} color="#F3F4F6" /></Pressable></View>
        <View style={s.section}><Text style={s.micro}>ENTER YOUR NINE WORLDS</Text><Text style={s.count}>09</Text></View>
        <View style={s.grid}>{WORLDS.map((world, index) => <Pressable key={world.id} accessibilityRole="button" accessibilityLabel={`Open ${world.name}`} disabled={selected !== null} onPress={() => { setSelected(world.id); router.push({ pathname: '/world/[id]', params: { id: world.id } } as never); }} style={({ pressed }) => [s.world, { width: portalSize, height: portalSize, borderRadius: portalSize / 2 }, pressed && s.pressed]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [index % 2 ? 4 : -4, index % 2 ? -4 : 4] }) }, { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.08] }) }] }]}><Image source={world.image} style={s.art} accessibilityLabel={`${world.name} approved portal artwork`} /></Animated.View>
          <Animated.View pointerEvents="none" style={[s.glassRing, { borderRadius: portalSize / 2, opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0.96] }), transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.035] }) }] }]} />
          <Animated.View pointerEvents="none" style={[s.glassSheen, {
            borderRadius: portalSize / 2,
            opacity: motionReduced ? 0.48 : drift.interpolate({ inputRange: [0, 1], outputRange: index % 2 ? [0.16, 0.55] : [0.55, 0.16] }),
            transform: [{ scale: motionReduced ? 1 : drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }],
          }]}>
            <LinearGradient colors={['rgba(255,255,255,.42)', 'rgba(223,234,247,.08)', 'rgba(240,245,255,.03)', 'rgba(225,235,250,.2)']} locations={[0, .24, .7, 1]} start={{ x: 0.08, y: 0.03 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[s.glassHighlight, {
            width: portalSize * .48, height: portalSize * .18, borderRadius: portalSize,
            opacity: motionReduced ? .42 : drift.interpolate({ inputRange: [0, 1], outputRange: [.25, .7] }),
            transform: [{ rotate: '-28deg' }]
          }]} />
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
  stage: { height: 380, overflow: 'hidden', marginVertical: 12, borderRadius: 26, borderWidth: 1, borderColor: '#747F8C' }, skyline: { position: 'absolute', width: '100%', height: '100%', opacity: 0.35 }, guardianFigure: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }, stageCopy: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(3,4,6,.78)', gap: 4 }, greetButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#7F8995', padding: 12, borderRadius: 20, marginBottom: 12 }, greetLabel: { color: '#F1F3F7', fontSize: 11, letterSpacing: 1.2, fontWeight: '700' }, title: { color: '#F1F3F7', fontSize: 28, lineHeight: 34, letterSpacing: -1.5, fontWeight: '600' }, description: { color: '#B3BCC9', fontSize: 13, lineHeight: 21 },
  frame: { borderRadius: 21, padding: 1 }, companion: { borderRadius: 20, overflow: 'hidden', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(10,13,17,.8)' }, panelTitle: { color: '#F1F3F6', fontSize: 18, fontWeight: '600' }, primary: { padding: 15, borderRadius: 18, backgroundColor: '#D4DAE2' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 18, borderColor: '#747B85', borderWidth: 1, backgroundColor: '#101318' }, toggle: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: '#AAB2BD' }, toggleOn: { backgroundColor: '#CFD5DF' }, toggleText: { color: '#F3F4F6', fontWeight: '800' }, toggleTextOn: { color: '#101317' }, silence: { padding: 10 }, glassRing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 3, borderColor: 'rgba(235,240,248,.72)', borderTopColor: 'rgba(255,255,255,.95)', borderBottomColor: 'rgba(125,135,149,.55)' },
  glassSheen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.38)' },
  glassHighlight: { position: 'absolute', top: '10%', left: '12%', backgroundColor: 'rgba(255,255,255,.22)' },
  section: { marginTop: 30, marginBottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, count: { color: '#858E9A', fontSize: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 },
  world: { overflow: 'hidden', borderWidth: 1, borderColor: '#DDE3EC', backgroundColor: '#12161B' }, art: { width: '100%', height: '100%', resizeMode: 'cover' }, worldTop: { position: 'absolute', top: 17, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' }, number: { color: '#E3E8EF', fontSize: 11, letterSpacing: 3 }, worldCopy: { position: 'absolute', bottom: 18, left: 20, right: 20, gap: 6 }, worldName: { color: '#F4F6F9', fontSize: 13, fontWeight: '600', letterSpacing: .3 }, worldDetail: { color: '#C0C8D2', fontSize: 9, lineHeight: 19 }, pressed: { opacity: .7 }, footer: { color: '#7F8996', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 30 },
});
