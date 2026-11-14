/** Account-scoped, in-memory arrival gate. No preference or history is persisted. */
export function createArrivalSession() {
  const greeted = new Set<string>();
  return {
    claim(accountId?: string | null) {
      if (!accountId || greeted.has(accountId)) return false;
      greeted.add(accountId);
      return true;
    },
  };
}
