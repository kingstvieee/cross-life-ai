/* eslint-disable react-hooks/set-state-in-effect -- Immediate revocation on account changes is required to fail closed for proactive voice. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WORLDS } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { accountStorageKey } from '@/src/account-storage';
import { isProactiveWelcomeTime } from '@/src/guardian-greeting-policy';
import { WorldScene } from './world-scene';
import { hasIdentityApprovedGuardian3D } from '@/generated/world-runtime';

export function WorldHub() {
  const router = useRouter();
  const { user, api } = useAuth();
  const audio = useStaarAudio();
  const { width } = useWindowDimensions();
  const isPhonePortrait = width < 600;
  const [selected, setSelected] = useState<string | null>(null);
  const [worldPickerOpen, setWorldPickerOpen] = useState(false);
  const [portalGlow] = useState(() => new Animated.Value(0));
  const [guardianMessage, setGuardianMessage] = useState('Guardian standing by.');
  const [greetingError, setGreetingError] = useState(false);
  const [guardianSpeaking, setGuardianSpeaking] = useState(false);
  const [drift] = useState(() => new Animated.Value(0));
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const greetingKey = user && !user.is_demo ? accountStorageKey('staarwardd.guardian.proactive-greeting.v2', user.user_id) : null;
  const greeted = useRef(false);
  const voiceEpoch = useRef(0);
  const activeGreetingKey = useRef<string | null>(null);
  useEffect(() => { activeGreetingKey.current = greetingKey; }, [greetingKey]);
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
    drift.stopAnimation();
    if (motionReduced) { drift.setValue(0); return; }
    drift.setValue(0);
    const loop = Animated.loop(Animated.sequence([Animated.timing(drift, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(drift, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => { loop.stop(); };
  }, [drift, motionReduced]);
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
    setGuardianMessage('Welcome back. Your connected worlds are ready.');
    try {
      setGreetingError(false);
      const spoken = await audio.speak('Welcome back. Guardian is here. Your connected worlds are ready when you are.');
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
      }
    }
  // Restrict re-creation to the primitive voice gates and the speech callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.master, audio.voice, audio.speechQuiet, audio.speak]);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; voiceEpoch.current += 1; }; }, []));
  useEffect(() => {
    if (!focused.current || !appActive || !isProactiveWelcomeTime(new Date()) || !preferenceReady || !serverConsentReady || !serverGreetingConsent || serverPrivate || serverSpeechQuiet || !greetingKey || !greetingEnabled || !audio.master || !audio.voice || audio.speechQuiet || greeted.current) return;
    greeted.current = true;
    void greet();
  }, [appActive, preferenceReady, serverConsentReady, serverGreetingConsent, serverPrivate, serverSpeechQuiet, greetingKey, greetingEnabled, foregroundEpoch, audio.master, audio.voice, audio.speechQuiet, greet]);
  const setGreeting = (enabled: boolean) => {
    if (!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting) return;
    // A direct call may not override private mode or the speech-quiet preference.
    if (serverPrivate || serverSpeechQuiet) return;
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
  // The Hub is a fixed immersive viewport. Navigation happens inside overlays,
  // never by vertically scrolling the homepage or stretching the approved art.
  // Keep labelled portal outlines gently alive without animating or altering locked artwork.
  useEffect(() => {
    if (motionReduced || !appActive || worldPickerOpen) { portalGlow.stopAnimation(); portalGlow.setValue(0); return; }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(portalGlow, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(portalGlow, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [motionReduced, appActive, worldPickerOpen, portalGlow]);
  const openWorld = (id: string) => {
    setSelected(id);
    setWorldPickerOpen(false);
    router.push({ pathname: '/environment', params: { world: id } } as never);
  };
  // Hitboxes follow the nine doors ACTUALLY painted in locked/homepage.png (1672 x 941).
  // Do not stretch/crop the master: a portrait viewport otherwise hides the outer doors.
  const hotspots = [
    { id: 'home',          x: 0.195, y: 0.410, label: 'STAAR HUB' },
    { id: 'work',          x: 0.355, y: 0.410, label: 'STAAR WORK' },
    { id: 'creativity',    x: 0.505, y: 0.410, label: 'STAAR DREAMS' },
    { id: 'wellbeing',     x: 0.664, y: 0.410, label: 'STAAR HEALTH' },
    { id: 'relationships', x: 0.824, y: 0.410, label: 'STAAR LOVE' },
    { id: 'events',        x: 0.195, y: 0.730, label: 'STAAR COMMUNITY' },
    { id: 'style',         x: 0.355, y: 0.730, label: 'STAAR STYLE' },
    { id: 'staarverse',    x: 0.688, y: 0.730, label: 'STARVERSE' },
    { id: 'staarsonic',    x: 0.850, y: 0.730, label: 'STAARSONIC' },
  ];
  
  return <View style={s.root}>
    {/* Ambient crop is decorative only; the full-resolution approved master is visible below. */}
    <Image source={require('@/assets/images/staarwardd/locked/homepage.png')} resizeMode="cover" style={s.fullWorld} accessibilityLabel="STAARWAARDD chrome portal-world ambience" />
    <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,.64)', 'rgba(0,0,0,.7)', 'rgba(0,0,0,.92)']} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={s.fixedSafe} edges={['top','bottom']}>
      <View style={s.topBar}>
        <View style={s.brandBlock}><Text style={[s.brand, isPhonePortrait && s.brandPhone]} adjustsFontSizeToFit minimumFontScale={.65} numberOfLines={1}>STAARWAARDD</Text><Text style={s.micro} numberOfLines={1}>YOUR CONNECTED UNIVERSE</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={s.roundControl}><Ionicons name="settings-outline" size={21} color="#F3F6FB" /></Pressable>
      </View>
      <View style={s.portalField}>
        {hasIdentityApprovedGuardian3D
          ? <View style={s.liveWorldStage}>
              <WorldScene world="hub" onAction={action => {
                if (action.startsWith('world:')) openWorld(action.slice(6));
              }} />
            </View>
          : <View style={s.portalScene} accessible={false}>
          <Image source={require('@/assets/images/staarwardd/locked/homepage.png')} resizeMode="contain" style={s.sceneArt} accessibilityLabel="Full approved STAARWAARDD portal hub with all nine doorways" />
          {/* Transparent tappable doors preserve the original picture's titles rather than replacing them. */}
          {hotspots.map(portal => <Pressable key={portal.id} accessibilityRole="button" accessibilityLabel={`Enter ${portal.label}`} disabled={selected !== null} onPress={() => openWorld(portal.id)}
              style={[s.portalHotspot, { left: `${(portal.x-.075)*100}%`, top: `${(portal.y-.13)*100}%`, width: '15%', height: '26%' }]}>
            <Animated.View pointerEvents="none" style={[s.portalGlow, { opacity: portalGlow.interpolate({ inputRange: [0, 1], outputRange: [0, .45] }) }]} />
          </Pressable>)}
        </View>}
        <Pressable accessibilityRole="button" accessibilityLabel="Explore all nine portal worlds in large immersive cards" onPress={() => setWorldPickerOpen(true)} style={s.portalSceneCallout}>
          <Ionicons name="planet-outline" color="#F4D595" size={19}/>
          <Text style={s.portalSceneCalloutText}>EXPLORE ALL 9 PORTALS</Text>
          <Ionicons name="chevron-forward" size={18} color="#E8D6B2"/>
        </Pressable>
        <Text style={s.guardianNotice} numberOfLines={2}>{hasIdentityApprovedGuardian3D
          ? 'GUARDIAN · LIVE 3D PRESENCE'
          : 'GUARDIAN 3D IDENTITY VERIFICATION PENDING · PORTALS REMAIN ACCESSIBLE'}</Text>
      </View>
      <View style={s.fixedDock}>
        <View style={s.statusRow}><View style={s.statusCopy}><Text style={s.micro}>{audio.voicePlaybackActive ? 'GUARDIAN SPEAKING' : guardianSpeaking ? 'GUARDIAN PREPARING VOICE' : companion.toUpperCase() + ' · YOUR COMPANION'}</Text><Text style={s.dockTitle} numberOfLines={1}>{guardianMessage}</Text>{greetingError && <Text style={s.micro} numberOfLines={1}>Voice unavailable · text chat ready</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="Hear Guardian" disabled={guardianSpeaking} onPress={() => { void greet(); }} style={s.roundControl}><Ionicons name="volume-high-outline" size={22} color="#F4F7FC" /></Pressable></View>
        <View style={s.actionRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open all immersive worlds" onPress={() => setWorldPickerOpen(true)} style={s.dockAction}><Ionicons name="planet-outline" size={20} color="#F4F7FC" /><Text style={s.actionLabel}>WORLDS</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Speak with ${companion}`} onPress={() => router.push('/chat')} style={s.dockAction}><Ionicons name="chatbubble-ellipses-outline" size={20} color="#F4F7FC" /><Text style={s.actionLabel}>{companion.toUpperCase()}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Guardian controls" onPress={() => router.push('/guardian-tools')} style={s.dockAction}><Ionicons name="shield-checkmark-outline" size={20} color="#F4F7FC" /><Text style={s.actionLabel}>GUARDIAN</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mute Guardian" onPress={() => { voiceEpoch.current += 1; audio.setSpeechQuiet(true); audio.stopAll(); setGuardianSpeaking(false); }} style={s.roundControl}><Ionicons name="volume-mute-outline" size={21} color="#F4F7FC" /></Pressable>
        </View>
      </View>
      {worldPickerOpen && <View style={s.pickerBackdrop}>
        <View style={s.pickerPanel}>
          <View style={s.pickerHeader}><Text style={s.pickerTitle}>CHOOSE YOUR WORLD</Text><Pressable accessibilityRole="button" accessibilityLabel="Close world selector" onPress={() => setWorldPickerOpen(false)} style={s.roundControl}><Ionicons name="close" size={22} color="#FFFFFF" /></Pressable></View>
          <Pressable accessibilityRole="switch" accessibilityLabel="Automatic Guardian greetings"
            accessibilityHint="Requires verified permission and is unavailable in private or speech-quiet mode"
            accessibilityState={{ checked: greetingActive }}
            disabled={!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting || serverPrivate || serverSpeechQuiet}
            onPress={() => setGreeting(!greetingActive)}
            style={{ borderColor: '#5E6B83', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10,
              opacity: !greetingKey || !preferenceReady || !serverConsentReady || savingGreeting || serverPrivate || serverSpeechQuiet ? .5 : 1,
              backgroundColor: '#152032', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#F0F4F9', fontWeight: '700' }}>AUTOMATIC GUARDIAN GREETINGS</Text>
            <Text style={{ color: '#B0E1ED', fontWeight: '800' }}>{greetingActive ? 'ON' : 'OFF'}</Text>
          </Pressable>
          <ScrollView style={s.pickerScroll} contentContainerStyle={s.pickerGrid} showsVerticalScrollIndicator={false}>
            {WORLDS.map(world => <Pressable key={world.id} accessibilityRole="button" accessibilityLabel={`Enter ${world.name}`} onPress={() => openWorld(world.id)} style={s.pickerWorld}><Image source={world.image} style={s.pickerArt} /><Text style={s.pickerWorldLabel} numberOfLines={1}>{world.name}</Text></Pressable>)}
            <Pressable accessibilityRole="button" accessibilityLabel="Enter DIGGITSTAAR business command centre" onPress={() => { setWorldPickerOpen(false); router.push('/diggitstaar'); }} style={s.pickerWorld}>
              <View style={[s.pickerArt, { backgroundColor: '#101C2E', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D9BE86' }]}><Ionicons name="sparkles-outline" size={42} color="#E6D3A4" /><Text style={{ color: '#E6D3A4', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 8 }}>DIGGITSTAAR</Text></View>
              <Text style={s.pickerWorldLabel}>DIGGITSTAAR · STUDIO</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Explore STAAR Love Singles Lounge" onPress={() => { setWorldPickerOpen(false); router.push({ pathname: '/environment', params: { world: 'relationships', variant: 'singles' } } as never); }} style={s.pickerWorld}><Image source={require('@/assets/images/staarwardd/locked/love-singles.png')} style={s.pickerArt} /><Text style={s.pickerWorldLabel}>SINGLES LOUNGE</Text></Pressable>
          </ScrollView>
        </View>
      </View>}
    </SafeAreaView>
  </View>;
}
const s = StyleSheet.create({
  fullWorld: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', opacity: .28 },
  fixedSafe: { flex: 1, justifyContent: 'space-between' },
  topBar: { paddingHorizontal: 18, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  brandBlock: { flex: 1, minWidth: 0 },
  brandPhone: { fontSize: 15, letterSpacing: 2 },
  portalField: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, gap: 14 },
  liveWorldStage: { width: '100%', flex: 1, minHeight: 390, borderRadius: 15, overflow: 'hidden' },
  portalScene: { width: '100%', maxWidth: 940, aspectRatio: 1672 / 941, alignSelf: 'center', position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(210,224,248,.45)', borderRadius: 15, backgroundColor: '#030407' },
  sceneArt: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  portalSceneCallout: { minHeight: 50, paddingHorizontal: 18, borderWidth: 1, borderColor: '#D8C08A', backgroundColor: 'rgba(2,7,20,.9)', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  portalSceneCalloutText: { color: '#FFF1C7', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  guardianNotice: { color: '#C0CCD8', fontSize: 11, textAlign: 'center', maxWidth: 340, lineHeight: 15 },
  portalHotspot: { position: 'absolute', borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  portalGlow: { ...StyleSheet.absoluteFill, borderRadius: 26, borderWidth: 1, borderColor: '#DCEAFF', backgroundColor: 'rgba(115,150,225,.08)' },
  fixedDock: { marginHorizontal: 10, marginBottom: 5, padding: 10, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(222,230,242,.55)', backgroundColor: 'rgba(4,7,12,.9)', gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusCopy: { flex: 1 },
  dockTitle: { color: '#F3F6FA', fontSize: 15, fontWeight: '600', marginTop: 3 },
  roundControl: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(235,242,255,.5)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,14,20,.56)' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dockAction: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(215,226,242,.3)' },
  actionLabel: { color: '#F4F7FC', fontSize: 10, fontWeight: '700', letterSpacing: .4 },
  pickerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.85)', justifyContent: 'center', padding: 14 },
  pickerPanel: { flex: 1, maxHeight: 650, backgroundColor: '#0B0F16', borderColor: '#A8B5C8', borderWidth: 1, borderRadius: 22, padding: 14 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerTitle: { color: '#F4F7FC', fontSize: 17, fontWeight: '700', letterSpacing: 1.5 },
  pickerScroll: { flex: 1 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingBottom: 12 },
  pickerWorld: { width: '47%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#19202A' },
  pickerArt: { width: '100%', height: 120, resizeMode: 'cover' },
  pickerWorldLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', padding: 10 },
  root: { flex: 1, backgroundColor: '#030405' }, safe: { flex: 1 }, content: { padding: 22, paddingBottom: 38, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, brand: { color: '#F3F5F8', fontSize: 18, letterSpacing: 4, fontWeight: '700' }, micro: { color: '#B2BAC5', fontSize: 10, letterSpacing: 2, lineHeight: 17 }, icon: { padding: 12, borderWidth: 1, borderColor: '#4D555F', borderRadius: 16 },
  stage: { height: 380, overflow: 'hidden', marginVertical: 12, borderRadius: 26, borderWidth: 1, borderColor: '#747F8C' }, skyline: { position: 'absolute', width: '100%', height: '100%', opacity: 1 }, guardianFigure: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }, stageCopy: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(3,4,6,.85)', gap: 4 }, greetButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#7F8995', padding: 12, borderRadius: 20, marginBottom: 12 }, greetLabel: { color: '#F1F3F7', fontSize: 11, letterSpacing: 1.2, fontWeight: '700' }, title: { color: '#F1F3F7', fontSize: 28, lineHeight: 34, letterSpacing: -1.5, fontWeight: '600' }, description: { color: '#B3BCC9', fontSize: 13, lineHeight: 21 },
  frame: { borderRadius: 21, padding: 1 }, companion: { borderRadius: 20, overflow: 'hidden', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(10,13,17,.8)' }, panelTitle: { color: '#F1F3F6', fontSize: 18, fontWeight: '600' }, primary: { padding: 15, borderRadius: 18, backgroundColor: '#D4DAE2' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 18, borderColor: '#747B85', borderWidth: 1, backgroundColor: '#101318' }, toggle: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: '#AAB2BD' }, toggleOn: { backgroundColor: '#CFD5DF' }, toggleText: { color: '#F3F4F6', fontWeight: '800' }, toggleTextOn: { color: '#101317' }, silence: { padding: 10 }, glassRing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 3, borderColor: 'rgba(235,240,248,.72)', borderTopColor: 'rgba(255,255,255,.95)', borderBottomColor: 'rgba(125,135,149,.55)' },
  glassSheen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.38)' },
  glassHighlight: { position: 'absolute', top: '10%', left: '12%', backgroundColor: 'rgba(255,255,255,.22)' },
  section: { marginTop: 30, marginBottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, count: { color: '#858E9A', fontSize: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  singlesCard: { height: 220, overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: '#A9B7CA', marginTop: 16, justifyContent: 'flex-end' }, singlesCopy: { padding: 20, gap: 8 },
  world: { overflow: 'hidden', borderWidth: 1, borderColor: '#A9B7CA', backgroundColor: '#12161B' }, art: { width: '100%', height: '100%', resizeMode: 'cover' }, worldTop: { position: 'absolute', top: 17, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' }, number: { color: '#E3E8EF', fontSize: 11, letterSpacing: 3 }, worldCopy: { position: 'absolute', bottom: 18, left: 20, right: 20, gap: 6 }, worldName: { color: '#F4F6F9', fontSize: 17, fontWeight: '600', letterSpacing: .3 }, worldDetail: { color: '#C0C8D2', fontSize: 9, lineHeight: 19 }, pressed: { opacity: .7 }, footer: { color: '#7F8996', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 30 },
});

// Fixed-screen presentation: the only vertical scrolling is inside the optional world picker.
