import { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LiquidSurface from './liquid-surface';
import type { LiquidSurfaceProps } from './types';

export function SceneSurface(props: LiquidSurfaceProps) {
  const [ready, setReady] = useState(false);
  const loaded = useCallback(() => setReady(true), []);
  const [failed, setFailed] = useState(false);
  const unavailable = useCallback(() => setFailed(true), []);
  return <View pointerEvents="none" style={{ width: props.width, height: props.height, overflow: 'hidden', borderRadius: props.mode === 'bubble' ? 999 : 0 }}>
    {(!ready || failed) && <Image source={props.source} resizeMode="cover" style={StyleSheet.absoluteFill} />}
    {!failed && <View style={StyleSheet.absoluteFill}><LiquidSurface {...props} onReady={loaded} onUnavailable={unavailable} /></View>}
  </View>;
}
