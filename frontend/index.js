import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // ---- Branded boot screen (visible until React mounts into #root) ----
  try {
    document.title = 'STAAR Hub | Cross-Life Context Intelligence';
    const favicon =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0A0B0E"/><circle cx="32" cy="32" r="13" fill="#EAFDFF"/><circle cx="32" cy="32" r="19" fill="none" stroke="#00E5FF" stroke-width="2.5" opacity="0.9"/><circle cx="32" cy="32" r="26" fill="none" stroke="#00E5FF" stroke-width="1.5" opacity="0.35"/></svg>'
      );
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon;

    if (!document.getElementById('boot')) {
      const style = document.createElement('style');
      style.textContent = `
        html, body { background: #0A0B0E; }
        #boot { position: fixed; inset: 0; z-index: 9999; background: #0A0B0E;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        #root:not(:empty) ~ #boot { display: none; }
        .boot-orb { width: 64px; height: 64px; border-radius: 50%; background: #EAFDFF;
          box-shadow: 0 0 40px 12px rgba(0,229,255,0.45), 0 0 90px 30px rgba(0,229,255,0.15);
          animation: bootpulse 1.6s ease-in-out infinite; }
        .boot-brand { margin-top: 26px; color: #FFFFFF; font-size: 15px; letter-spacing: 7px; font-weight: 800; }
        .boot-sub { margin-top: 10px; color: #9CA3AF; font-size: 12px; letter-spacing: 1px; }
        .boot-retry { display: none; margin-top: 18px; color: #00E5FF; font-size: 13px; text-decoration: underline; cursor: pointer; }
        @keyframes bootpulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: .85; } }
        @media (prefers-reduced-motion: reduce) { .boot-orb { animation: none; } }
      `;
      document.head.appendChild(style);

      const boot = document.createElement('div');
      boot.id = 'boot';
      boot.setAttribute('aria-label', 'STAAR Hub is loading');
      boot.innerHTML =
        '<div class="boot-orb"></div><div class="boot-brand">STAAR HUB</div>' +
        '<div class="boot-sub" id="boot-sub">Waking the Guardian…</div>' +
        '<a class="boot-retry" id="boot-retry" href="/">Retry</a>';
      document.body.appendChild(boot);

      const msgs = ['Waking the Guardian…', 'Connecting seven portals…', 'Almost there…'];
      let i = 0;
      const iv = setInterval(() => {
        const root = document.getElementById('root');
        if (root && root.childNodes.length > 0) { clearInterval(iv); return; }
        i = Math.min(i + 1, msgs.length - 1);
        const sub = document.getElementById('boot-sub');
        if (sub) sub.textContent = msgs[i];
      }, 5000);
      setTimeout(() => {
        const root = document.getElementById('root');
        if (!root || root.childNodes.length === 0) {
          const sub = document.getElementById('boot-sub');
          if (sub) sub.textContent = 'This is taking longer than usual.';
          const r = document.getElementById('boot-retry');
          if (r) r.style.display = 'block';
        }
      }, 30000);
    }
  } catch (e) {}

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
