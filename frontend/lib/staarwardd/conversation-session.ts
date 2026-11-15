/** In-memory per-portal conversation cache. Server history remains authoritative. */
export type ConversationTurn = { role: 'user' | 'assistant'; text: string };
export type ConversationSession = { turns: ConversationTurn[]; draft: string; updatedAt: number };
export type ConversationSessions = Record<string, ConversationSession>;
export const conversationKey = (portal?: string | null) => portal?.trim() || 'global';
export function rememberConversation(
  sessions: ConversationSessions,
  key: string,
  patch: Partial<Pick<ConversationSession, 'turns' | 'draft'>>,
  now = Date.now(),
): ConversationSessions {
  const previous = sessions[key] ?? { turns: [], draft: '', updatedAt: 0 };
  return {
    ...sessions,
    [key]: {
      ...previous,
      ...patch,
      turns: patch.turns ? patch.turns.slice(-100) : previous.turns,
      draft: patch.draft === undefined ? previous.draft : patch.draft.slice(0, 4000),
      updatedAt: now,
    },
  };
}
export function clearConversationSessions(): ConversationSessions { return {}; }
