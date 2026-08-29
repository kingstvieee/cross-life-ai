import type { GuardianReceipt } from "./guardian-policy";
import type { PreferenceMemory } from "./preference-policy";

export const GUARDIAN_RECEIPTS_STORAGE_KEY = "staarwardd.v13.guardian-receipts";
const MAX_RECEIPTS = 24;

export function shouldPersistGuardianReceipts(memory: Pick<PreferenceMemory, "consented" | "activityHistoryEnabled">) {
  return memory.consented && memory.activityHistoryEnabled;
}

export function shouldClearGuardianReceipts(memory: Pick<PreferenceMemory, "consented" | "activityHistoryEnabled">) {
  return !shouldPersistGuardianReceipts(memory);
}

export function clearGuardianReceipts() {
  return [] as GuardianReceipt[];
}

export function nextGuardianReceipts(current: GuardianReceipt[], receipt: GuardianReceipt) {
  return [{ ...receipt }, ...current.filter((item) => item.id !== receipt.id)].slice(0, MAX_RECEIPTS);
}
