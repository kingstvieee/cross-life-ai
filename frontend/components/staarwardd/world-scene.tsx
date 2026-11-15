import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { worldSceneHtml } from '@/generated/world-runtime';
import { sceneAction } from '@/src/scene-events';

export function WorldScene({ world, variant = 'realm', onAction }: { world: string; variant?: 'realm' | 'singles'; onAction: (action: string) => void }) {
  const html = useMemo(() => worldSceneHtml(world, variant), [world, variant]);
  return <View style={{ width: '100%', height: '100%', minHeight: 420 }}>
    <WebView key={`${world}:${variant}`} source={{ html }} javaScriptEnabled scrollEnabled={false}
      originWhitelist={['about:blank']} allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false} mediaPlaybackRequiresUserAction
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('data:text/html')}
      onMessage={event => { try { const action = sceneAction(JSON.parse(event.nativeEvent.data), world); if (action) onAction(action); } catch { /* Invalid renderer messages are ignored. */ } }}
      style={{ backgroundColor: '#030713' }} />
  </View>;
}
