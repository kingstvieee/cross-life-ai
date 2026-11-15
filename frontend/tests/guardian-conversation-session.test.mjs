import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationKey, rememberConversation, clearConversationSessions } from '../lib/staarwardd/conversation-session.ts';
test('worlds are independent and global has its own context', () => {
  assert.equal(conversationKey('style'), 'style');
  assert.equal(conversationKey(''), 'global');
  let sessions = rememberConversation({}, 'style', { draft: 'jacket' }, 1);
  sessions = rememberConversation(sessions, 'work', { draft: 'meeting' }, 2);
  assert.equal(sessions.style.draft, 'jacket');
  assert.equal(sessions.work.draft, 'meeting');
});
test('conversation turns are bounded to 100 and drafts to 4000 characters', () => {
  const turns = Array.from({ length: 120 }, (_, i) => ({ role: 'user', text: String(i) }));
  const sessions = rememberConversation({}, 'global', { turns, draft: 'x'.repeat(5000) });
  assert.equal(sessions.global.turns.length, 100);
  assert.equal(sessions.global.turns[0].text, '20');
  assert.equal(sessions.global.draft.length, 4000);
});
test('clear removes all cached session references', () => {
  assert.deepEqual(clearConversationSessions(), {});
});
