import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth';
import {
  followsMissionStatus, guardianMissionClient, mergeMissionPages, updateMissionInPage,
  type Mission, type MissionAction,
} from '@/src/guardian-missions';

const FILTERS = [
  ['', 'All'], ['proposed', 'Proposed'], ['queued', 'Queued'],
  ['verifying', 'Verifying'], ['completed', 'Completed'],
  ['blocked', 'Blocked'], ['cancelled', 'Cancelled'],
] as const;

const ACTIONS: Record<MissionAction, string> = {
  withdraw: 'Withdraw proposal',
  'cancel-pending': 'Cancel pending mission',
  'queue-preview': 'Queue zero-cost preview',
  'acknowledge-preview': 'Acknowledge result',
};

const EMPTY_DRAFT = { objective: '', criteria: '', deadline: '' };
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase());
const localTime = (date: string) => new Date(date).toLocaleString();

export default function GuardianMissions() {
  const { user } = useAuth();
  if (!user || user.is_demo) return null;
  return <AccountMissions key={user.user_id} />;
}

function AccountMissions() {
  const { api } = useAuth();
  const client = useMemo(() => guardianMissionClient(api), [api]);
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number | null>(null);
  const [selected, setSelected] = useState<Mission | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState('');
  const request = useRef<AbortController | null>(null);
  const pollingRequest = useRef<AbortController | null>(null);
  const draftKey = useRef<string | null>(null);

  const reload = useCallback(async (signal: AbortSignal) => {
    const [page, summary] = await Promise.allSettled([client.list(status, undefined, signal, search, order), client.summary(signal)]);
    if (signal.aborted) return;
    if (page.status === 'fulfilled') {
      setMissions(page.value.missions);
      setCursor(page.value.next_cursor);
      setResultsLoaded(true);
    }
    if (summary.status === 'fulfilled') {
      setCounts(summary.value.counts);
      setTotal(summary.value.total);
    }
    if (page.status === 'rejected') throw page.reason;
    if (summary.status === 'rejected') setNotice('Mission totals are temporarily unavailable.');
  }, [client, status, search, order]);

  const perform = useCallback(async (task: (signal: AbortSignal) => Promise<void>) => {
    if (request.current) return;
    pollingRequest.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setNotice('');
    try {
      await task(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'The mission request failed.');
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void perform(reload);
    return () => {
      request.current?.abort();
      request.current = null;
      setBusy(false);
    };
  }, [perform, reload]));

  const selectedId = selected?.mission_id;
  const followsMission = followsMissionStatus(selected?.status);
  useFocusEffect(useCallback(() => {
    if (!selectedId || !followsMission) return;
    const refresh = async () => {
      if (AppState.currentState !== 'active' || request.current || pollingRequest.current) return;
      const controller = new AbortController();
      pollingRequest.current = controller;
      const { signal } = controller;
      try {
        const detail = await client.detail(selectedId, signal);
        if (signal.aborted) return;
        setSelected(current => current?.mission_id === selectedId ? detail : current);
        setMissions(current => updateMissionInPage(current, detail, status));
      } catch {
        // The next foreground poll or explicit refresh can recover the status.
      } finally {
        if (pollingRequest.current === controller) pollingRequest.current = null;
      }
    };
    const interval = setInterval(() => void refresh(), 5000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
      else pollingRequest.current?.abort();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
      pollingRequest.current?.abort();
      pollingRequest.current = null;
    };
  }, [client, followsMission, selectedId, status]));

  function updateDraft(field: keyof typeof EMPTY_DRAFT, value: string) {
    draftKey.current = null;
    setDraft(previous => ({ ...previous, [field]: value }));
  }

  function submit() {
    void perform(async signal => {
      draftKey.current ??= randomUUID();
      const result = await client.propose(draft, draftKey.current, signal);
      if (signal.aborted) return;
      setDraft(EMPTY_DRAFT);
      draftKey.current = null;
      setFormOpen(false);
      setFeedback('Proposal saved.');
      await reload(signal);
      if (!signal.aborted) {
        const detail = await client.detail(result.mission_id, signal);
        if (!signal.aborted) setSelected(detail);
      }
    });
  }

  function openMission(id: string) {
    void perform(async signal => {
      const detail = await client.detail(id, signal);
      if (signal.aborted) return;
      setSelected(detail);
      setSchedule('');
      setFeedback('');
    });
  }

  function runAction(action: MissionAction) {
    if (!selected) return;
    void perform(async signal => {
      await client.action(selected, action, schedule, signal);
      if (signal.aborted) return;
      setFeedback(action === 'queue-preview' ? 'Preview queued.' :
        action === 'acknowledge-preview' ? 'Result acknowledged.' : 'Mission cancelled.');
      setSelected(null);
      const detail = await client.detail(selected.mission_id, signal);
      if (signal.aborted) return;
      setSelected(detail);
      await reload(signal);
    });
  }

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Button label="Back to Guardian controls" onPress={() => router.back()} />
      <Text accessibilityRole="header" style={styles.heading}>Guardian missions</Text>
      {total !== null && <Text style={styles.muted}>{total} missions in this account</Text>}
      <View style={styles.row}>
        <Button label={formOpen ? 'Hide proposal form' : 'New proposal'} disabled={busy}
          onPress={() => setFormOpen(!formOpen)} />
        <Button label="Refresh missions" disabled={busy} onPress={() => void perform(async signal => {
          await reload(signal);
          if (selected && !signal.aborted) {
            const detail = await client.detail(selected.mission_id, signal);
            if (!signal.aborted) setSelected(detail);
          }
        })} />
      </View>
      {busy && <ActivityIndicator accessibilityLabel="Updating missions" color="#DDE3EB" />}
      {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.text}>{feedback}</Text>}
      {formOpen && <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.subheading}>New mission proposal</Text>
        <Input label="Objective" value={draft.objective} onChange={value => updateDraft('objective', value)} busy={busy} multiline />
        <Input label="Success criteria" value={draft.criteria} onChange={value => updateDraft('criteria', value)} busy={busy} multiline />
        <Input label="Deadline with timezone (optional)" value={draft.deadline} onChange={value => updateDraft('deadline', value)} busy={busy} />
        <Button label="Save proposal" onPress={submit} disabled={busy} />
      </View>}
      {selected && <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.subheading}>{selected.objective}</Text>
        <Text style={styles.text}>{selected.success_criteria}</Text>
        <Text style={styles.muted}>Status: {titleCase(selected.status)}</Text>
        {selected.not_before && <Text style={styles.muted}>Scheduled: {localTime(selected.not_before)}</Text>}
        {selected.expires_at && <Text style={styles.muted}>Deadline: {localTime(selected.expires_at)}</Text>}
        {typeof selected.evidence?.passed === 'boolean' && <Text style={styles.text}>
          {selected.evidence.passed ? 'Verification passed' : 'Verification failed'}
          {selected.evidence.verified_at ? ` · ${localTime(selected.evidence.verified_at)}` : ''}
        </Text>}
        {selected.evidence?.result_digest && <Text selectable style={styles.muted}>{selected.evidence.result_digest}</Text>}
        {selected.preview_acknowledged_at && <Text style={styles.muted}>
          Acknowledged: {localTime(selected.preview_acknowledged_at)}
        </Text>}
        {selected.available_actions?.includes('queue-preview') && <Input
          label="Start time with timezone (optional)" value={schedule} onChange={setSchedule} busy={busy} />}
        <View style={styles.row}>
          {selected.available_actions?.map(action => ACTIONS[action] && <Button key={action}
            label={ACTIONS[action]} onPress={() => runAction(action)} disabled={busy} />)}
          <Button label="Close mission details" disabled={busy} onPress={() => setSelected(null)} />
        </View>
      </View>}
      <View style={styles.row}>
        {FILTERS.map(([value, label]) => <Button key={value || 'all'}
          label={counts[value] === undefined ? label : `${label} (${counts[value]})`}
          selected={status === value} disabled={busy} onPress={() => {
            if (status === value) return;
            setResultsLoaded(false);
            setMissions([]);
            setCursor(null);
            setStatus(value);
          }} />)}
      </View>
      <View style={styles.card}>
        <Input label="Search mission objectives or success criteria" value={searchDraft}
          onChange={setSearchDraft} busy={busy} maxLength={120} />
        <View style={styles.row}>
          <Button label="Refresh results" disabled={busy} onPress={() => { void perform(reload); }} />
          <Button label="Apply search" disabled={busy} onPress={() => {
            const term = searchDraft.trim();
            if (term.length > 120) { setNotice('Search must be 120 characters or fewer.'); return; }
            setNotice('');
            if (term === search) {
              void perform(reload);
            } else {
              setResultsLoaded(false); setMissions([]); setCursor(null); setSearch(term);
            }
          }} />
          <Button label="Clear search" disabled={busy} onPress={() => {
            setSearchDraft('');
            if (search === '') {
              void perform(reload);
            } else {
              setResultsLoaded(false); setMissions([]); setCursor(null); setSearch('');
            }
          }} />
          <Button label={order === 'newest' ? 'Newest first' : 'Oldest first'} disabled={busy}
            onPress={() => { setResultsLoaded(false); setMissions([]); setCursor(null);
              setOrder(current => current === 'newest' ? 'oldest' : 'newest'); }} />
        </View>
      </View>
      {!resultsLoaded && busy && <Text accessibilityLiveRegion="polite" style={styles.muted}>Loading mission results…</Text>}
      {!resultsLoaded && !busy && !!notice && <Button label="Retry loading missions" onPress={() => void perform(reload)} />}
      {resultsLoaded && !busy && <Text accessibilityLiveRegion="polite" style={styles.muted}>
        {missions.length} missions displayed{cursor ? '; more available' : ''}
        {search ? ` · Search: ${search}` : ''}
      </Text>}
      {missions.map(mission => <Pressable key={mission.mission_id} accessibilityRole="button"
        disabled={busy} style={styles.card} onPress={() => openMission(mission.mission_id)}>
        <Text style={styles.text}>{mission.objective}</Text>
        <Text style={styles.muted}>{titleCase(mission.status)}</Text>
      </Pressable>)}
      {resultsLoaded && !busy && !notice && missions.length === 0 && <Text style={styles.muted}>No missions match this view.</Text>}
      {cursor && <Button label="Load more missions" disabled={busy} onPress={() => void perform(async signal => {
        const page = await client.list(status, cursor, signal, search, order);
        if (signal.aborted) return;
        if (page.next_cursor === cursor || (page.missions.length === 0 && page.next_cursor)) {
          setCursor(null);
          setNotice(page.next_cursor === cursor
            ? 'Pagination stopped because the server repeated its cursor. Refresh results to retry.'
            : 'Pagination stopped because the server returned an empty page with another cursor. Refresh results to retry.');
          return;
        }
        setMissions(previous => mergeMissionPages(previous, page.missions));
        setCursor(page.next_cursor);
      })} />}
    </ScrollView>
  </SafeAreaView>;
}

