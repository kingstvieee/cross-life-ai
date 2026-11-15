import { useEffect, useMemo, useRef } from 'react';
import { worldSceneHtml } from '@/generated/world-runtime';
import { sceneAction } from '@/src/scene-events';

export function WorldScene({ world, variant = 'realm', onAction }: { world: string; variant?: 'realm' | 'singles'; onAction: (action: string) => void }) {
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => worldSceneHtml(world, variant), [world, variant]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow) return;
      const action = sceneAction(event.data, world); if (action) onAction(action);
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [onAction, world]);
  return <iframe key={`${world}:${variant}`} ref={iframe} title={`${world} navigable 3D environment`} srcDoc={html}
    sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', minHeight: 420, border: 0, display: 'block', background: '#030713' }} />;
}
