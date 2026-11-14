import { useEffect, useMemo } from 'react';
import { Canvas, Fill, ImageShader, Shader, Skia, useImage } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SKSL } from './shader';
import type { LiquidSurfaceProps } from './types';

export default function LiquidSurface({ source, width, height, crop = [0, 0, 1, 1], mode = 'bubble', moving, onReady, onUnavailable }: LiquidSurfaceProps) {
  const image = useImage(source, onUnavailable);
  const effect = useMemo(() => Skia.RuntimeEffect.Make(SKSL), []);
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = moving ? withRepeat(withTiming(Math.PI * 2, { duration: 24000, easing: Easing.linear }), -1, false) : 0;
    return () => cancelAnimation(phase);
  }, [moving, phase]);
  useEffect(() => { if (!effect) onUnavailable?.(); }, [effect, onUnavailable]);
  useEffect(() => { if (image && effect) onReady?.(); }, [image, effect, onReady]);
  const kind = mode === 'background' ? 0 : mode === 'world' ? 2 : 1;
  const imageWidth = image?.width() ?? 1;
  const imageHeight = image?.height() ?? 1;
  const [x, y, w, h] = crop;
  const uniforms = useDerivedValue(() => ({ resolution: [width, height], imageSize: [imageWidth, imageHeight], crop: [x, y, w, h], time: phase.value, mode: kind }), [width, height, imageWidth, imageHeight, x, y, w, h, kind]);
  if (!image || !effect || width < 1 || height < 1) return null;
  return <Canvas style={{ width, height }} pointerEvents="none"><Fill><Shader source={effect} uniforms={uniforms}><ImageShader image={image} fit="fill" rect={{ x: 0, y: 0, width: 1, height: 1 }} tx="clamp" ty="clamp" /></Shader></Fill></Canvas>;
}
