import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { WorldScene } from '@/components/staarwardd/world-scene';
import * as WebBrowser from 'expo-web-browser';
import { DiggitstaarCinematicIntro } from '@/components/staarwardd/diggitstaar-cinematic-intro';
import { DIGGITSTAAR_MEDIA_READY } from '@/lib/staarwardd/diggitstaar-cinematic-sources';

const PREFIX = 'diggitstaar:studio-command:v1';
function makeLocalRecordId(): string { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
type Lead = { id: string; company: string; contact: string; opportunity: string; stage: 'Research' | 'Qualified' | 'Draft ready' | 'Contacted' | 'Closed'; verified: boolean };
const LEAD_STAGES: Lead['stage'][] = ['Research', 'Qualified', 'Draft ready', 'Contacted', 'Closed'];
type Task = { id: string; title: string; client: string; status: 'Inbox' | 'In production' | 'Awaiting approval' | 'Delivered' };
const STATES: Task['status'][] = ['Inbox', 'In production', 'Awaiting approval', 'Delivered'];
export default function Diggitstaar() {
  const router = useRouter();
  const { height: deviceHeight } = useWindowDimensions();
  const { user, api } = useAuth();
  const authorized = !!user?.user_id && !user.is_demo;
  const key = `${PREFIX}:${encodeURIComponent(authorized ? user!.user_id : 'guest')}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [gmailFlow, setGmailFlow] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);
  const [gmailMessages, setGmailMessages] = useState<{ id: string; from: string; subject: string; date: string; snippet: string }[]>([]);
  const [leadCompany, setLeadCompany] = useState('');
  const [leadContact, setLeadContact] = useState('');
  const [leadOpportunity, setLeadOpportunity] = useState('');
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [sceneExpanded, setSceneExpanded] = useState(true);
  const [fullDesk, setFullDesk] = useState(true);
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [script, setScript] = useState('');
  const [focusPanel, setFocusPanel] = useState('');
  const [introVisible, setIntroVisible] = useState(DIGGITSTAAR_MEDIA_READY);
  const closeIntro = () => setIntroVisible(false);
  useEffect(() => {
    let active = true;
    // Clear prior account records before asynchronously rehydrating.
    void Promise.resolve().then(() => {
      if (active) { setLoaded(!authorized); setTasks([]); setNotice(''); }
    });
    if (!authorized) return () => { active = false; };
    void AsyncStorage.getItem(key).then(raw => {
      if (!active) return;
      if (raw) { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed)) setTasks(parsed.filter(x => x && typeof x.id === 'string' && typeof x.title === 'string' && STATES.includes(x.status))); }
      setLoaded(true);
    }).catch(() => { if (active) { setLoaded(true); setNotice('Local workload could not be loaded.'); } });
    return () => { active = false; };
  }, [key, authorized]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setLeads([]); });
    if (!authorized) return () => { active = false; };
    void AsyncStorage.getItem(key + ':leads').then(raw => { if (!active || !raw) return; const data: unknown = JSON.parse(raw); if (Array.isArray(data)) setLeads(data.filter(x => x && typeof x.id === 'string' && typeof x.company === 'string' && LEAD_STAGES.includes(x.stage))); }).catch(() => { if (active) setNotice('Lead register could not be loaded.'); });
    return () => { active = false; };
  }, [key, authorized]);
  const checkGmail = useCallback(async (signal?: AbortSignal) => {
    if (!authorized) return;
    try {
      const r = await api('/api/connections', { signal });
      if (!r.ok || signal?.aborted) return;
      const rows: {id:string;configured:boolean;connected:boolean}[] = await r.json();
      if (signal?.aborted) return;
      const gmail = rows.find(row => row.id === 'gmail');
      setGmailConfigured(!!gmail?.configured); setGmailConnected(!!gmail?.connected);
    } catch { if (!signal?.aborted) setNotice('Gmail status unavailable.'); }
  }, [authorized, api]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const accountScope = key;
    void Promise.resolve().then(() => {
      if (!active || !accountScope) return;
      setGmailConnected(false); setGmailConfigured(false); setGmailMessages([]);
      return checkGmail(controller.signal);
    });
    return () => { active = false; controller.abort(); };
  }, [key, checkGmail]);
  const startGmail = async () => {
    if (!authorized || gmailBusy) return;
    setGmailBusy(true);
    try { const response = await api('/api/connections/gmail/start', { method: 'POST' });
      if (!response.ok) { setNotice(response.status === 503 ? 'Gmail OAuth application credentials are not configured on the server.' : 'Could not start Gmail authorization.'); return; }
      const data: { flow: string; url: string } = await response.json();
      if (!data.url.startsWith('https://accounts.google.com/')) throw new Error('unexpected_oauth_host');
      setGmailFlow(data.flow); await WebBrowser.openBrowserAsync(data.url);
      setNotice('After granting Gmail read-only access, select Finish Gmail connection.');
    } catch { setNotice('Gmail authorization was not completed.'); } finally { setGmailBusy(false); }
  };
  const finishGmail = async () => {
    if (!gmailFlow || gmailBusy) return;
    setGmailBusy(true);
    try { const response = await api('/api/connections/gmail/finish/' + encodeURIComponent(gmailFlow), { method: 'POST' });
      if (!response.ok) { setNotice('Gmail authorization is pending, expired, or its read permission could not be verified.'); return; }
      setGmailFlow(null); await checkGmail(); setNotice('Gmail read-only access verified by the server.');
    } catch { setNotice('Gmail connection verification failed.'); } finally { setGmailBusy(false); }
  };
  const readGmail = async () => {
    if (!gmailConnected || gmailBusy) return;
    setGmailBusy(true);
    try { const response = await api('/api/connections/gmail/inbox');
      if (!response.ok) { setNotice('Gmail inbox read failed or authorization expired.'); await checkGmail(); return; }
      const data: { messages: {id:string;from:string;subject:string;date:string;snippet:string}[] } = await response.json();
      setGmailMessages(data.messages); setNotice('Read-only inbox refreshed. No messages sent or modified.');
    } catch { setNotice('Gmail inbox unavailable.'); } finally { setGmailBusy(false); }
  };
  const disconnectGmail = async () => {
    if (gmailBusy) return;
    setGmailBusy(true);
    try { const response = await api('/api/connections/gmail', { method: 'DELETE' });
      if (!response.ok) { setNotice('Could not disconnect Gmail.'); return; }
      setGmailConnected(false); setGmailFlow(null); setGmailMessages([]); setNotice('Stored Gmail connection removed.');
    } catch { setNotice('Could not disconnect Gmail.'); } finally { setGmailBusy(false); }
  };
  const save = (next: Task[]) => {
    if (!authorized) return;
    void AsyncStorage.setItem(key, JSON.stringify(next)).then(() => setTasks(next)).catch(() => Alert.alert('Not saved', 'Could not save workload on this device.'));
  };
  const saveLeads = (next: Lead[]) => {
    if (!authorized) return;
    void AsyncStorage.setItem(key + ':leads', JSON.stringify(next)).then(() => setLeads(next)).catch(() => setNotice('Could not save leads on this device.'));
  };
  const addLead = () => {
    if (!authorized || !leadCompany.trim() || !leadOpportunity.trim()) return;
    saveLeads([...leads, { id: makeLocalRecordId(), company: leadCompany.trim(), contact: leadContact.trim(), opportunity: leadOpportunity.trim(), stage: 'Research', verified: false }]);
    setLeadCompany(''); setLeadContact(''); setLeadOpportunity('');
  };
  const generate = () => {
    if (!authorized || !loaded || !client.trim() || !offer.trim() || !audience.trim() || !goal.trim()) { setNotice('Enter a client, offer, audience and campaign objective first.'); return; }
    const brand = client.trim(), service = offer.trim(), target = audience.trim(), objective = goal.trim();
    const draft = `DIGGITSTAAR | ${brand}\nAudience: ${target}\nOffer: ${service}\nObjective: ${objective}\n\n30-SECOND CONTENT DRAFT\n00–03s: Attention hook for ${target}.\n03–09s: Introduce the problem addressed by ${service}.\n09–17s: Show client-approved visuals and explain the offer.\n17–24s: Insert verified proof or a demonstration (client to supply).\n24–30s: Invite viewers to enquire about ${service}.\n\nCaption: Discover ${service} with ${brand}. Contact the team to learn more.\n\nProduction: 9:16 vertical; 5 shots; accessible captions; licensed footage; client-approved brand assets.\nStatus: Draft only; video not rendered or sent.`;
    const steps = ['Verify client brief and brand assets', 'Approve creative concept and claims', 'Create script and storyboard', 'Produce video and image assets', 'Edit and add captions', 'Request client review', 'Export approved deliverables'];
    const batch = makeLocalRecordId();
    const next = [...tasks, ...steps.map((step, index) => ({ id: `${batch}-${index}`, client: brand, title: step, status: 'Inbox' as const }))];
    void AsyncStorage.setItem(key, JSON.stringify(next)).then(() => { setTasks(next); setScript(draft); setNotice('Seven production tasks saved. Script is a draft, not rendered content.'); }).catch(() => setNotice('Could not save production workload.'));
  };
  const website = () => { void Linking.openURL('https://www.diggitstaar.com').catch(() => setNotice('Website could not be opened.')); };
  const add = () => {
    if (!title.trim() || !authorized) return;
    save([...tasks, { id: makeLocalRecordId(), title: title.trim(), client: client.trim(), status: 'Inbox' }]);
    setTitle(''); setClient('');
  };
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{ padding: 14, borderRadius: 13, borderWidth: 1, borderColor: '#B8A274', backgroundColor: disabled ? '#30343A' : '#1B2738', minHeight: 46 }}><Text style={{ color: '#F4E5C4', fontWeight: '800', textAlign: 'center' }}>{label}</Text></Pressable>;
  const field = (label: string, value: string, change: (v: string) => void) => <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor="#9EA9BA" value={value} onChangeText={change} editable={authorized && loaded} style={{ color: '#FFFFFF', borderWidth: 1, borderColor: '#68768B', borderRadius: 12, padding: 13, minHeight: 46 }} />;
  return <>
    <ScrollView scrollEnabled={!fullDesk} style={{ flex: 1, backgroundColor: fullDesk ? '#EAF5FF' : '#060B14' }} contentContainerStyle={{ padding: 20, paddingTop: fullDesk ? 25 : 60, paddingBottom: 65, gap: 16 }}>
    {!fullDesk && button('Back to STAARWAARDD portals', () => router.replace('/hub'))}
    {!fullDesk && <Text style={{ color: '#F3D9A4', fontSize: 29, fontWeight: '900', letterSpacing: 1 }}>DIGGITSTAAR</Text>}
    {!fullDesk && <Text style={{ color: '#C6D9EF' }}>YOUR IMMERSIVE 3D WORKSTATION · TOUCH THE HOLOGRAPHIC SCREENS</Text>}
    <View style={{ height: sceneExpanded ? (fullDesk ? deviceHeight * .72 : 420) : 0, overflow: 'hidden', borderRadius: 20, borderWidth: sceneExpanded ? 1 : 0, borderColor: '#9BCBFF', backgroundColor: '#DCEEFF' }}>
      {sceneExpanded && <WorldScene world="diggitstaar" onAction={action => { if (action === 'diggitstaar:website') { website(); return; } if (action.startsWith('diggitstaar:')) { setFocusPanel(action.slice(12)); setSceneExpanded(false); setFullDesk(false); setNotice('Selected ' + action.slice(12) + ' workstation controls.'); } }} />}
    </View>
    {button(fullDesk ? 'Open production controls' : 'Return to immersive 3D desk', () => { setFullDesk(!fullDesk); setSceneExpanded(fullDesk ? false : true); })}
    {fullDesk && button('Back to STAARWAARDD portals', () => router.replace('/hub'))}
    {fullDesk && button('Visit DIGGITSTAAR website', website)}
    {DIGGITSTAAR_MEDIA_READY && button('Replay approved workstation cinematic', () => setIntroVisible(true))}
    {!fullDesk && <View style={{ gap: 14 }}>
    {!!focusPanel && <Text accessibilityRole="header" style={{ color: '#A8D9FF', fontWeight: '800', fontSize: 19 }}>Selected touchscreen: {focusPanel.toUpperCase()}</Text>}
    {button('Visit www.diggitstaar.com', website)}
    <Text style={{ color: '#D5DFEE', fontSize: 15 }}>AI Content Agency · Business Command Centre</Text>
    <View style={{ padding: 17, backgroundColor: '#121D2D', borderRadius: 18, borderWidth: 1, borderColor: '#6C7990', gap: 10 }}>
      <Text style={{ color: '#F5E3BE', fontSize: 19, fontWeight: '800' }}>Gmail workspace</Text>
      <Text style={{ color: gmailConnected ? '#B4EDCB' : '#F1C9A0', fontWeight: '700' }}>{gmailConnected ? 'Read-only connected' : gmailConfigured ? 'Not connected' : 'Server OAuth configuration required'}</Text>
      <Text style={{ color: '#D2DAE6', lineHeight: 21 }}>Separate Google consent with Gmail read-only permission. No sending, deleting, modifying, or automatic outreach. Mail is fetched only when requested.</Text>
      {!gmailConnected && button('Authorize Gmail read-only access', () => { void startGmail(); }, !authorized || !gmailConfigured || gmailBusy)}
      {!!gmailFlow && button('Finish Gmail connection', () => { void finishGmail(); }, gmailBusy)}
      {gmailConnected && button('Refresh inbox · read-only', () => { void readGmail(); }, gmailBusy)}
      {gmailMessages.map(message => <View key={message.id} style={{ padding: 10, borderWidth: 1, borderColor: '#506985', borderRadius: 10, gap: 4 }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{message.subject || '(no subject)'}</Text><Text style={{ color: '#D2DAE6' }}>{message.from}</Text><Text style={{ color: '#AEBED0' }}>{message.snippet}</Text></View>)}
      {gmailConnected && button('Disconnect Gmail', () => { void disconnectGmail(); }, gmailBusy)}
    </View>
    <View style={{ padding: 16, borderRadius: 16, borderColor: '#A4D4FF', borderWidth: 1, backgroundColor: '#17283E', gap: 11 }}>
      <Text style={{ color: '#F3D9A4', fontSize: 21, fontWeight: '800' }}>AI Creative Production</Text>
      <Text style={{ color: '#C5D9F0' }}>Generate a client-specific script draft and seven production tasks. No video generation provider is connected yet.</Text>
      {field('Client / brand', client, setClient)}
      {field('Product or service', offer, setOffer)}
      {field('Target audience', audience, setAudience)}
      {field('Campaign objective', goal, setGoal)}
      {button('Generate script + workload', generate, !authorized || !loaded)}
      {!!script && <Text selectable style={{ color: '#FFFFFF', lineHeight: 23 }}>{script}</Text>}
      {!!script && button('Share script draft', () => { void Share.share({ message: script }).catch(() => setNotice('Sharing unavailable.')); })}
    </View>
    <Text style={{ color: '#F3D9A4', fontSize: 21, fontWeight: '800' }}>Production tools</Text>
    {button('Open AI creative assistant', () => router.push('/chat'))}
    <Text style={{ color: '#C5D9F0' }}>Gmail, video generation, editing, lead sourcing and analytics require separately authorized, verified integrations. No connection is implied by these controls.</Text>
    <View style={{ padding: 16, borderRadius: 16, borderColor: '#A4D4FF', borderWidth: 1, backgroundColor: '#17283E', gap: 10 }}>
      <Text style={{ color: '#F3D9A4', fontSize: 21, fontWeight: '800' }}>Client Leads & Opportunities</Text>
      <Text style={{ color: '#C5D9F0' }}>Private, account-scoped lead register. No contacts are invented, automatically researched or emailed.</Text>
      {field('Prospective company', leadCompany, setLeadCompany)}
      {field('Contact details (optional)', leadContact, setLeadContact)}
      {field('Potential project', leadOpportunity, setLeadOpportunity)}
      {button('Add lead for research', addLead, !authorized || !leadCompany.trim() || !leadOpportunity.trim())}
      {leads.map(lead => <View key={lead.id} style={{ borderColor: '#6B829A', borderWidth: 1, padding: 12, borderRadius: 12, gap: 7 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{lead.company}</Text>
        <Text style={{ color: '#C5D9F0' }}>{lead.opportunity}{lead.contact ? ` · ${lead.contact}` : ''}</Text>
        <Text style={{ color: lead.verified ? '#B4EDCB' : '#F1C9A0' }}>{lead.verified ? 'Manually marked verified' : 'Unverified — research required'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{LEAD_STAGES.map(stage => <Pressable key={stage} accessibilityRole="button" onPress={() => saveLeads(leads.map(l => l.id === lead.id ? { ...l, stage } : l))} style={{ backgroundColor: stage === lead.stage ? '#6D5A38' : '#26394E', borderRadius: 8, padding: 9 }}><Text style={{ color: '#FFFFFF' }}>{stage}</Text></Pressable>)}</View>
        {button(lead.verified ? 'Mark verification pending' : 'Mark manually verified', () => saveLeads(leads.map(l => l.id === lead.id ? { ...l, verified: !l.verified } : l)))}
        {button('Remove lead', () => saveLeads(leads.filter(l => l.id !== lead.id)))}
      </View>)}
      {button('Share leads for review', () => { void Share.share({ message: leads.map(l => `${l.company} | ${l.opportunity} | ${l.stage} | ${l.verified ? 'Manually verified' : 'Unverified'}`).join('\n') || 'No leads recorded' }).catch(() => setNotice('Sharing unavailable.')); }, !authorized)}
    </View>
    <Text style={{ color: '#F3D9A4', fontSize: 21, fontWeight: '800' }}>Workload overview</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{STATES.map(status => <View key={status} style={{ backgroundColor: '#152237', borderRadius: 12, padding: 12, minWidth: '45%', flexGrow: 1 }}><Text style={{ color: '#D7E3F1', fontSize: 12 }}>{status}</Text><Text style={{ color: '#FFFFFF', fontSize: 25, fontWeight: '800' }}>{tasks.filter(t => t.status === status).length}</Text></View>)}</View>
    <Text style={{ color: '#D8E2EE', fontWeight: '700' }}>Add a client task manually</Text>
    {field('Client / brand', client, setClient)}
    {field('Deliverable or request', title, setTitle)}
    {button('Add to workload', add, !authorized || !loaded || !title.trim())}
    {!authorized && <Text style={{ color: '#F1C9A0' }}>Sign in to save business tasks. Guest accounts cannot store client data.</Text>}
    {tasks.map(task => <View key={task.id} style={{ padding: 15, borderWidth: 1, borderColor: '#4F6178', borderRadius: 14, gap: 9 }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{task.title}</Text><Text style={{ color: '#C7D3E3' }}>{task.client || 'Unassigned client'} · {task.status}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{STATES.map(status => <Pressable key={status} accessibilityRole="button" accessibilityLabel={`Mark ${task.title} ${status}`} onPress={() => save(tasks.map(t => t.id === task.id ? { ...t, status } : t))} style={{ padding: 8, borderRadius: 8, backgroundColor: task.status === status ? '#72603F' : '#273449' }}><Text style={{ color: '#FFFFFF', fontSize: 11 }}>{status}</Text></Pressable>)}</View>{button('Remove task', () => Alert.alert('Remove task?', 'This removes the local task only.', [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => save(tasks.filter(t => t.id !== task.id)) }]))}</View>)}
    {button('Share workload summary', () => { void Share.share({ message: `DIGGITSTAAR workload\n${tasks.map(t => `${t.status}: ${t.client} — ${t.title}`).join('\n') || 'No tasks recorded'}` }).catch(() => setNotice('Sharing is unavailable.')); }, !authorized)}
    <Text style={{ color: '#AEBBCD', lineHeight: 20 }}>Local, account-scoped preview only. Gmail, Drive, Calendar, and production integrations are not yet connected. No messages are read or sent from this screen.</Text>
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#F1D9AA' }}>{notice}</Text>}
    </View>}
  </ScrollView>
    {DIGGITSTAAR_MEDIA_READY && introVisible && <DiggitstaarCinematicIntro onFinish={closeIntro} />}
  </>;
}
