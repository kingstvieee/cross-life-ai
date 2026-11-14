import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WORLD_BY_ID, worldConversation } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
export default function WorldScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const world = WORLD_BY_ID[id];
  const name = user?.companion === 'kaia' ? 'Kaia' : user?.companion === 'guardian' ? 'Guardian' : 'Atlas';
  return <SafeAreaView style={s.root}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to all worlds" onPress={() => router.replace('/hub')} style={s.back}><Ionicons name="arrow-back" color="#E4E9F0" size={22} /><Text style={s.small}>ALL WORLDS</Text></Pressable>
    {!world ? <Text style={s.title}>World unavailable.</Text> : <>
      <View style={s.hero}><Image source={world.image} style={StyleSheet.absoluteFill} resizeMode="cover" /><LinearGradient colors={['transparent', '#06080B']} style={StyleSheet.absoluteFill} /><Text style={s.name}>{world.name}</Text></View>
      <Text style={s.title}>{world.title}</Text><Text style={s.detail}>{world.detail}</Text>
      <Text style={s.small}>WHAT WOULD YOU LIKE TO DO?</Text>
      {world.choices.map(choice => <Pressable key={choice} accessibilityRole="button" onPress={() => { const conversation = worldConversation(id, choice); if (conversation) router.push({ pathname: '/chat', params: conversation } as never); }} style={s.option}><Text style={s.optionText}>{choice}</Text><Ionicons name="arrow-forward" size={20} color="#D9E0E9" /></Pressable>)}
      <Text style={s.note}>Choose an option to prepare a conversation with {name}. You review the request before sending. Connections, purchases and messages require their own setup and approval.</Text>
    </>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#06080B' }, content: { padding: 24, gap: 20, maxWidth: 850, width: '100%', alignSelf: 'center' }, back: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, small: { color: '#A6B0BE', fontSize: 10, letterSpacing: 2, lineHeight: 18 }, hero: { height: 250, borderRadius: 23, borderWidth: 1, borderColor: '#59636F', overflow: 'hidden', justifyContent: 'flex-end', padding: 22 }, name: { color: '#F1F4F8', fontSize: 27, fontWeight: '600' }, title: { color: '#F0F3F7', fontSize: 32, lineHeight: 39, fontWeight: '600', letterSpacing: -.8 }, detail: { color: '#B8C2CE', fontSize: 15, lineHeight: 24 }, option: { minHeight: 64, padding: 18, backgroundColor: '#141A21', borderRadius: 16, borderWidth: 1, borderColor: '#697480', flexDirection: 'row', alignItems: 'center', gap: 15 }, optionText: { flex: 1, color: '#E6ECF3', fontSize: 16, lineHeight: 24 }, note: { color: '#929EAE', fontSize: 12, lineHeight: 20, marginBottom: 24 } });
