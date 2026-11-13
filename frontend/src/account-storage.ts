/** Unscoped legacy values are never implicitly assigned to a signed-in account. */
export function accountStorageKey(base: string, userId: string | undefined): string {
  if (!userId || userId.startsWith("demo_")) throw new Error("A real account is required for private storage");
  return `${base}:account:${encodeURIComponent(userId)}`;
}
