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
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, flexGrow: 1 }}
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
                  <Pressable key={i} style={styles.suggestion} onPress={() => send(s)} testID={`suggestion-${i}`}>
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
              <ActivityIndicator size="small" color="#0A0A0A" />
              <Text style={[styles.bubbleText, { opacity: 0.5 }]}>{companion} is thinking…</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${companion}…`}
            placeholderTextColor="rgba(10,10,10,0.35)"
            onSubmitEditing={() => send()}
            returnKeyType="send"
            testID="chat-input"
          />
          <Pressable style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]} onPress={() => send()} disabled={!input.trim() || busy} testID="send-btn">
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.06)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.12)', backgroundColor: '#FFFFFF',
  },
  h: { fontSize: 19, fontWeight: '800', color: '#0A0A0A' },
  sub: { fontSize: 9, letterSpacing: 2, color: '#0A0A0A', opacity: 0.5, fontWeight: '700', marginTop: 2 },
  liveDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: theme.color.energy },
  greeting: { fontSize: 17, fontWeight: '700', color: '#0A0A0A', lineHeight: 25 },
  suggestion: {
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.14)', backgroundColor: '#F5F5F7',
  },
  suggestionText: { fontSize: 13.5, fontWeight: '600', color: '#0A0A0A' },
  bubble: { maxWidth: '84%', padding: 14, borderRadius: 20, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0A0A0A', borderBottomRightRadius: 6 },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: '#F5F5F7', borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.06)',
  },
  bubbleText: { fontSize: 14.5, lineHeight: 21, color: '#0A0A0A' },
  inputRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)', backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1, height: 48, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(10,10,10,0.12)',
    paddingHorizontal: 18, fontSize: 14.5, color: '#0A0A0A', backgroundColor: '#F5F5F7',
  },
  sendBtn: { width: 48, height: 48, borderRadius: 999, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
});
