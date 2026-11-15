import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { SCENE_ASSETS } from '@/src/scene-assets';
import { sceneAction } from '@/src/scene-policy';
type Action = { world: string; area?: string };

async function bytes(module: number, base64: boolean) {
  const asset = await Asset.fromModule(module).downloadAsync(); const uri = asset.localUri || asset.uri;
  if (Platform.OS !== 'web') return FileSystem.readAsStringAsync(uri, { encoding: base64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8 });
  const response = await fetch(uri); if (!response.ok) throw new Error('Bundled scene unavailable.');
  if (!base64) return response.text();
  const input = new Uint8Array(await response.arrayBuffer()); let value = '';
  for (let i = 0; i < input.length; i += 16384) value += String.fromCharCode(...input.subarray(i, i + 16384));
  return btoa(value);
}

export function SceneViewer({ world, onAction }: { world: string; onAction: (action: Action) => void }) {
  const [html, setHtml] = useState(''); const [message, setMessage] = useState('Loading 3D geometry…');
  const native = useRef<WebView>(null); const frame = useRef<HTMLIFrameElement | null>(null); const action = useRef(onAction); action.current = onAction;
  const receive = useRef((data: unknown) => {});
  receive.current = data => {
    if (typeof data !== 'string' || data.length > 1000) return;
    try { const value = JSON.parse(data); if (value.channel !== 'staar-scene-v1') return;
      if (value.type === 'ready') setMessage('');
      if (value.type === 'error') setMessage('3D graphics are unavailable. Use Back to return to your portal.');
      if (value.type === 'action') { const result = sceneAction(world, value.action); if (result) action.current(result); }
    } catch { /* Ignore invalid renderer messages. */ }
  };
  useEffect(() => {
    let active = true; setHtml(''); setMessage('Loading 3D geometry…');
    if (!SCENE_ASSETS[world]) { setMessage('Scene unavailable.'); return; }
    void Promise.all([bytes(require('@/assets/3d/scene-runtime.bin'), false), bytes(SCENE_ASSETS[world], true)]).then(([runtime, model]) => {
      if (active) setHtml(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src data: blob:;"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080c14}canvas{display:block;touch-action:none}</style></head><body><script>window.STAAR_MODEL=Uint8Array.from(atob(${JSON.stringify(model)}),c=>c.charCodeAt(0)).buffer;${runtime.replace(/<\/script/gi, '<\\/script')}</script></body></html>`);
    }).catch(() => { if (active) setMessage('Could not load 3D geometry. Use Back to return to your portal.'); });
    const subscription = AppState.addEventListener('change', state => {
      const command = state === 'active' ? 'staar:resume' : 'staar:pause';
      native.current?.postMessage(command); frame.current?.contentWindow?.postMessage(command, '*');
    });
    const webMessage = (event: MessageEvent) => { if (event.source === frame.current?.contentWindow) receive.current(event.data); };
    if (Platform.OS === 'web') window.addEventListener('message', webMessage);
    return () => { active = false; subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('message', webMessage); };
  }, [world]);
  return <View style={{ height: 420, backgroundColor: '#080C14', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#708095' }}>
    {!!html && (Platform.OS === 'web' ? React.createElement('iframe', { ref: (value: HTMLIFrameElement | null) => { frame.current = value; }, srcDoc: html, title: `${world} interactive 3D scene`, sandbox: 'allow-scripts', style: { width: '100%', height: '100%', border: 0 } }) : <WebView ref={native} source={{ html }} originWhitelist={['about:*']} onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:srcdoc')} javaScriptEnabled allowFileAccess={false} mixedContentMode="never" onMessage={event => receive.current(event.nativeEvent.data)} onError={() => setMessage('3D graphics could not start.')} style={{ backgroundColor: '#080C14' }} />)}
    {!!message && <View pointerEvents="none" style={{ position: 'absolute', top: 20, left: 20, right: 20 }}><Text accessibilityRole="alert" style={{ color: '#EDF2F8', backgroundColor: '#101923', padding: 12, borderRadius: 12 }}>{message}</Text></View>}
  </View>;
}
