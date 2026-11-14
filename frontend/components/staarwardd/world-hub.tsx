import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuardianCharacter, type GuardianState } from './guardian-character';
import { WORLDS } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { SceneSurface } from './liquid/scene-surface';
import { HUB_CROP, HUB_MASTER, WORLD_ART } from '@/lib/staarwardd/world-art';
import { getHubLayout } from '@/lib/staarwardd/hub-layout';
import { observeSpeech } from '@/src/server-speech';

// Separate animated layers leave the actual hit target stationary and accessible.
function LiquidPortal({ index, size, reducedMotion, disabled, onPress }: { index: number; size: number; reducedMotion: boolean; disabled: boolean; onPress: () => void }) {
  const [phase] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reducedMotion) { phase.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 2200 + index * 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 2200 + index * 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [index, phase, reducedMotion]);
  const world = WORLDS[index];
  const art = WORLD_ART[world.id as keyof typeof WORLD_ART];
  return <Pressable accessibilityRole="button" accessibilityLabel={`Enter ${world.name}`} disabled={disabled} onPress={onPress} testID={`hub-portal-${world.id}`} style={({ pressed }) => [{ width: size, height: size + 26, alignItems: 'center', opacity: pressed ? .65 : 1 }]}>
    <Animated.View style={[s.bubble, { width: size, height: size, transform: [
      { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [-3, 4] }) },
      { scaleX: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
      { scaleY: phase.interpolate({ inputRange: [0, 1], outputRange: [1.035, 1] }) },
    ] }]}>
      <SceneSurface source={art.source} crop={art.crop} width={size} height={size} mode="bubble" moving={!reducedMotion} />
    </Animated.View>
    <Text numberOfLines={2} style={s.portalName}>{world.name}</Text>
  </Pressable>;
}

