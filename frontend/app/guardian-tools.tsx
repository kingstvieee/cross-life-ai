import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { bindCheckinAccount } from '@/src/checkins';
import { relationshipNotesMode } from '@/src/relationship-notes';

type Note = {factId:string; revision:number; portal:string; text:string; sourceId:string; sourceSpan:string};
const PORTALS = ['home','work','creativity','wellbeing','relationships','community','style'];
const CORE = '/api/guardian/core/workflows/rsf-fabric-sourcing';
export default function GuardianTools() {
  const {user} = useAuth();
  const {view} = useLocalSearchParams<{view?: string}>();
  const router = useRouter();
  const mode = relationshipNotesMode(view, user);
  if (mode === 'unavailable') return <SafeAreaView style={s.root}><View style={s.header}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={s.link}>Back</Text></Pressable>
    <Text accessibilityRole="alert" style={s.copy}>Relationship notes are unavailable for this account.</Text>
  </View></SafeAreaView>;
  return user ? <GuardianToolsAccount key={user.user_id + ':' + mode} relationshipOnly={mode === 'relationship-notes'}/> : null;
}
function GuardianToolsAccount({relationshipOnly}: {relationshipOnly: boolean}) {
  const {user, api} = useAuth();
  const audio = useStaarAudio();
  const router = useRouter();
  const [portal,setPortal] = useState(relationshipOnly ? 'relationships' : (user?.portals_enabled?.[0] || 'work'));
  const [recordsReady,setRecordsReady] = useState(false);
  const [notes,setNotes] = useState<Note[]>([]);
  const [events,setEvents] = useState<any[]>([]);
  const [overview,setOverview] = useState<any>(null);
  const [text,setText] = useState('');
  const [source,setSource] = useState('Personal note');
  const [editing,setEditing] = useState<Note|null>(null);
  const [removing,setRemoving] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const checked = useCallback(async(path:string,init?:RequestInit)=>{
    const response=await api(path,init);
    if (relationshipOnly && (response.status === 401 || response.status === 403)) {
      setNotes([]); setRecordsReady(false); setEditing(null); setRemoving(null); setText(''); setSource('Personal note');
      throw new Error('Relationship notes are unavailable for this account.');
    }
    if(!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.detail === 'memory_revision_conflict' ? 'This note changed elsewhere. Reload before correcting it.' : `Guardian could not complete this request (${response.status}).`); }
    return response.json();
  },[api,relationshipOnly]);
  const load=useCallback(async()=>{
    if (relationshipOnly) {
      setRecordsReady(false);
      const memory=await checked(`/api/guardian/life-map/records?portal=relationships`);
      if (!Array.isArray(memory.records)) throw new Error('Relationship notes could not be verified.');
      setNotes(memory.records.filter((record: Note | null) => record?.portal === 'relationships'));
      setRecordsReady(true);
      return;
    }
    const [memory,inbox,state]=await Promise.all([checked(`/api/guardian/life-map/records?portal=${encodeURIComponent(portal)}`),checked('/api/guardian/life-map/notifications'),checked('/api/guardian/life-map/overview')]);
    setNotes(memory.records);setEvents(inbox.events);setOverview(state);
    audio.setAccountSpeechQuiet(state.speechQuiet === true);
  },[checked,portal,audio.setAccountSpeechQuiet,relationshipOnly]);
  useEffect(()=>{let active=true;setBusy(true);load().catch(e=>{if(active)setNotice(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[load]);
  async function perform(task:()=>Promise<unknown>) {setBusy(true);setNotice('');try{await task();await load();}catch(e){setNotice(e instanceof Error?e.message:'The request failed.');}finally{setBusy(false);}}
  const save=()=>perform(async()=>{
    if (relationshipOnly && !recordsReady) throw new Error('Load your relationship notes before saving.');
    if(!text.trim() || !source.trim()) throw new Error('Add the note and its source first.');
    await checked('/api/guardian/life-map/records',{method:'PUT',body:JSON.stringify({fact_id:editing?.factId || `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,portal,text:text.trim(),source_id:source.trim(),source_span:text.trim(),expected_revision:editing?.revision || 0})});
    setText('');setEditing(null);setSource('Personal note');setNotice('Saved with source and revision.');
  });
  const consent=overview?.consent || {};
  return <SafeAreaView style={s.root}><View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={relationshipOnly ? "Back to Love Realm" : "Back to Hub"} onPress={()=>router.back()}><Text style={s.link}>{relationshipOnly ? "‹ LOVE REALM" : "‹ HUB"}</Text></Pressable><Text accessibilityRole="header" style={s.title}>{relationshipOnly ? "Relationship notes" : "Guardian continuity"}</Text></View><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    <Text style={s.copy}>{relationshipOnly ? "Save plans or commitments to your private Relationships Life Map. Nothing is sent to your contacts." : "Your Life Map, interruption preferences and action evidence."}</Text>
    {!relationshipOnly && !user?.is_demo && <Pressable accessibilityRole="button" onPress={() => router.push('/guardian-missions')} style={s.button}>
      <Text style={s.buttonText}>Open Guardian missions</Text>
    </Pressable>}
    {busy && <ActivityIndicator accessibilityLabel="Updating Guardian" color="#DDE3EB"/>}
    {!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
    {!relationshipOnly && <View style={s.card}><Text style={s.heading}>Presence & privacy</Text>
      <View style={s.row}><Text style={s.label}>Greet me on arrival</Text><Switch accessibilityLabel="Arrival greetings" disabled={busy} value={!!consent.greetings} onValueChange={value=>perform(async()=>{await checked(CORE+'/proactive-consent',{method:'POST',body:JSON.stringify({greetings:value,check_ins:!!consent.checkIns})});if(value)audio.update({master:true,voice:true});})}/></View>
      <View style={s.row}><Text style={s.label}>Discretionary check-ins</Text><Switch accessibilityLabel="Discretionary check-ins" disabled={busy} value={!!consent.checkIns} onValueChange={value=>perform(async()=>{if(!value)await bindCheckinAccount('');await checked(CORE+'/proactive-consent',{method:'POST',body:JSON.stringify({greetings:!!consent.greetings,check_ins:value})});})}/></View>
      <View style={s.row}><Text style={s.label}>Quiet speech</Text><Switch accessibilityLabel="Quiet Guardian speech" disabled={busy} value={!!overview?.speechQuiet || audio.speechQuiet} onValueChange={value=>{if(value)audio.setSpeechQuiet(true);void perform(async()=>{await checked(CORE+'/speech',{method:'POST',body:JSON.stringify({quiet:value})});audio.setAccountSpeechQuiet(value);if(!value)audio.setSpeechQuiet(false);});}}/></View>
      <View style={s.row}><Text style={s.label}>Private mode</Text><Switch accessibilityLabel="Guardian private mode" disabled={busy} value={!!overview?.privateMode} onValueChange={value=>{if(value){audio.setSpeechQuiet(true);audio.stopAll();}void perform(async()=>{if(value)await bindCheckinAccount('');await checked('/api/guardian/core/private-mode',{method:'POST',body:JSON.stringify({enabled:value})});});}}/></View>
      <Text style={s.copy}>Discretionary greetings and check-ins respect your saved consent, quiet speech and Toronto morning focus. Private mode blocks proactive delivery. Browser sound permissions can still require one tap.</Text>
      <Text style={s.copy}>{overview?.voiceConfigured ? 'Server voice is configured; playback is verified per attempt.' : 'Server voice is not configured. Installed device speech is available as a labelled fallback.'}</Text>
      {!!audio.voiceNotice && <Text style={s.notice}>{audio.voiceNotice}</Text>}
    </View>}
    <View style={s.card}><Text style={s.heading}>Life Map</Text>{!relationshipOnly && <View style={s.tabs}>{PORTALS.map(p=><Pressable key={p} accessibilityRole="button" accessibilityState={{selected:portal===p}} disabled={busy || !user?.portals_enabled.includes(p)} onPress={()=>{setPortal(p);setEditing(null);setText('');setRemoving(null);}} style={[s.tab,portal===p && s.selected]}><Text style={s.label}>{p === 'community' ? 'Village' : p}</Text></Pressable>)}</View>}
      <Text style={s.copy}>These are your recorded claims, with sources—not automatically verified facts. Corrections replace old context; deleting a note removes its content from Life Map retrieval.</Text>
      <TextInput accessibilityLabel="Life Map note" placeholder="What should Guardian remember?" placeholderTextColor="#858F9D" multiline value={text} onChangeText={setText} maxLength={8000} editable={!relationshipOnly || (recordsReady && !busy)} style={[s.input,{minHeight:90}]}/>
      <TextInput accessibilityLabel="Note source" placeholder="Source" placeholderTextColor="#858F9D" value={source} onChangeText={setSource} maxLength={200} editable={!relationshipOnly || (recordsReady && !busy)} style={s.input}/>
      <Pressable accessibilityRole="button" disabled={busy || (relationshipOnly && !recordsReady)} onPress={save} style={s.button}><Text style={s.buttonText}>{editing ? `Save correction · revision ${editing.revision+1}` : 'Save note'}</Text></Pressable>
      {editing && <Pressable accessibilityRole="button" onPress={()=>{setEditing(null);setText('');setSource('Personal note');}}><Text style={s.link}>Cancel correction</Text></Pressable>}
      {notes.length===0 && (!relationshipOnly || recordsReady) && <Text style={s.copy}>No current notes in this portal.</Text>}
      {(!relationshipOnly || recordsReady) && notes.map(note=><View key={note.factId} style={s.note}><Text selectable style={s.label}>{note.text}</Text><Text style={s.copy}>{note.sourceId} · revision {note.revision}</Text><View style={s.row}><Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEditing(note);setText(note.text);setSource(note.sourceId);}}><Text style={s.link}>Correct</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={()=>setRemoving(note.factId)}><Text style={s.link}>Delete</Text></Pressable></View>{removing===note.factId && <View><Text style={s.copy}>Remove this note and its stored revisions? External copies and backups are outside this deletion.</Text><View style={s.row}><Pressable accessibilityRole="button" onPress={()=>perform(async()=>{await checked('/api/guardian/life-map/records/'+encodeURIComponent(note.factId),{method:'DELETE'});setRemoving(null);})}><Text style={s.link}>Confirm deletion</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setRemoving(null)}><Text style={s.link}>Keep note</Text></Pressable></View></View>}</View>)}
    </View>
    {!relationshipOnly && <View style={s.card}><Text style={s.heading}>Notification inbox</Text>{events.length===0 && <Text style={s.copy}>No notifications recorded.</Text>}{[...events].reverse().slice(0,30).map(event=><View key={event.key} style={s.note}><Text style={s.label}>{event.kind==='greetings'?'Arrival greeting':'Check-in'} · {event.state}</Text><Text style={s.copy}>{event.evidence==='client-playback-report'?'Playback status reported by this app.':'No completed playback has been reported.'}</Text>{['failed','uncertain'].includes(event.state)&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>perform(()=>checked(`/api/guardian/life-map/notifications/${event.key}/retry`,{method:'POST'}))}><Text style={s.link}>Retry playback</Text></Pressable>}</View>)}</View>}
    {!relationshipOnly && <View style={s.card}><Text style={s.heading}>Delegated action status</Text><Text style={s.copy}>{overview?.workerConfigured?'A trusted worker is configured. Each provider action still requires scoped authority and readback.':'No trusted external worker is configured. External execution is unavailable; no action is presented as completed.'}</Text><Text style={s.copy}>Unknown, sent and provider-reported states are not verification.</Text><Pressable accessibilityRole="button" onPress={()=>router.push('/guardian-view')}><Text style={s.link}>Open action evidence</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>router.push('/device-checks')}><Text style={s.link}>Voice and device status</Text></Pressable></View>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={()=>perform(load)} style={s.button}><Text style={s.buttonText}>Refresh saved state</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#050608'},header:{padding:20,gap:12},title:{fontSize:25,color:'#F1F4F8',fontWeight:'700'},body:{padding:20,paddingBottom:60,maxWidth:760,width:'100%',alignSelf:'center',gap:16},card:{backgroundColor:'#12161C',borderWidth:1,borderColor:'#444D59',borderRadius:20,padding:18,gap:12},heading:{fontSize:18,fontWeight:'700',color:'#F1F4F8'},label:{color:'#E2E8F0',fontSize:14,lineHeight:21},copy:{color:'#AEB8C7',fontSize:12,lineHeight:19},notice:{color:'#E3C790',fontSize:13,lineHeight:20},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14},tabs:{flexDirection:'row',flexWrap:'wrap',gap:8},tab:{padding:9,borderWidth:1,borderColor:'#404955',borderRadius:10},selected:{borderColor:'#E0E6EE',backgroundColor:'#303843'},input:{color:'#F3F6FB',borderWidth:1,borderColor:'#566171',borderRadius:10,padding:12},button:{padding:13,borderRadius:12,backgroundColor:'#D3DAE5',alignItems:'center'},buttonText:{color:'#101318',fontWeight:'700'},link:{color:'#D9E5F5',fontWeight:'600',paddingVertical:8},note:{borderTopWidth:1,borderColor:'#343C48',paddingTop:12,gap:7}});
