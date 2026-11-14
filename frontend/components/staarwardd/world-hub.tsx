import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const companion = user?.companion === 'kaia' ? 'Kaia' : user?.companion === 'guardian' ? 'Guardian' : 'Atlas';
  useFocusEffect(useCallback(() => { setSelected(null); return () => audio.stopAll(); }, [audio.stopAll]));
  return <View style={s.root}>
    <LinearGradient colors={['#171A1E', '#030405', '#111418']} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}><View><Text style={s.brand}>STAARWARDD</Text><Text style={s.micro}>YOUR CONNECTED UNIVERSE</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={s.icon}><Ionicons name="options-outline" size={22} color="#E4E8EE" /></Pressable></View>
        <View style={s.stage}>
          <AccessField />
          <View style={s.stageCopy}><Text style={s.micro}>{companion.toUpperCase()} · YOUR COMPANION</Text><Text style={s.title}>Where shall{ '\n' }we begin?</Text><Text style={s.description}>Nine worlds. Your direction.</Text></View>
        </View>
        <LinearGradient colors={['#BBC2CB', '#3A414A', '#8B949F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.frame}>
          <BlurView intensity={35} tint="dark" style={s.companion}>
            <View style={{ flex: 1, gap: 7 }}><Text style={s.panelTitle}>Speak with {companion}</Text><Text style={s.description}>Bring an idea, a question, or a plan.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open conversation with ${companion}`} onPress={() => router.push('/chat')} style={s.primary}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#101317" /></Pressable>
          </BlurView>
        </LinearGradient>
        <View style={s.section}><Text style={s.micro}>EXPLORE YOUR WORLDS</Text><Text style={s.count}>09</Text></View>
        <View style={s.grid}>{WORLDS.map((world, index) => <Pressable key={world.id} accessibilityRole="button" accessibilityLabel={`Open ${world.name}`} disabled={selected !== null} onPress={() => { setSelected(world.id); router.push({ pathname: '/world/[id]', params: { id: world.id } } as never); }} style={({ pressed }) => [s.world, { width: `${100 / columns - (columns > 1 ? 1.4 : 0)}%` }, pressed && s.pressed]}>
          <Image source={world.image} style={s.art} accessibilityLabel={`${world.name} approved portal artwork`} />
          <LinearGradient colors={['transparent', 'rgba(3,4,5,.65)', '#080A0D']} locations={[0, .45, 1]} style={StyleSheet.absoluteFill} />
          <View style={s.worldTop}><Text style={s.number}>{String(index + 1).padStart(2, '0')}</Text><Ionicons name="arrow-forward-outline" size={18} color="#DDE3EB" /></View>
          <View style={s.worldCopy}><Text style={s.worldName}>{world.name}</Text><Text style={s.worldDetail}>{world.title}</Text></View>
        </Pressable>)}</View>
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
  section: { marginTop: 30, marginBottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, count: { color: '#858E9A', fontSize: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  world: { height: 225, borderRadius: 23, overflow: 'hidden', borderWidth: 1, borderColor: '#5D6570', backgroundColor: '#12161B' }, art: { width: '100%', height: '100%', resizeMode: 'cover' }, worldTop: { position: 'absolute', top: 17, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' }, number: { color: '#E3E8EF', fontSize: 11, letterSpacing: 3 }, worldCopy: { position: 'absolute', bottom: 18, left: 20, right: 20, gap: 6 }, worldName: { color: '#F4F6F9', fontSize: 24, fontWeight: '600', letterSpacing: .3 }, worldDetail: { color: '#C0C8D2', fontSize: 13, lineHeight: 19 }, pressed: { opacity: .7 }, footer: { color: '#7F8996', fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 30 },
});
