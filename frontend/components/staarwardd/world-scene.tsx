import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { worldSceneHtml } from '@/generated/world-runtime';
import { sceneAction, sceneFallbackActions } from '@/src/scene-events';

export function WorldScene({ world, variant = 'realm', onAction }: { world: string; variant?: 'realm' | 'singles'; onAction: (action: string) => void }) {
  const html = useMemo(() => worldSceneHtml(world, variant), [world, variant]);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => { setLoadFailed(false); }, [world, variant]);
  const fallback = sceneFallbackActions(world);
  if (loadFailed) return <ScrollView contentContainerStyle={{ padding: 22, gap: 12, backgroundColor: '#030713', minHeight: 420 }}>
    <Text accessibilityRole="alert" style={{ color: '#F2DFB4', fontSize: 18, fontWeight: '700' }}>3D preview unavailable</Text>
    <Text style={{ color: '#D6DFEC', lineHeight: 22 }}>The local scene could not load. Use these safe navigation controls instead. No devices or external services have been activated.</Text>
    {fallback.map(([label, action]) => <Pressable key={action} accessibilityRole="button"
      onPress={() => onAction(action)} style={{ minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#9AAABF', justifyContent: 'center' }}>
      <Text style={{ color: '#F2F5FA', fontSize: 15 }}>{label}</Text>
    </Pressable>)}
  </ScrollView>;
  return <View style={{ width: '100%', height: '100%', minHeight: 420 }}>
    <WebView key={`${world}:${variant}`} source={{ html }} javaScriptEnabled scrollEnabled={false}
      originWhitelist={['about:blank']} allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false} mediaPlaybackRequiresUserAction
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('data:text/html')}
      onError={() => setLoadFailed(true)}
      onRenderProcessGone={() => setLoadFailed(true)}
      onContentProcessDidTerminate={() => setLoadFailed(true)}
      onMessage={event => { try { const action = sceneAction(JSON.parse(event.nativeEvent.data), world); if (action) onAction(action); } catch { /* Invalid renderer messages are ignored. */ } }}
      style={{ backgroundColor: '#030713' }} />
  </View>;
}
