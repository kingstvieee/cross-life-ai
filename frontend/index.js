import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  const load = () =>
    LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' }).catch(() =>
      LoadSkiaWeb({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
      }),
    );
  load()
    .catch((e) => console.warn('CanvasKit load failed', e))
    .then(() => renderRootComponent(App));
} else {
  renderRootComponent(App);
}
