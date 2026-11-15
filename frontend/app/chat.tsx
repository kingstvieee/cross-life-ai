import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth';
import { theme, portalMeta } from '@/src/theme';
import { stopCompanion } from '@/src/companions';
import { GuardianPresence } from '@/components/staarwardd/guardian-presence';
import { VoiceInput } from '@/components/staarwardd/voice-input';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { conversationKey, rememberConversation, type ConversationSessions } from '@/lib/staarwardd/conversation-session';

const COMPANION_NAMES: Record<string, string> = { guardian: 'Guardian', kaia: 'Kaia', atlas: 'Atlas' };

type Msg = { role: 'user' | 'assistant'; text: string };
// Cache survives chat-screen navigation but never persists to disk.
const conversationCacheByUser = new Map<string, ConversationSessions>();

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { portal, draft } = useLocalSearchParams<{ portal?: string; draft?: string }>();
  const { api, user } = useAuth();
  const audio = useStaarAudio();
  const companion = COMPANION_NAMES[user?.companion || 'guardian'];
  const scrollRef = useRef<ScrollView>(null);

  const sessionKey = conversationKey(typeof portal === 'string' ? portal : null);
  const userKey = String(user?.user_id ?? 'signed-out');
  const savedSession = conversationCacheByUser.get(userKey)?.[sessionKey];
  const lastSessionIdentity = useRef(`${userKey}:${sessionKey}`);
  const [msgs, setMsgs] = useState<Msg[]>(() => savedSession?.turns ?? []);
  const [input, setInput] = useState(() => typeof draft === 'string' ? draft.slice(0, 4000) : savedSession?.draft ?? '');
  useEffect(() => { if (typeof draft === 'string') setInput(draft.slice(0, 4000)); }, [draft]);
  useEffect(() => {
    if (!user?.user_id) return;
    const identity = `${userKey}:${sessionKey}`;
    if (lastSessionIdentity.current !== identity) {
      lastSessionIdentity.current = identity;
      return; // Prevent old portal's turns being written into a new portal.
    }
    const sessions = conversationCacheByUser.get(userKey) ?? {};
    conversationCacheByUser.set(userKey, rememberConversation(sessions, sessionKey, { turns: msgs, draft: input }));
  }, [user?.user_id, userKey, sessionKey, msgs, input]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const voiceOn = audio.master && audio.voice && !audio.speechQuiet;
  const [historyReady, setHistoryReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (audio.voiceNotice) setNotice(audio.voiceNotice); }, [audio.voiceNotice]);
  const pending = useRef(false);
  const requestGeneration = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestGeneration.current++; requestAbort.current?.abort(); requestAbort.current = null; };
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
    setHistoryReady(false); setNotice('');
    const cached = conversationCacheByUser.get(userKey)?.[sessionKey];
    setMsgs(cached?.turns ?? []);
    setInput(cached?.draft ?? '');
    void api('/api/guardian/history' + (portal ? '?portal=' + encodeURIComponent(portal) : ''))
      .then(async r => {
        if (!r.ok) throw new Error('Conversation history could not be loaded.');
        const data = await r.json();
        if (active) {
          const history: Msg[] = data.turns.flatMap((t: { message: string; reply: string }) => [{ role: 'user' as const, text: t.message }, { role: 'assistant' as const, text: t.reply }]);
          setMsgs(current => current.length > history.length ? current : history);
        }
      }).catch(e => { if (active) setNotice(e.message); })
      .finally(() => { if (active) setHistoryReady(true); });
    }, 0);
    return () => { active = false; clearTimeout(timer); void stopCompanion(); };
  }, [api, portal, sessionKey, userKey]);

  const suggestions = portal
    ? [portalMeta[portal]?.tagline || 'What should I focus on?', 'Help me choose a practical next step']
    : ['Help me set up my worlds', 'Plan my next priority', 'What can you help me prepare?'];

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || pending.current || !historyReady || listening) return;
    pending.current = true;
    const requestId = ++requestGeneration.current;
    const abort = new AbortController();
    requestAbort.current = abort;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setBusy(true);
    try {
      const r = await api('/api/guardian/chat-once', {
        method: 'POST',
        signal: abort.signal,
        body: JSON.stringify({ message, portal: portal || null, companion: user?.companion || 'guardian' }),
      });
      if (requestId !== requestGeneration.current || !mounted.current) return;
      if (r.ok) {
        const data = await r.json();
        if (requestId !== requestGeneration.current || !mounted.current) return;
        setMsgs((m) => [...m, { role: 'assistant', text: data.reply || '…' }]);
        if (voiceOn) void audio.speak(data.reply);
      } else {
        setMsgs((m) => [...m, { role: 'assistant', text: 'I lost the thread for a second. Try that again.' }]);
      }
    } catch {
      if (requestId === requestGeneration.current && mounted.current && !abort.signal.aborted) {
        setMsgs((m) => [...m, { role: 'assistant', text: 'Connection dropped. Try again.' }]);
      }
    } finally {
      if (requestId === requestGeneration.current && mounted.current) {
        setBusy(false);
        pending.current = false;
        requestAbort.current = null;
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="chat-root">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h}>{companion}</Text>
          <Text style={styles.sub}>{portal ? `${portalMeta[portal]?.name?.toUpperCase()} PORTAL CONTEXT` : 'PRIVATE CONVERSATION'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={voiceOn ? 'Mute companion' : 'Enable spoken replies'} onPress={() => { audio.setSpeechQuiet(voiceOn); if (!voiceOn) audio.update({ master: true, voice: true }); }}><Ionicons name={voiceOn ? 'volume-high-outline' : 'volume-mute-outline'} size={22} color="#DCE2E9" /></Pressable>
      </View>

      {user?.companion === 'guardian' && <GuardianPresence listening={listening} thinking={busy} />}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {!historyReady && <ActivityIndicator accessibilityLabel="Loading shared conversation" color="#DDE3EA" />}
          {notice ? <Text accessibilityRole="alert" style={styles.sub}>{notice}</Text> : null}
          {msgs.length === 0 && (
            <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>
              <Text style={styles.greeting}>
                {portal
                  ? `You're in ${portalMeta[portal]?.name}. ${portalMeta[portal]?.tagline}`
                  : `I'm ${companion}. We can work with the context you’ve chosen to share.`}
              </Text>
              <View style={{ gap: 8, marginTop: 16 }}>
                {suggestions.map((s, i) => (
                  <Pressable accessibilityRole="button" key={i} style={styles.suggestion} onPress={() => send(s)} testID={`suggestion-${i}`}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {msgs.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.bubbleText, m.role === 'user' && { color: '#FFFFFF' }]}>{m.text}</Text>
            </View>
          ))}
          {busy && (
            <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color="#DDE3EA" />
              <Text style={[styles.bubbleText, { opacity: 0.6 }]}>{companion} is thinking…</Text>
            </View>
          )}
        </ScrollView>

        {busy && <Pressable accessibilityRole="button" accessibilityLabel="Cancel pending Guardian reply" onPress={() => { requestGeneration.current++; requestAbort.current?.abort(); requestAbort.current = null; pending.current = false; setBusy(false); setNotice('Reply cancelled. You can send another message.'); }} style={{ paddingHorizontal: 20, paddingVertical: 8 }}><Text style={{ color: '#F1DFA7' }}>Cancel pending reply</Text></Pressable>}
        <VoiceInput onListening={setListening} onTranscript={setInput} disabled={busy || !historyReady} />
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${companion}…`}
            placeholderTextColor="rgba(255,255,255,0.35)"
            onSubmitEditing={() => send()}
            returnKeyType="send"
            testID="chat-input"
          />
          <Pressable accessibilityRole="button" style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]} onPress={() => send()} disabled={!input.trim() || busy || listening} accessibilityLabel="Send message" testID="send-btn">
            <Ionicons name="arrow-up" size={20} color="#000000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0E' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: '#15171D',
  },
  h: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  sub: { fontSize: 9, letterSpacing: 2, color: '#DDE3EA', fontWeight: '700', marginTop: 2 },
  liveDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: theme.color.energy },
  greeting: { fontSize: 17, fontWeight: '700', color: '#F3F4F6', lineHeight: 25 },
  suggestion: {
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(220,226,234,0.3)', backgroundColor: 'rgba(34,38,43,0.8)',
  },
  suggestionText: { fontSize: 13.5, fontWeight: '600', color: '#F3F4F6' },
  bubble: { maxWidth: '84%', padding: 14, borderRadius: 20, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1F222B', borderBottomRightRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(34,38,43,0.8)', borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: 'rgba(220,226,234,0.25)',
  },
  bubbleText: { fontSize: 14.5, lineHeight: 21, color: '#F3F4F6' },
  inputRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0A0B0E',
  },
  input: {
    flex: 1, height: 48, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 18, fontSize: 14.5, color: '#F3F4F6', backgroundColor: '#15171D',
  },
  sendBtn: { width: 48, height: 48, borderRadius: 999, backgroundColor: '#DDE3EA', alignItems: 'center', justifyContent: 'center' },
});
