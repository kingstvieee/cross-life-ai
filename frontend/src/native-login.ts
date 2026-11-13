import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { backendUrl } from './backend-config';

const REDIRECT = 'frontend://auth-complete';

/** The browser receives a one-use grant, never an account bearer token. */
export async function nativeLogin(provider: string) {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const start = backendUrl(`/api/auth/start/${encodeURIComponent(provider)}?native_challenge=${challenge}`);
  if (!start.startsWith('https://')) throw new Error('Secure sign-in requires an HTTPS backend.');
  const result = await WebBrowser.openAuthSessionAsync(start, REDIRECT);
  if (result.type !== 'success') return null;
  const callback = new URL(result.url);
  if (`${callback.protocol}//${callback.host}${callback.pathname}` !== REDIRECT) {
    throw new Error('Sign-in returned an unexpected destination.');
  }
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('Sign-in did not return a confirmation code.');
  const response = await fetch(backendUrl('/api/auth/native/exchange'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, verifier }),
  });
  if (!response.ok) throw new Error('Sign-in expired or could not be verified. Please try again.');
  const data = await response.json();
  if (!data.session_token || !data.user?.user_id || data.user.is_demo) {
    throw new Error('The account session could not be verified.');
  }
  return data;
}
