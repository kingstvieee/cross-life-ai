import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { DEFAULT_MEMORY, type PreferenceMemory, type RoomPreference, type ScenePreference } from "@/lib/staarwardd/preference-policy";
import type { PortalId } from "@/lib/staarwardd/types";

const STORAGE_KEY = "staarwardd.v13.preference-memory";

type MemoryContextValue = {
  ready: boolean;
  memory: PreferenceMemory;
  enable: () => void;
  disable: () => void;
  update: (patch: Partial<Omit<PreferenceMemory, "consented" | "learnedAt">>) => void;
  learnPortal: (portalId: PortalId) => void;
  rememberScene: (room: RoomPreference, scene: ScenePreference) => void;
  erase: () => void;
};

const MemoryContext = createContext<MemoryContextValue | null>(null);

function save(memory: PreferenceMemory) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory)).catch(() => undefined);
}

export function PreferenceMemoryProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [memory, setMemory] = useState<PreferenceMemory>(DEFAULT_MEMORY);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try { setMemory({ ...DEFAULT_MEMORY, ...JSON.parse(stored) }); } catch { setMemory(DEFAULT_MEMORY); }
      })
      .finally(() => setReady(true));
  }, []);

  const setAndSave = useCallback((producer: (current: PreferenceMemory) => PreferenceMemory) => {
    setMemory((current) => {
      const next = producer(current);
      void save(next);
      return next;
    });
  }, []);

  const enable = useCallback(() => setAndSave((current) => ({ ...current, consented: true, learnedAt: current.learnedAt ?? new Date().toISOString() })), [setAndSave]);
  const disable = useCallback(() => setAndSave((current) => ({ ...current, consented: false, autoApplyInApp: false, activityHistoryEnabled: false })), [setAndSave]);
  const update = useCallback((patch: Partial<Omit<PreferenceMemory, "consented" | "learnedAt">>) => setAndSave((current) => current.consented ? { ...current, ...patch, learnedAt: new Date().toISOString() } : current), [setAndSave]);
  const learnPortal = useCallback((preferredPortal: PortalId) => setAndSave((current) => current.consented ? { ...current, preferredPortal, learnedAt: new Date().toISOString() } : current), [setAndSave]);
  const rememberScene = useCallback((preferredRoom: RoomPreference, preferredScene: ScenePreference) => setAndSave((current) => current.consented ? { ...current, preferredRoom, preferredScene, learnedAt: new Date().toISOString() } : current), [setAndSave]);
  const erase = useCallback(() => { setMemory(DEFAULT_MEMORY); void AsyncStorage.removeItem(STORAGE_KEY); }, []);

  const value = useMemo(() => ({ ready, memory, enable, disable, update, learnPortal, rememberScene, erase }), [disable, enable, erase, learnPortal, memory, ready, rememberScene, update]);
  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

export function usePreferenceMemory() {
  const value = useContext(MemoryContext);
  if (!value) throw new Error("usePreferenceMemory must be used inside PreferenceMemoryProvider");
  return value;
}
