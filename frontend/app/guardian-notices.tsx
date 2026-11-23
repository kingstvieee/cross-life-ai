import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth';
import {
  applyNoticeRead, guardianNoticeClient, mergeNoticePages, NoticeRequestError, type GuardianNotice,
} from '@/src/guardian-notices';

export default function GuardianNotices() {
  const { user, loading } = useAuth();
  if (loading || !user || user.is_demo) return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.text}>{loading ? 'Loading Guardian notices…' : 'Sign in to see Guardian notices.'}</Text>
    </SafeAreaView>
  );
  return <OwnerInbox key={user.user_id} />;
}

function OwnerInbox() {
  const { api } = useAuth();
  const router = useRouter();
  const client = useMemo(() => guardianNoticeClient(api), [api]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [rows, setRows] = useState<GuardianNotice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);

  const refreshSummary = useCallback(async (signal: AbortSignal) => {
    const summary = await client.summary(signal).catch(() => null);
    if (!signal.aborted) setUnreadCount(summary?.unread ?? null);
  }, [client]);

  const refresh = useCallback(async (signal: AbortSignal) => {
    const [page] = await Promise.all([client.list(unreadOnly, undefined, signal), refreshSummary(signal)]);
    if (signal.aborted) return;
    setRows(page.notices);
    setCursor(page.next_cursor);
    setLoaded(true);
  }, [client, refreshSummary, unreadOnly]);

  const perform = useCallback(async (task: (signal: AbortSignal) => Promise<void>) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      await task(controller.signal);
    } catch (issue) {
      if (!controller.signal.aborted) {
        setError(issue instanceof NoticeRequestError ? issue.message : 'Guardian notices are temporarily unavailable.');
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void perform(refresh);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void perform(refresh);
      else {
        request.current?.abort();
        request.current = null;
        setBusy(false);
      }
    });
    return () => {
      subscription.remove();
      request.current?.abort();
      request.current = null;
    };
  }, [perform, refresh]));

  function changeFilter(next: boolean) {
    if (unreadOnly === next) return;
    setLoaded(false);
    setRows([]);
    setCursor(null);
    setUnreadOnly(next);
  }

  function loadMore() {
    if (!cursor) return;
    void perform(async signal => {
      try {
        const page = await client.list(unreadOnly, cursor, signal);
        if (signal.aborted) return;
        setRows(current => mergeNoticePages(current, page.notices));
        setCursor(page.next_cursor);
      } catch (issue) {
        if (!(issue instanceof NoticeRequestError) || issue.detail !== 'notice_cursor_not_found') throw issue;
        if (!signal.aborted) await refresh(signal);
      }
    });
  }

  function openNotice(notice: GuardianNotice) {
    void perform(async signal => {
      if (notice.read_at === null) {
        const receipt = await client.read(notice.notice_id, signal);
        if (signal.aborted) return;
        setRows(current => applyNoticeRead(current, notice.notice_id, receipt.read_at, unreadOnly));
        await refreshSummary(signal);
      }
      if (signal.aborted) return;
      const mission = await client.mission(notice.notice_id, signal);
      if (!signal.aborted) router.push({ pathname: '/guardian-missions', params: { missionId: mission.mission_id } });
    });
  }

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <NoticeButton label="Back to missions" onPress={() => router.back()} />
      <Text accessibilityRole="header" style={styles.heading}>Guardian notices</Text>
      <Text accessibilityLiveRegion="polite" style={styles.muted}>
        {unreadCount === null ? 'Unread count unavailable' : `${unreadCount} unread`}
      </Text>
      <View style={styles.controls}>
        <NoticeButton label="All notices" onPress={() => changeFilter(false)} selected={!unreadOnly} disabled={busy} />
        <NoticeButton label="Unread only" onPress={() => changeFilter(true)} selected={unreadOnly} disabled={busy} />
        <NoticeButton label={error ? 'Retry' : 'Refresh'} onPress={() => void perform(refresh)} disabled={busy} />
      </View>
      {busy && <ActivityIndicator accessibilityLabel="Updating Guardian notices" color="#E9C987" />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loaded && rows.length === 0 && !busy && !error &&
        <Text style={styles.muted}>{unreadOnly ? 'No unread notices.' : 'No Guardian notices yet.'}</Text>}
      {rows.map(notice => {
        const time = new Date(notice.created_at).toLocaleString();
        const state = notice.read_at === null ? 'Unread' : 'Read';
        return <Pressable key={notice.notice_id} style={styles.card} accessibilityRole="button" disabled={busy}
          accessibilityLabel={`${notice.label}, ${state}, ${time}`} accessibilityHint="Opens the associated mission"
          onPress={() => openNotice(notice)}>
          <Text style={styles.text}>{notice.label}</Text>
          <Text style={styles.muted}>{time} · {state}</Text>
        </Pressable>;
      })}
      {cursor && <NoticeButton label="Load older notices" onPress={loadMore} disabled={busy} />}
    </ScrollView>
  </SafeAreaView>;
}

function NoticeButton({ label, onPress, selected, disabled }: {
  label: string; onPress: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }}
    disabled={disabled} style={[styles.button, selected && styles.selected]} onPress={onPress}>
    <Text style={styles.text}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101820' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 12 },
  heading: { color: '#FFF9ED', fontWeight: '700', fontSize: 26 },
  text: { color: '#FFF9ED', fontWeight: '600', fontSize: 16 },
  muted: { color: '#C1CED8', fontSize: 14 },
  error: { color: '#FFD2BF', fontSize: 15 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#657580',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  card: { minHeight: 44, borderWidth: 1, borderColor: '#657580', borderRadius: 8, padding: 14, gap: 6 },
  selected: { borderColor: '#E9C987', backgroundColor: '#273441' },
});
