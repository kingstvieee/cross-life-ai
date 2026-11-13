import { useAuth } from "@/src/auth";
import { accountStorageKey } from "@/src/account-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import type { GuardianReceipt } from "@/lib/staarwardd/guardian-policy";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";
import { clearGuardianReceipts, GUARDIAN_RECEIPTS_STORAGE_KEY, nextGuardianReceipts, shouldClearGuardianReceipts, shouldPersistGuardianReceipts } from "@/lib/staarwardd/guardian-activity-policy";

const MAX_RECEIPTS = 24;

type GuardianActivityContextValue = {
  ready: boolean;
  receipts: GuardianReceipt[];
  record: (receipt: GuardianReceipt) => void;
  erase: () => void;
};

const GuardianActivityContext = createContext<GuardianActivityContextValue | null>(null);

function save(receipts: GuardianReceipt[], key: string) {
  return AsyncStorage.setItem(key, JSON.stringify(receipts)).catch(() => undefined);
}

export function GuardianActivityProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const storageKey = accountStorageKey(GUARDIAN_RECEIPTS_STORAGE_KEY, user?.user_id);
  const { memory, ready: memoryReady } = usePreferenceMemory();
  const [ready, setReady] = useState(false);
  const [receipts, setReceipts] = useState<GuardianReceipt[]>([]);

  useEffect(() => {
    if (!memoryReady) return;
    if (shouldClearGuardianReceipts(memory)) {
      setReceipts(clearGuardianReceipts());
      void AsyncStorage.removeItem(storageKey);
      setReady(true);
      return;
    }
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setReceipts(parsed.slice(0, MAX_RECEIPTS));
        } catch {
          setReceipts([]);
        }
      })
      .finally(() => setReady(true));
  }, [memory, memoryReady, storageKey]);

  const record = useCallback((receipt: GuardianReceipt) => {
    const persisted = shouldPersistGuardianReceipts(memory);
    const nextReceipt = { ...receipt, persisted };
    setReceipts((current) => {
      const next = nextGuardianReceipts(current, nextReceipt);
      if (persisted) void save(next, storageKey);
      return next;
    });
  }, [memory, storageKey]);

  const erase = useCallback(() => {
    setReceipts(clearGuardianReceipts());
    void AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  const value = useMemo(() => ({ ready, receipts, record, erase }), [erase, ready, receipts, record]);
  return <GuardianActivityContext.Provider value={value}>{children}</GuardianActivityContext.Provider>;
}

export function useGuardianActivity() {
  const value = useContext(GuardianActivityContext);
  if (!value) throw new Error("useGuardianActivity must be used inside GuardianActivityProvider");
  return value;
}
