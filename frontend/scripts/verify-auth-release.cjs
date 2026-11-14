const assert = require('node:assert/strict');

async function verifyAuthRelease(env = process.env, request = fetch) {
  const raw = (env.EXPO_PUBLIC_BACKEND_URL || '').trim();
  assert.ok(raw, 'EXPO_PUBLIC_BACKEND_URL is missing. Set it in the EAS production environment before building.');
  const origin = new URL(raw);
  assert.ok(origin.protocol === 'https:' && !origin.username && !origin.password &&
    !origin.search && !origin.hash && origin.pathname === '/',
  'EXPO_PUBLIC_BACKEND_URL must be an HTTPS origin without credentials, path, query or fragment.');
  const response = await request(new URL('/api/auth/providers', origin), {
    signal: AbortSignal.timeout(12000), redirect: 'error',
  });
  assert.ok(response.ok, `Authentication settings returned HTTP ${response.status}.`);
  const data = await response.json();
  assert.equal(data.nativeEnabled, true, 'Native authentication callback is not configured on this backend.');
  assert.ok(Array.isArray(data.providers) && data.providers.some(p =>
    p && ['apple', 'google', 'microsoft', 'yahoo', 'email'].includes(p.id) && p.enabled === true),
  'No supported account provider is enabled on this backend.');
  return origin.origin;
}

if (require.main === module && process.env.EAS_BUILD_PROFILE === 'production') {
  verifyAuthRelease().then(origin => console.log(`Authentication configuration reachable: ${origin}. Live login still requires device verification.`))
    .catch(error => { console.error(`Release blocked: ${error.message}`); process.exitCode = 1; });
} else if (require.main === module && !process.env.EAS_BUILD) {
  verifyAuthRelease().then(origin => console.log(`Authentication configuration reachable: ${origin}.`))
    .catch(error => { console.error(`Release blocked: ${error.message}`); process.exitCode = 1; });
}

module.exports = { verifyAuthRelease };
