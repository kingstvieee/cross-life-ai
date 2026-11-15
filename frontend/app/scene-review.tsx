import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SceneViewer } from '@/components/staarwardd/scene-viewer';
import { SCENE_ASSETS } from '@/src/scene-assets';
import { WORLD_BY_ID } from '@/lib/staarwardd/world-directory';
export default function SceneReview() {
  const router = useRouter(); const { world: raw } = useLocalSearchParams<{ world: string }>();
  const world = typeof raw === 'string' && Object.hasOwn(SCENE_ASSETS, raw) ? raw : 'hub';
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}><ScrollView contentContainerStyle={{ padding: 22, gap: 20, maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: '#E7EFF9', padding: 12 }}>Back</Text></Pressable>
    <Text style={{ color: '#EDF2FA', fontSize: 28 }}>{WORLD_BY_ID[world]?.name || (world === 'singles' ? 'STAAR Love · Singles' : 'Portal Hub')} · 3D geometry review</Text>
    <Text style={{ color: '#B6C5D7', lineHeight: 22 }}>Drag to orbit. Pinch or scroll to zoom. Tap a console to open its setup area. This is newly authored geometry awaiting visual acceptance against the locked master; it is not the final approved scene.</Text>
    <SceneViewer world={world} onAction={value => router.push({ pathname: value.area ? '/connections' : '/scene-review', params: { world: value.world } } as never)} />
    {Object.keys(SCENE_ASSETS).map(id => <Pressable accessibilityRole="button" key={id} onPress={() => router.replace({ pathname: '/scene-review', params: { world: id } } as never)}><Text style={{ color: '#EDF2FA', padding: 12 }}>{WORLD_BY_ID[id]?.name || id}</Text></Pressable>)}
  </ScrollView></SafeAreaView>;
}
