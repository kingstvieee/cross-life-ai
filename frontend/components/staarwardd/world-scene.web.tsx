import { useEffect, useMemo, useRef, useState } from 'react';
import { worldSceneHtml } from '@/generated/world-runtime';
import { sceneAction, sceneFallbackActions } from '@/src/scene-events';
import { shouldDispatchSceneAction, type SceneDispatch } from '@/src/scene-action-dedup';

export function WorldScene({ world, variant = 'realm', onAction }: { world: string; variant?: 'realm' | 'singles'; onAction: (action: string) => void }) {
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const lastDispatch = useRef<SceneDispatch | null>(null);
  const sceneReady = useRef(false);
  const html = useMemo(() => worldSceneHtml(world, variant), [world, variant]);
  const [failedScene, setFailedScene] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const sceneKey = `${world}:${variant}`;
  const failed = failedScene === sceneKey;
  useEffect(() => {
    sceneReady.current = false;
    const watchdog = setTimeout(() => { if (!sceneReady.current) setFailedScene(sceneKey); }, 15000);
    return () => clearTimeout(watchdog);
  }, [sceneKey, retryCount]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow) return;
      if (event.data?.source === 'staar-scene-v1' && event.data.type === 'unavailable' && event.data.world === world) {
        setFailedScene(sceneKey);
        return;
      }
      if (event.data?.source === 'staar-scene-v1' && event.data.type === 'ready' && event.data.world === world) {
        sceneReady.current = true;
        return;
      }
      const action = sceneAction(event.data, world);
      if (action) { const next = { world, action, atMs: Date.now() }; if (shouldDispatchSceneAction(lastDispatch.current, next)) { lastDispatch.current = next; onAction(action); } }
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [onAction, world, sceneKey]);
  if (failed) return <div role="region" aria-label="Safe world navigation"
    style={{ padding: 22, background: '#030713', color: '#D6DFEC', minHeight: 420 }}>
    <p role="alert" style={{ color: '#F2DFB4', fontWeight: 700 }}>3D preview unavailable</p>
    <p>The local scene could not render. Use safe navigation below. No devices or external services were activated.</p>
    <button type="button" onClick={() => { setRetryCount(count => count + 1); setFailedScene(null); }}
      style={{ minHeight: 48, padding: 14, marginBottom: 12, borderRadius: 12, border: '1px solid #D5C08B', background: '#17202B', color: '#F2DFB4' }}>Retry 3D preview</button>
    <nav aria-label="World controls" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {sceneFallbackActions(world).map(([label, action]) => <button key={action} type="button"
        onClick={() => onAction(action)}
        style={{ minHeight: 48, padding: 14, borderRadius: 12, border: '1px solid #9AAABF', background: '#17202B', color: '#F2F5FA' }}>
        {label}
      </button>)}
    </nav>
  </div>;
  return <iframe key={`${sceneKey}:${retryCount}`} ref={iframe} title={`${world} navigable 3D environment`} srcDoc={html}
    onError={() => setFailedScene(sceneKey)}
    sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', minHeight: 420, border: 0, display: 'block', background: '#030713' }} />;
}
