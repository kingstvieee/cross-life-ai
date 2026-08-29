import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { DEFAULT_SAFETY_PREFERENCES, type SafetyPreferences } from "@/lib/staarwardd/home-safety";

const STORAGE_KEY = "staarwardd.v13.home-safety";

type HomeSafetyContextValue = {
  ready: boolean;
  preferences: SafetyPreferences;
  enable: () => void;
  disable: () => void;
  update: (patch: Partial<Omit<SafetyPreferences, "consented">>) => void;
  erase: () => void;
};

const HomeSafetyContext = createContext<HomeSafetyContextValue | null>(null);

export function HomeSafetyProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<SafetyPreferences>(DEFAULT_SAFETY_PREFERENCES);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((stored) => { if (stored) { try { setPreferences({ ...DEFAULT_SAFETY_PREFERENCES, ...JSON.parse(stored) }); } catch { setPreferences(DEFAULT_SAFETY_PREFERENCES); } } }).finally(() => setReady(true)); }, []);
  const persist = useCallback((next: SafetyPreferences) => { setPreferences(next); void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined); }, []);
  const enable = useCallback(() => persist({ ...preferences, consented: true }), [persist, preferences]);
  const disable = useCallback(() => persist({ ...preferences, consented: false, proactiveInAppAlerts: false, demoReviewEnabled: false }), [persist, preferences]);
  const update = useCallback((patch: Partial<Omit<SafetyPreferences, "consented">>) => persist(preferences.consented ? { ...preferences, ...patch } : preferences), [persist, preferences]);
  const erase = useCallback(() => { setPreferences(DEFAULT_SAFETY_PREFERENCES); void AsyncStorage.removeItem(STORAGE_KEY); }, []);
  const value = useMemo(() => ({ ready, preferences, enable, disable, update, erase }), [disable, enable, erase, preferences, ready, update]);
  return <HomeSafetyContext.Provider value={value}>{children}</HomeSafetyContext.Provider>;
}

export function useHomeSafety() {
  const value = useContext(HomeSafetyContext);
  if (!value) throw new Error("useHomeSafety must be used inside HomeSafetyProvider");
  return value;
}
