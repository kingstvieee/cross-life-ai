import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WorldScene } from '@/components/staarwardd/world-scene';
import { WORLD_BY_ID, worldConversation } from '@/lib/staarwardd/world-directory';

export default function Environment() {
  const { world: raw } = useLocalSearchParams<{ world?: string }>();
  const world = typeof raw === 'string' && (raw === 'hub' || WORLD_BY_ID[raw]) ? raw : 'hub';
  const router = useRouter();
  const action = useCallback((value: string) => {
    if (value.startsWith('world:')) { router.replace({ pathname: '/environment', params: { world: value.slice(6) } } as never); return; }
    if (value === 'checkins') { router.push('/checkins' as never); return; }
    if (value === 'connections') { router.push({ pathname: '/connections', params: { world } } as never); return; }
    if (value.startsWith('conversation:')) {
      const choice = WORLD_BY_ID[world]?.choices[Number(value.slice(13))];
      const conversation = choice && worldConversation(world, choice);
      if (conversation) router.push({ pathname: '/chat', params: conversation } as never);
    }
  }, [router, world]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#030713' }}>
    <View style={{ paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', gap: 24 }}>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/hub')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#E5EBF5' }}>All worlds</Text></Pressable>
      {world !== 'hub' && <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/environment', params: { world: 'hub' } } as never)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#C6D6EB' }}>Portal chamber</Text></Pressable>}
    </View>
    <View style={{ flex: 1 }}><WorldScene world={world} onAction={action} /></View>
  </SafeAreaView>;
}
