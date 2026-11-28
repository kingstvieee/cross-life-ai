type RelationshipNotesAccount = {
  user_id: string;
  is_demo?: boolean;
  portals_enabled?: readonly string[];
  portal_privacy?: Record<string, { access?: boolean } | undefined>;
};

/** A dedicated entry into Life Map cannot change its authenticated portal. */
export function relationshipNotesMode(view: unknown, account: RelationshipNotesAccount | null | undefined) {
  if (view !== 'relationship-notes') return 'general';
  if (!account?.user_id || account.is_demo || account.user_id.startsWith('demo_') ||
      !account.portals_enabled?.includes('relationships') || account.portal_privacy?.relationships?.access === false) {
    return 'unavailable';
  }
  return 'relationship-notes';
}
