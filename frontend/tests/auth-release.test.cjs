const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyAuthRelease } = require('../scripts/verify-auth-release.cjs');
const env = { EXPO_PUBLIC_BACKEND_URL: 'https://hub.example.test' };
const ready = { nativeEnabled: true, providers: [{ id: 'apple', enabled: true }] };
const response = data => async () => ({ ok: true, json: async () => data });

test('release rejects missing and insecure backend configuration before requesting', async () => {
  for (const url of ['', 'http://hub.example.test', 'https://hub.example.test/path', 'https://user:pass@hub.example.test']) {
    await assert.rejects(verifyAuthRelease({ EXPO_PUBLIC_BACKEND_URL: url }, () => assert.fail('must not request')));
  }
});
test('release rejects unreachable, wrong and disabled identity services', async () => {
  await assert.rejects(verifyAuthRelease(env, async () => { throw new TypeError('offline'); }));
  await assert.rejects(verifyAuthRelease(env, async () => ({ ok: false, status: 404 })));
  for (const data of [{}, { ...ready, nativeEnabled: false }, { ...ready, providers: [] }, { ...ready, providers: [{ id: 'email', enabled: false }] }]) {
    await assert.rejects(verifyAuthRelease(env, response(data)));
  }
});
test('release checks actual provider endpoint and accepts configured native identity', async () => {
  const origin = await verifyAuthRelease(env, async (url, options) => {
    assert.equal(url.href, 'https://hub.example.test/api/auth/providers');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ready };
  });
  assert.equal(origin, env.EXPO_PUBLIC_BACKEND_URL);
});
