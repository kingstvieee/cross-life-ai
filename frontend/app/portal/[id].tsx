import { Redirect, useLocalSearchParams } from 'expo-router';
import { WORLD_BY_ID } from '@/lib/staarwardd/world-directory';

// All ten legacy portal links resolve to their immersive 3D world, never an
// obsolete task-list screen or a duplicate permission boundary.
export default function PortalRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const world = typeof id === 'string' && WORLD_BY_ID[id] ? id : 'hub';
  return <Redirect href={{ pathname: '/environment', params: { world } } as never} />;
}
