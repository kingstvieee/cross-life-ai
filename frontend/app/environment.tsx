import { useCallback } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { WorldScene } from '@/components/staarwardd/world-scene';
import { artworkForSignedInPortal, hasDiggitstaarStudio } from '@/components/staarwardd/locked-portal-artwork';
import { useAuth } from '@/src/auth';
import { relationshipNotesMode } from '@/src/relationship-notes';
import { WORLD_BY_ID, worldConversation, type WorldId } from '@/lib/staarwardd/world-directory';

export default function Environment() {
  const { world: raw, variant: rawVariant, preview } = useLocalSearchParams<{ world?: string; variant?: string; preview?: string }>();
  const world: WorldId | 'hub' = typeof raw === 'string' && Object.prototype.hasOwnProperty.call(WORLD_BY_ID, raw) ? raw as WorldId : 'hub';
  const variant = world === 'relationships' && rawVariant === 'singles' ? 'singles' : 'realm';
  const router = useRouter();
  const { user } = useAuth();
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
  const debugScene = __DEV__ && preview === 'geometry';
  if (world !== 'hub' && !debugScene) {
    const entry = WORLD_BY_ID[world];
    const privateStudio = Boolean(user && !user.is_demo && hasDiggitstaarStudio);
    const hero = !privateStudio && world === 'diggitstaar'
      ? artworkForSignedInPortal(world, variant, false)
      : artworkForSignedInPortal(world, variant);
    const button = (label: string, onPress: () => void) => <Pressable accessibilityRole="button" onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#74664C', borderRadius: 12 }}>
      <Text style={{ color: '#F1DDAF', fontWeight: '700' }}>{label}</Text>
    </Pressable>;
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {button('All worlds', () => router.replace('/hub'))}
          {world === 'relationships' && button(variant === 'singles' ? 'Relationship Realm' : 'Singles Lounge',
            () => router.replace({ pathname: '/environment', params: { world, variant: variant === 'singles' ? 'realm' : 'singles' } } as never))}
        </View>
        <Text accessibilityRole="header" style={{ color: '#F1F4F8', fontSize: 29, fontWeight: '700' }}>{entry.name}</Text>
        <Image accessibilityLabel={world === 'diggitstaar' && !privateStudio ? 'DIGGITSTAAR entrance' : entry.name + ' interior'}
          source={hero} contentFit="contain" style={{ width: '100%', aspectRatio: 16 / 9 }} />
        <Text style={{ color: '#C5CEDB', lineHeight: 21 }}>
          {world === 'diggitstaar' && !privateStudio ? 'Studio entrance. The locked interior is not available in this build.' : entry.detail}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {world === 'diggitstaar' && button('Campaign editor', () => router.push('/diggit-campaign' as never))}
          {world === 'events' && button('Toronto events', () => router.push('/community-discovery' as never))}
          {world === 'work' && button('Current Work', () => router.push('/work-focus' as never))}
          {world === 'wellbeing' && button('Check-ins', () => router.push('/checkins' as never))}
          {world === 'wellbeing' && button('Pet care', () => router.push('/petcare' as never))}
          {world === 'relationships' && variant === 'realm' && relationshipNotesMode('relationship-notes', user) === 'relationship-notes' &&
            button('Relationship notes', () => router.push({ pathname: '/guardian-tools', params: { view: 'relationship-notes' } }))}
          {world === 'staarsonic' && user && !user.is_demo && button('Track session sheet', () => router.push('/staarsonic-track-sheet' as never))}
          {world === 'style' && Platform.OS === 'web' && button('Style Swap', () => router.push('/style-swap' as never))}
          {button(world === 'home' ? 'Home connections and device setup' : world === 'diggitstaar' ? 'Canva account and designs' : 'Connection setup',
            () => router.push({ pathname: '/connections', params: { world } } as never))}
        </View>
      </ScrollView>
    </SafeAreaView>;
  }
  if (!debugScene) return <Redirect href="/hub" />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#030713' }}>
    <View style={{ paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', gap: 24 }}>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/hub')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#E5EBF5' }}>All worlds</Text></Pressable>
      {world === 'relationships' && <Pressable accessibilityRole="button" accessibilityLabel={variant === 'singles' ? 'Open Relationship Realm' : 'Open Singles Lounge'} onPress={() => router.replace({ pathname: '/environment', params: { world, variant: variant === 'singles' ? 'realm' : 'singles' } } as never)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#E3B6FF' }}>{variant === 'singles' ? 'Relationship Realm' : 'Singles Lounge'}</Text></Pressable>}
      {world === 'wellbeing' && <Pressable accessibilityRole="button" onPress={() => router.push('/petcare' as never)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#E8D8AE' }}>Pet care</Text></Pressable>}
      {world !== 'hub' && <Pressable accessibilityRole="button" accessibilityLabel="Open this world's tools and connections" onPress={() => router.push({ pathname: '/connections', params: { world } } as never)} style={{ minHeight: 44, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: '#E8D8AE', fontWeight: '700' }}>World tools</Text></Pressable>}
      {world !== 'hub' && <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/environment', params: { world: 'hub' } } as never)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#C6D6EB' }}>Portal chamber</Text></Pressable>}
    </View>
    <View style={{ paddingHorizontal: 18, paddingVertical: 7, backgroundColor: '#17202B' }}>
      <Text style={{ color: '#F1DDAF', fontWeight: '700', fontSize: 12 }}>3D DEVELOPMENT PREVIEW</Text>
      <Text style={{ color: '#C5CEDB', fontSize: 11, lineHeight: 17 }}>Offline scene geometry only. Locked artwork, facial animation and final immersive set dressing are not yet approved or replaced.</Text>
    </View>
    <View style={{ flex: 1 }}><WorldScene world={world} variant={variant} onAction={action} /></View>
  </SafeAreaView>;
}
