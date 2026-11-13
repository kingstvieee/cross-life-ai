import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { backendUrl } from './backend-config';

const KEY = 'staar_session_token';

type User = {
  user_id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  onboarding_complete: boolean;
  autonomy: 'suggest' | 'assist' | 'proactive';
  companion: 'guardian' | 'kaia' | 'atlas';
  portals_enabled: string[];
  portal_privacy: Record<string, { access: boolean; share: boolean; confirm: boolean }>;
  cross_life_paused: boolean;
  is_demo?: boolean;
};

type Ctx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginDemo: () => Promise<User | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  patchProfile: (patch: Partial<User>) => Promise<void>;
  exchangeSessionId: (sessionId: string) => Promise<User | null>;
  api: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthCtx = createContext<Ctx | null>(null);

async function storeToken(t: string | null) {
  if (Platform.OS === 'web') {
    if (t) window.localStorage.setItem(KEY, t); else window.localStorage.removeItem(KEY);
  } else {
    if (t) await SecureStore.setItemAsync(KEY, t); else await SecureStore.deleteItemAsync(KEY);
  }
}

async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') return window.localStorage.getItem(KEY);
  return await SecureStore.getItemAsync(KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!token) return new Response(JSON.stringify({ detail: 'sign_in_required' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(backendUrl(path), { ...init, headers });
  }, [token]);

  const refresh = useCallback(async () => {
    const t = await readToken();
    if (t) {
      try {
        const r = await fetch(backendUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${t}` } });
        if (r.ok) {
          const account = await r.json();
          if (!account.is_demo && !String(account.user_id).startsWith('demo_')) {
            setUser(account); setToken(t); setLoading(false); return;
          }
        }
        await storeToken(null);
      } catch {
        setUser(null); setToken(null); setLoading(false); return;
      }
    }
    setUser(null); setToken(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  // Compatibility only: guests never acquire an account or a server token.
  const loginDemo = useCallback(async () => null, []);

  const exchangeSessionId = useCallback(async (sessionId: string) => {
    const r = await fetch(backendUrl('/api/auth/session'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    await storeToken(data.session_token);
    setToken(data.session_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try { await fetch(backendUrl('/api/auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch { /* Clear local credentials even when offline. */ }
    }
    await storeToken(null);
    setToken(null); setUser(null);
  }, [token]);

  const patchProfile = useCallback(async (patch: Partial<User>) => {
    if (!token) return;
    const r = await fetch(backendUrl('/api/user/profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (r.ok) setUser(await r.json());
  }, [token]);

  const value = useMemo(() => ({ user, token, loading, loginDemo, logout, refresh, patchProfile, exchangeSessionId, api }),
    [user, token, loading, loginDemo, logout, refresh, patchProfile, exchangeSessionId, api]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
