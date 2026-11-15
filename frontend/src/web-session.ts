// The browser holds only a short-lived PKCE verifier. Account tokens stay HttpOnly.
const KEY = 'staar.web-login';
export async function beginWebLogin(provider: string, backend: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  sessionStorage.setItem(KEY, JSON.stringify({verifier, createdAt: Date.now()}));
  const target = new URL('/api/auth/start/' + encodeURIComponent(provider), backend);
  target.searchParams.set('web_challenge', challenge);
  window.location.assign(target.toString());
}
export async function finishWebLogin() {
  const code = new URLSearchParams(window.location.hash.slice(1)).get('guardian_code');
  if (!code) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  const saved = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  const grant = saved ? JSON.parse(saved) : null;
  if (!grant?.verifier || Date.now() - grant.createdAt > 300000) throw new Error('Sign-in expired. Please sign in again.');
  const response = await fetch('/api/auth/web/exchange', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,verifier:grant.verifier})});
  if (!response.ok) throw new Error('Sign-in could not be verified. Please try again.');
  return (await response.json()).user;
}
