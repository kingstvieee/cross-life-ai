import { Redirect, useLocalSearchParams } from 'expo-router';
import { WORLD_BY_ID } from '@/lib/staarwardd/world-directory';

// Legacy deep links must enter the same immersive scene as Hub portal taps.
// Never show the obsolete generic task-list template.
export default function WorldScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const world = typeof id === 'string' && WORLD_BY_ID[id] ? id : 'hub';
  return <Redirect href={{ pathname: '/environment', params: { world } } as never} />;
}
