import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WORLD_BY_ID, worldConversation } from '@/lib/staarwardd/world-directory';
import { WORLD_ART } from '@/lib/staarwardd/world-art';
import { SceneSurface } from '@/components/staarwardd/liquid/scene-surface';
import { useAuth } from '@/src/auth';

export default function WorldScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [motion, setMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(false);
  const panorama = useRef<ScrollView>(null);
  const world = WORLD_BY_ID[id];
  const art = WORLD_ART[id as keyof typeof WORLD_ART];
  const asset = art ? Asset.fromModule(art.source) : null;
  const aspect = art && asset?.width && asset.height ? asset.width * art.crop[2] / (asset.height * art.crop[3]) : 16/9;
  const sceneWidth = Math.max(width, height*aspect);
  const companion = user?.companion === 'kaia' ? 'Kaia' : user?.companion === 'atlas' ? 'Atlas' : 'Guardian';
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setMotion(!value); }).catch(() => {});
    const change = AccessibilityInfo.addEventListener('reduceMotionChanged', value => setMotion(!value));
    const app = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; change.remove(); app.remove(); };
  }, []);
  useEffect(() => { panorama.current?.scrollTo({ x: (sceneWidth-width)/2, animated: false }); }, [id,sceneWidth,width]);
  return <View style={s.root} testID={`world-scene-${id}`}>
    {world && art && <ScrollView ref={panorama} horizontal showsHorizontalScrollIndicator={false} bounces={false} contentOffset={{ x: (sceneWidth-width)/2, y: 0 }} style={StyleSheet.absoluteFill} accessibilityLabel={`${world.name} panorama. Swipe to explore the environment.`}>
      <SceneSurface source={art.source} crop={art.crop} width={sceneWidth} height={height} mode="world" moving={motion && active && focused} />
    </ScrollView>}
    <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,.75)','transparent','transparent','rgba(0,0,0,.85)']} locations={[0,.2,.65,1]} style={StyleSheet.absoluteFill} />
    <SafeAreaView pointerEvents="box-none" style={s.safe}>
      <View style={s.header} pointerEvents="box-none"><Pressable accessibilityRole="button" accessibilityLabel="Back to all worlds" onPress={() => router.canGoBack() ? router.back() : router.replace('/hub')} style={s.round}><Ionicons name="arrow-back" color="#F4F6FA" size={22} /></Pressable><View style={{ flex: 1 }}><Text style={s.brand}>STAARWAARDD</Text><Text style={s.title}>{world?.name || 'World unavailable'}</Text></View></View>
      <View style={{ flex: 1 }} pointerEvents="none" />
      <BlurView intensity={35} tint="dark" style={s.dock}>
        <View style={s.dockRow}><View style={{ flex: 1 }}><Text style={s.presence}>{companion.toUpperCase()} · WITH YOU</Text><Text style={s.hint}>Swipe to look around · environment preview</Text></View><Pressable accessibilityRole="button" accessibilityLabel={toolsOpen ? 'Close world tools' : 'Explore world tools'} accessibilityState={{ expanded: toolsOpen }} onPress={() => setToolsOpen(value => !value)} style={s.round}><Ionicons name={toolsOpen ? 'close' : 'grid-outline'} color="#F4F6FA" size={22} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Talk with ${companion} in ${world?.name || 'this world'}`} onPress={() => router.push({ pathname: '/chat', params: { portal: id === 'staarsonic' || id === 'staarverse' ? undefined : id } } as never)} style={s.round}><Ionicons name="mic-outline" color="#F4F6FA" size={22} /></Pressable></View>
        {world && toolsOpen && <ScrollView style={{ maxHeight: Math.min(320,height*.45) }} contentContainerStyle={{ gap: 10, paddingTop: 12 }}>
          <Text style={s.prompt}>{world.title}</Text>
          {world.choices.map(choice => <Pressable key={choice} accessibilityRole="button" onPress={() => { const conversation = worldConversation(id,choice); if (conversation) router.push({ pathname: '/chat', params: conversation } as never); }} style={s.option}><Text style={s.optionText}>{choice}</Text><Ionicons name="arrow-forward" size={18} color="#EEF2F8" /></Pressable>)}
          <Text style={s.hint}>{id === 'home' ? 'Device states in the artwork are illustrative. Actual device status is unverified.' : 'Connected services require their own setup.'}</Text>
        </ScrollView>}
      </BlurView>
    </SafeAreaView>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030405' }, safe: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 }, brand: { color: '#CBD2DD', fontSize: 9, letterSpacing: 3 }, title: { color: '#F4F6FA', fontSize: 24, fontWeight: '600', marginTop: 4 },
  round: { borderRadius: 28, width: 48, height: 48, borderWidth: 1, borderColor: '#DDE5F266', backgroundColor: '#06080C88', alignItems: 'center', justifyContent: 'center' },
  dock: { borderRadius: 24, overflow: 'hidden', padding: 14, borderWidth: 1, borderColor: '#DCE4EF55', backgroundColor: '#05060988' }, dockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  presence: { color: '#F4F6FA', fontSize: 10, letterSpacing: 1.5 }, hint: { color: '#CAD1DC', fontSize: 11, lineHeight: 17, marginTop: 5 }, prompt: { color: '#F4F6FA', fontSize: 18, lineHeight: 25 },
  option: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, minHeight: 48, borderWidth: 1, borderColor: '#DFE6F344', borderRadius: 18, backgroundColor: '#FFFFFF0A' }, optionText: { color: '#F4F6FA', fontSize: 14, flex: 1, lineHeight: 20 },
});
