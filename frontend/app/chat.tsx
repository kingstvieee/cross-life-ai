import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth';
import { theme, portalMeta } from '@/src/theme';

const COMPANION_NAMES: Record<string, string> = { guardian: 'Guardian', kaia: 'Kaia', atlas: 'Atlas' };

type Msg = { role: 'user' | 'assistant'; text: string };

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { portal } = useLocalSearchParams<{ portal?: string }>();
  const { api, user } = useAuth();
  const companion = COMPANION_NAMES[user?.companion || 'guardian'];
  const scrollRef = useRef<ScrollView>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const suggestions = portal
    ? [portalMeta[portal]?.tagline || 'What should I focus on?', 'What did you coordinate for me?']
    : ["What's my evening looking like?", 'What did you notice across my life today?', 'Help me protect my 8 PM plan'];

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setBusy(true);
    try {
      const r = await api('/api/guardian/chat-once', {
        method: 'POST',
        body: JSON.stringify({ message, portal: portal || null, companion: user?.companion || 'guardian' }),
      });
      if (r.ok) {
        const data = await r.json();
        setMsgs((m) => [...m, { role: 'assistant', text: data.reply || '…' }]);
      } else {
        setMsgs((m) => [...m, { role: 'assistant', text: 'I lost the thread for a second. Try that again.' }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'Connection dropped. Try again.' }]);
    }
    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="chat-root">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h}>{companion}</Text>
          <Text style={styles.sub}>{portal ? `${portalMeta[portal]?.name?.toUpperCase()} PORTAL CONTEXT` : 'CROSS-LIFE CONTEXT ACTIVE'}</Text>
        </View>
        <View style={styles.liveDot} />
      </View>

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
          {msgs.length === 0 && (
            <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>
              <Text style={styles.greeting}>
                {portal
                  ? `You're in ${portalMeta[portal]?.name}. ${portalMeta[portal]?.tagline}`
                  : `I'm watching all seven portals. Ask me anything about your day.`}
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
              <ActivityIndicator size="small" color="#00E5FF" />
              <Text style={[styles.bubbleText, { opacity: 0.6 }]}>{companion} is thinking…</Text>
            </View>
          )}
        </ScrollView>

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
          <Pressable accessibilityRole="button" style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]} onPress={() => send()} disabled={!input.trim() || busy} accessibilityLabel="Send message" testID="send-btn">
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
  sub: { fontSize: 9, letterSpacing: 2, color: '#00E5FF', fontWeight: '700', marginTop: 2 },
  liveDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: theme.color.energy },
  greeting: { fontSize: 17, fontWeight: '700', color: '#F3F4F6', lineHeight: 25 },
  suggestion: {
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)', backgroundColor: 'rgba(0,51,61,0.4)',
  },
  suggestionText: { fontSize: 13.5, fontWeight: '600', color: '#F3F4F6' },
  bubble: { maxWidth: '84%', padding: 14, borderRadius: 20, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1F222B', borderBottomRightRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,51,61,0.45)', borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.25)',
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
  sendBtn: { width: 48, height: 48, borderRadius: 999, backgroundColor: '#00E5FF', alignItems: 'center', justifyContent: 'center' },
});