function Button({ label, onPress, disabled, selected }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }}
    disabled={disabled} onPress={onPress} style={[styles.button, selected && styles.selected, disabled && styles.disabled]}>
    <Text style={styles.text}>{label}</Text>
  </Pressable>;
}

function Input({ label, value, onChange, busy, multiline, maxLength }: {
  label: string; value: string; onChange: (value: string) => void; busy: boolean; multiline?: boolean; maxLength?: number;
}) {
  return <View style={styles.field}>
    <Text style={styles.text}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!busy}
      multiline={multiline} autoCapitalize={multiline ? 'sentences' : 'none'}
      maxLength={maxLength ?? (multiline ? 2000 : 50)} style={styles.input} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080A0E' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 72, gap: 14 },
  heading: { color: '#F1F4F8', fontSize: 30, fontWeight: '700' },
  subheading: { color: '#F1F4F8', fontSize: 18, fontWeight: '700' },
  card: { padding: 16, borderRadius: 14, borderColor: '#3E4959', borderWidth: 1, backgroundColor: '#141923', gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 6 },
  input: { minHeight: 44, borderRadius: 8, borderColor: '#647387', borderWidth: 1, color: '#F1F4F8', padding: 9 },
  button: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#647387' },
  selected: { backgroundColor: '#344456', borderColor: '#DBE6F8' },
  disabled: { opacity: 0.5 },
  text: { color: '#E2EAF5', fontSize: 14 },
  muted: { color: '#ABB8C8', fontSize: 13 },
  notice: { color: '#F0D49A', fontSize: 14 },
});
