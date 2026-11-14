import type { SceneCrop } from '@/lib/staarwardd/world-art';
export type LiquidSurfaceProps = {
  source: number;
  width: number;
  height: number;
  crop?: SceneCrop;
  mode?: 'background' | 'bubble' | 'world';
  moving: boolean;
  onReady?: () => void;
  onUnavailable?: () => void;
};
