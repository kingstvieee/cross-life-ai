import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorldScene } from './world-scene';
import { WORLDS } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { accountStorageKey } from '@/src/account-storage';
import { isProactiveWelcomeTime } from '@/src/guardian-greeting-policy';

const lockedPortalArtwork = {
  home: require('@/assets/images/staarwardd/locked/home.png'),
  work: require('@/assets/images/staarwardd/locked/work.png'),
  creativity: require('@/assets/images/staarwardd/locked/creativity.png'),
  wellbeing: require('@/assets/images/staarwardd/locked/wellbeing.png'),
  relationships: require('@/assets/images/staarwardd/locked/love.png'),
  events: require('@/assets/images/staarwardd/locked/events.png'),
  style: require('@/assets/images/staarwardd/locked/style.png'),
  staarverse: require('@/assets/images/staarwardd/locked/staarverse.png'),
  staarsonic: require('@/assets/images/staarwardd/locked/staarsonic.png'),
};

export function WorldHub() {
  const router = useRouter();
  const { user, api } = useAuth();
  const audio = useStaarAudio();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeHeight = height - insets.top - insets.bottom;
  const compact = safeHeight < 540;
  const [message, setGuardianMessage] = useState('');
  const [modelAvailable, setModelAvailable] = useState(false);
  const [guardianSpeaking, setGuardianSpeaking] = useState(false);
  const widthLimit = Math.floor((Math.min(850, width - insets.left - insets.right) - 40) / 5);
  const heightLimit = Math.floor((safeHeight - (compact ? 178 : 244)) / 3);
  const portalSize = Math.min(widthLimit, Math.max(30, heightLimit), 116);
  const drift = useRef(new Animated.Value(0)).current;
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
  const [reduceMotion, setMotionReduced] = useState<boolean | null>(null);
  const motionReduced = reduceMotion ?? true;
  const [arrivalComplete, setArrivalComplete] = useState(false);
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
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setMotionReduced(value); }).catch(() => { if (alive) setMotionReduced(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setMotionReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    drift.setValue(0);
    if (motionReduced) return;
    const cycle = (toValue: number) => Animated.timing(drift, {
      toValue, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false,
    });
    const loop = Animated.loop(Animated.sequence([cycle(1), cycle(0)]));
    loop.start();
    return () => loop.stop();
  }, [drift, motionReduced]);
  const onGuardianModelReady = useCallback(() => setModelAvailable(true), []);
  const onGuardianArrival = useCallback(() => setArrivalComplete(true), []);
  const onGuardianUnavailable = useCallback(() => {
    setModelAvailable(false);
    setArrivalComplete(false);
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
    setGuardianSpeaking(true);
    setGuardianMessage('Welcome back. Your nine worlds are ready.');
    try {
      const spoken = await audio.speak('Welcome back. Guardian is here. Your nine worlds are ready when you are.', undefined, 'guardian');
      if (!spoken && focused.current && epoch === voiceEpoch.current) {
        setGuardianMessage('Guardian voice playback is unavailable. Continue in chat.');
      }
    } catch {
      if (focused.current && epoch === voiceEpoch.current) {
        setGuardianMessage('Voice playback failed. Text chat remains available.');
      }
    } finally {
      if (focused.current && epoch === voiceEpoch.current) {
        setGuardianSpeaking(false);
      }
    }
  }, [audio.master, audio.voice, audio.speechQuiet, audio.speak]);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; voiceEpoch.current += 1; setGuardianSpeaking(false); }; }, []));
  useEffect(() => {
    if (!focused.current || !appActive || !isProactiveWelcomeTime(new Date()) || !preferenceReady || !modelAvailable || !arrivalComplete || !serverConsentReady || !serverGreetingConsent || serverPrivate || serverSpeechQuiet || !greetingKey || !greetingEnabled || !audio.master || !audio.voice || audio.speechQuiet || greeted.current) return;
    greeted.current = true;
    void greet();
  }, [arrivalComplete, modelAvailable, appActive, preferenceReady, serverConsentReady, serverGreetingConsent, serverPrivate, serverSpeechQuiet, greetingKey, greetingEnabled, foregroundEpoch, audio.master, audio.voice, audio.speechQuiet, greet]);
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
  const navigationLocked = useRef(false);
  useFocusEffect(useCallback(() => { navigationLocked.current = false; }, []));
  const openPortal = (world: string) => {
    if (navigationLocked.current) return;
    navigationLocked.current = true;
    router.push({ pathname: '/environment', params: { world } } as never);
  };
  const ignoreSceneAction = useCallback(() => undefined, []);
  const renderPortal = (world: (typeof WORLDS)[number], index: number) => (
    <Animated.View key={world.id} style={[s.portal, {
      width: portalSize,
      transform: [{ translateY: drift.interpolate({
        inputRange: [0, 1], outputRange: index % 2 ? [2, -4] : [-4, 2],
      }) }],
    }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={world.name}
        onPress={() => openPortal(world.id)} style={({ pressed }) => [s.portalButton, pressed && s.pressed]}>
        <LinearGradient colors={['#F9FBFF', '#606777', '#E6C98A', '#222633', '#F9FBFF']} style={[
          s.rim, { width: portalSize, height: portalSize },
        ]}>
          <View style={s.glass}>
            <Image source={lockedPortalArtwork[world.id]} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
              opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [.35, .78] }),
            }]}>
              <LinearGradient colors={['#FFFFFFB0', '#FFFFFF00', '#DCE8FF18', '#FDF0CAB0']}
                locations={[0, .3, .67, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </LinearGradient>
        <Text style={s.portalName}>{world.name}</Text>
      </Pressable>
    </Animated.View>
  );
  return (
    <View style={s.root}>
      <LinearGradient colors={['#080A13', '#020204', '#10101A', '#020204']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: 40 }, (_, index) => (
          <Animated.View key={index} style={[s.star, {
            left: `${(index * 53 + 7) % 100}%`,
            top: `${(index * 29 + 13) % 100}%`,
            opacity: drift.interpolate({ inputRange: [0, 1], outputRange: index % 2 ? [.25, .85] : [.8, .25] }),
          }]} />
        ))}
        <Image source={require('@/assets/images/staarwardd/toronto-skyline-pan.png')} style={s.skyline} resizeMode="cover" />
      </View>
      <SafeAreaView style={[s.safe, compact && s.safeCompact]}>
        <View style={[s.header, compact && s.headerCompact]}>
          <Text accessibilityRole="header" style={s.brand}>STAARWAARDD</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={s.icon}>
            <Ionicons name="options-outline" size={23} color="#F4F0E6" />
          </Pressable>
        </View>
        <View style={s.topPortals}>{WORLDS.slice(0, 5).map(renderPortal)}</View>
        <View style={s.chamber}>
          <View style={s.platform} pointerEvents="none" importantForAccessibility="no-hide-descendants">
            <LinearGradient colors={['#14151E', '#BBC2CD', '#1E202A', '#0C0C12']} style={s.plinth} />
            {reduceMotion !== null && <WorldScene world="hub" embedded guardianPresentation onAction={ignoreSceneAction}
              onGuardianModelReady={onGuardianModelReady} onGuardianArrival={onGuardianArrival}
              onGuardianUnavailable={onGuardianUnavailable} reduceGuardianMotion={motionReduced} />}
          </View>
          <View style={s.sidePortals}>{WORLDS.slice(5, 7).map(renderPortal)}</View>
          <View style={s.sidePortals}>{WORLDS.slice(7).map(renderPortal)}</View>
        </View>
        <View style={s.controls}>
          {!!message && <Text accessibilityLiveRegion="polite" numberOfLines={2} style={s.message}>{message}</Text>}
          <View style={s.controlRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={audio.voicePlaybackActive ? 'Guardian speaking' : guardianSpeaking ? 'Preparing Guardian voice' : 'Hear Guardian welcome'} disabled={guardianSpeaking || audio.voicePlaybackActive}
              onPress={() => { void greet(); }} style={s.icon}><Ionicons name="volume-high-outline" size={22} color="#F4F0E6" /></Pressable>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: greetingActive }}
              accessibilityLabel="Automatic Guardian greeting"
              disabled={!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting || serverPrivate || serverSpeechQuiet}
              onPress={() => setGreeting(!greetingActive)} style={s.icon}>
              <Ionicons name={greetingActive ? 'sparkles' : 'sparkles-outline'} size={22} color={greetingActive ? '#F4DA9F' : '#D5D9E2'} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Silence Guardian" onPress={() => {
              voiceEpoch.current += 1;
              audio.setSpeechQuiet(true);
              audio.stopAll();
              setGuardianSpeaking(false);
            }} style={s.icon}><Ionicons name="volume-mute-outline" size={22} color="#F4F0E6" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Life Map and Guardian controls"
              onPress={() => router.push('/guardian-tools')} style={s.icon}><Ionicons name="compass-outline" size={22} color="#F4F0E6" /></Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#030305' },
  safe: { flex: 1, width: '100%', maxWidth: 850, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: 100 },
  safeCompact: { paddingBottom: 66 },
  headerCompact: { minHeight: 46, marginBottom: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, marginBottom: 12 },
  brand: { fontSize: 22, fontWeight: '800', letterSpacing: 3, color: '#FAF8F2' },
  icon: { width: 46, height: 46, borderWidth: 1, borderColor: '#A6997F', borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15151DDB' },
  star: { position: 'absolute', backgroundColor: '#F3EEFF', width: 2, height: 2, borderRadius: 1 },
  skyline: { position: 'absolute', top: '31%', width: '100%', height: '34%', opacity: .68 },
  topPortals: { flexDirection: 'row', justifyContent: 'space-between' },
  chamber: { flex: 1, flexDirection: 'row', minHeight: 0, justifyContent: 'space-between', alignItems: 'stretch' },
  sidePortals: { justifyContent: 'space-evenly' },
  platform: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  plinth: { position: 'absolute', bottom: '8%', left: '25%', right: '25%', height: '15%', borderRadius: 200, borderColor: '#E2C98F', borderWidth: 2 },
  portal: { marginVertical: 4 },
  portalButton: { alignItems: 'center', minHeight: 44 },
  rim: { borderRadius: 999, padding: 3 },
  glass: { flex: 1, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#FAF8F1' },
  pressed: { opacity: .7, transform: [{ scale: .96 }] },
  portalName: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 4, textShadowColor: '#000', textShadowRadius: 5 },
  controls: { alignItems: 'center', gap: 6, paddingTop: 6 },
  controlRow: { flexDirection: 'row', gap: 12 },
  message: { color: '#F4F0E6', textAlign: 'center', fontSize: 12, backgroundColor: '#0C0C12E8', padding: 5 },
});
