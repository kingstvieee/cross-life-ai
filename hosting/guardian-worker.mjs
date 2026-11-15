// Same-origin browser session boundary. Provider credentials remain on the API host.
export const BACKEND = 'https://cross-life-ai.emergent.host';
const COOKIE = '__Host-staar_web_session';
const PUBLIC = new Set(['/api/auth/providers']);
const SESSION = `${COOKIE}=`;
const expired = `${SESSION}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
function json(value, status = 200, cookie) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(JSON.stringify(value), { status, headers });
}
export async function handle(request, env = {}, transport = fetch) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) {
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Static asset binding is unavailable.', { status: 503 });
  }
  const method = request.method.toUpperCase();
  const unsafe = !['GET', 'HEAD'].includes(method);
  if (unsafe && request.headers.get('Origin') !== url.origin) return json({ detail: 'csrf_origin_denied' }, 403);
  if (url.pathname === '/api/auth/web/exchange') {
    if (method !== 'POST') return json({ detail: 'method_not_allowed' }, 405);
    if (Number(request.headers.get('Content-Length') || 0) > 8192) return json({ detail: 'request_too_large' }, 413);
    const body = await request.text();
    if (body.length > 8192) return json({ detail: 'request_too_large' }, 413);
    try {
      const response = await transport(BACKEND + url.pathname, { method, body, headers: { 'Content-Type': 'application/json' }, redirect: 'manual' });
      if (!response.ok) return json({ detail: 'sign_in_expired_or_invalid' }, response.status >= 400 && response.status < 500 ? response.status : 502);
      const data = await response.json();
      if (!/^[A-Za-z0-9_-]{64}$/.test(data.session_token || '') || !data.user?.user_id || data.user.is_demo) return json({ detail: 'invalid_session_response' }, 502);
      return json({ user: data.user }, 200, `${SESSION}${data.session_token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800`);
    } catch { return json({ detail: 'identity_service_unavailable' }, 502); }
  }
  if (url.pathname.startsWith('/api/auth/start/') || url.pathname.includes('/auth/native/') || url.pathname === '/api/auth/callback') return json({ detail: 'use_configured_login_flow' }, 400);
  const token = (request.headers.get('Cookie') || '').split(';').map(p => p.trim()).find(p => p.startsWith(SESSION))?.slice(SESSION.length);
  if (!PUBLIC.has(url.pathname) && !/^[A-Za-z0-9_-]{64}$/.test(token || '')) return json({ detail: 'sign_in_required' }, 401, url.pathname === '/api/auth/logout' ? expired : undefined);
  const headers = new Headers();
  for (const key of ['content-type', 'accept']) if (request.headers.has(key)) headers.set(key, request.headers.get(key));
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const logout = url.pathname === '/api/auth/logout';
  try {
    const upstream = await transport(BACKEND + url.pathname + url.search, { method, headers, body: unsafe ? await request.arrayBuffer() : undefined, redirect: 'manual', signal: request.signal });
    if (upstream.status >= 300 && upstream.status < 400) return json({ detail: 'unexpected_api_redirect' }, 502, logout ? expired : undefined);
    const output = new Headers(upstream.headers);
    output.delete('Set-Cookie'); output.delete('Access-Control-Allow-Origin'); output.delete('Access-Control-Allow-Credentials');
    output.set('Cache-Control', 'no-store');
    if (logout || upstream.status === 401) output.set('Set-Cookie', expired);
    return new Response(upstream.body, { status: upstream.status, headers: output });
  } catch { return json({ detail: 'backend_unavailable' }, 502, logout ? expired : undefined); }
}
export default { fetch: (request, env) => handle(request, env) };