export function WorldHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { speak, stopAll, settingsReady, claimArrival, master, voice, speechQuiet, setSpeechQuiet, update, voiceNotice } = useStaarAudio();
  const { width, height } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width, height });
  const [stageHeight, setStageHeight] = useState(Math.max(180, height - 300));
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [selected, setSelected] = useState<string | null>(null);
  const [guardianState, setGuardianState] = useState<GuardianState>('flying');
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionReady, setMotionReady] = useState(false);
  const [greeting, setGreeting] = useState('');
  const greeted = useRef<string | null>(null);
  const companion = user?.companion === 'kaia' ? 'Kaia' : user?.companion === 'atlas' ? 'Atlas' : 'Guardian';
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) { setReducedMotion(value); setMotionReady(true); } }).catch(() => { if (mounted) setMotionReady(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', value => { setActive(value === 'active'); if (value !== 'active') stopAll(); });
    return () => { mounted = false; sub.remove(); app.remove(); };
  }, [stopAll]);
  useFocusEffect(useCallback(() => { setFocused(true); setSelected(null); return () => { setFocused(false); stopAll(); }; }, [stopAll]));
  useEffect(() => observeSpeech(state => { if (state === 'speaking') setGuardianState('speaking'); else if (state === 'idle' || state === 'failed') setGuardianState(current => current === 'speaking' ? 'hover' : current); }), []);
  useEffect(() => {
    if (!user || !focused || !active || !settingsReady || !motionReady || greeted.current === user.user_id) return;
    setGuardianState(reducedMotion ? 'hover' : 'flying');
    const timer = setTimeout(() => {
      greeted.current = user.user_id;
      if (!claimArrival()) { setGuardianState('hover'); return; }
      setGuardianState('hover');
      const line = `Welcome back${user.name?.trim() ? `, ${user.name.trim()}` : ''}. The field is awake. Where shall we begin?`;
      setGreeting(line);
      void speak(line);
    }, reducedMotion ? 0 : 1400);
    return () => clearTimeout(timer);
  }, [active, claimArrival, focused, motionReady, reducedMotion, settingsReady, speak, user]);

  const stageWidth = Math.min(width, 1000);
  const { size: bubble, centerX, centerY, guardianSize, portals } = getHubLayout(stageWidth, stageHeight);
  const muted = !master || !voice || speechQuiet;
  return <View style={s.root} onLayout={event => setViewport(event.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><SceneSurface source={HUB_MASTER} crop={HUB_CROP} width={viewport.width} height={viewport.height} mode="background" moving={!reducedMotion && focused && active} /></View>
    <LinearGradient colors={['rgba(0,0,0,.3)', 'rgba(0,0,0,.12)', 'rgba(0,0,0,.8)']} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={s.safe}>
      <View style={s.header}><View><Text style={s.brand}>STAARWAARDD</Text><Text style={s.micro}>YOUR CONNECTED UNIVERSE</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={s.control}><Ionicons name="options-outline" size={22} color="#F5F6FA" /></Pressable></View>
      <View testID="liquid-portal-universe" onLayout={event => setStageHeight(event.nativeEvent.layout.height)} style={{ width: stageWidth, flex: 1, minHeight: width > height ? 160 : 300, alignSelf: 'center' }}>
        <View pointerEvents="none" style={[s.platform, { width: guardianSize * 1.3, left: centerX - guardianSize * .65, top: centerY + guardianSize * .47 }]} />
        <View pointerEvents="none" style={{ position: 'absolute', left: centerX - guardianSize / 2, top: centerY - guardianSize * .63 }}>
          <GuardianCharacter state={guardianState} size={guardianSize} reducedMotion={reducedMotion || !focused || !active} />
        </View>
        {WORLDS.map((world, index) => {
          return <View key={world.id} style={{ position: 'absolute', ...portals[index] }}>
            <LiquidPortal index={index} size={bubble} reducedMotion={reducedMotion || !focused || !active} disabled={selected !== null} onPress={() => { setSelected(world.id); stopAll(); router.push({ pathname: '/world/[id]', params: { id: world.id } } as never); }} />
          </View>;
        })}
      </View>
      <BlurView intensity={35} tint="dark" style={s.dock}>
        <Text style={s.presence}>{companion.toUpperCase()} · {guardianState === 'speaking' ? 'SPEAKING' : 'WITH YOU'}</Text>
        <Text accessibilityLiveRegion="polite" numberOfLines={3} style={s.greeting}>{voiceNotice || greeting || 'Your worlds are ready.'}</Text>
        <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Resume spoken replies' : 'Silence companion'} onPress={() => { if (muted) { update({ master: true, voice: true }); setSpeechQuiet(false); } else setSpeechQuiet(true); }} style={s.control}><Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={22} color="#F5F6FA" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open phone microphone conversation" onPress={() => router.push('/chat')} style={s.talk}><Ionicons name="mic-outline" size={21} color="#F5F6FA" /><Text style={s.talkText}>Talk with {companion}</Text></Pressable>
        </View>
      </BlurView>
    </SafeAreaView>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030405' }, safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#F4F5F9', fontSize: 18, letterSpacing: 3, fontWeight: '700' }, micro: { color: '#CED2DB', fontSize: 9, letterSpacing: 2, marginTop: 5 },
  control: { padding: 12, borderRadius: 25, borderWidth: 1, borderColor: '#AEB5C066', backgroundColor: '#08090D55', minWidth: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 999, overflow: 'visible', backgroundColor: 'transparent', shadowColor: '#FFFFFF', shadowOpacity: .28, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  portalName: { color: '#F4F6FA', fontSize: 10, lineHeight: 13, fontWeight: '600', textAlign: 'center', marginTop: 6, textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  platform: { position: 'absolute', height: 32, borderRadius: 999, borderWidth: 2, borderColor: '#EAF0F9AA', backgroundColor: '#C4CFDD22', transform: [{ scaleY: .6 }] },
  dock: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#DAE0EC55', backgroundColor: '#06080C99', gap: 6 },
  presence: { color: '#CCD3DE', fontSize: 9, letterSpacing: 2 }, greeting: { color: '#F4F6FA', fontSize: 12, lineHeight: 17 }, actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  talk: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, minHeight: 46, borderRadius: 24, backgroundColor: '#B8C4D522', borderWidth: 1, borderColor: '#E5EBF755' }, talkText: { color: '#F4F6FA', fontSize: 13 },
});
