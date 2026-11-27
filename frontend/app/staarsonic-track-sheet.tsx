import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/src/auth';
import { EMPTY_TRACK_SHEET, TRACK_FIELDS, TRACK_LIMITS, formatTrackSheet, normalizeTrackSheet, trackSheetStore } from '@/src/staarsonic-track-sheet';

const LABEL = {title: 'Track name', bpm: 'Tempo (BPM)', musicalKey: 'Musical key', notes: 'Recording and mix notes'};

export default function StaarsonicTrackSheet() {
  const { user } = useAuth();
  const router = useRouter();
  return user && !user.is_demo ? <TrackEditor key={user.user_id} owner={user.user_id} /> :
    <SafeAreaView style={{flex:1, padding:20, backgroundColor:'#080B10'}}>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/hub')} style={{minHeight:44}}>
        <Text style={{color:'#F1DDAF'}}>Back to STAAR Hub</Text>
      </Pressable>
      <Text style={{color:'#F1F4F8'}}>Sign in to open your private track sheet.</Text>
    </SafeAreaView>;
}

function TrackEditor({owner}: {owner: string}) {
  const router = useRouter();
  const storage = useMemo(() => trackSheetStore({
    get: async key => Platform.OS === 'web' ? globalThis.sessionStorage.getItem(key) : SecureStore.getItemAsync(key),
    set: async (key, value) => {
      if (Platform.OS === 'web') globalThis.sessionStorage.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    },
  }, owner), [owner]);
  const [draft, setDraft] = useState({...EMPTY_TRACK_SHEET});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Loading your track sheet…');
  const mounted = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let current = true;
    mounted.current = true;
    void storage.load().then(value => {
      if (current) {setDraft(value); setReady(true); setNotice('');}
    }).catch(() => {
      if (current) setNotice('Could not read the saved sheet. Nothing was overwritten.');
    });
    return () => {current = false; mounted.current = false;};
  }, [storage]);

  async function save() {
    if (!ready || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const saved = await storage.save(draft);
      if (mounted.current) {
        setDraft(saved);
        setNotice(Platform.OS === 'web' ? 'Saved in this browser session.' : 'Saved on this device.');
      }
    } catch (error) {if (mounted.current) setNotice(error instanceof Error && /^(Name|Enter|This track)/.test(error.message) ? error.message : 'Could not save. Your edits are still here.');}
    finally {inFlight.current = false; if (mounted.current) setBusy(false);}
  }

  async function share() {
    const sheet = normalizeTrackSheet(draft);
    if (!sheet.title || !ready || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {await Share.share({message:formatTrackSheet(sheet),title:'STAARSONIC track sheet'});}
    catch {if (mounted.current) setNotice('Could not open sharing.');}
    finally {inFlight.current = false; if (mounted.current) setBusy(false);}
  }

  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={{minHeight:44, padding:12, borderWidth:1, borderColor:'#74664C', borderRadius:10, opacity:disabled ? .5 : 1}}>
    <Text style={{color:'#F1DDAF'}}>{label}</Text>
  </Pressable>;

  return <SafeAreaView style={{flex:1, backgroundColor:'#080B10'}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20, gap:13}}>
      {button('Back to STAARSONIC', () => router.replace({pathname:'/environment',params:{world:'staarsonic'}} as never))}
      <Text accessibilityRole="header" style={{color:'#F1F4F8', fontSize:28}}>STAARSONIC Track Sheet</Text>
      <Text style={{color:'#C5CEDB'}}>Plan one track and keep its recording or mix notes. This does not record audio, open a DAW, or publish anything.</Text>
      {TRACK_FIELDS.map(field => <View key={field} style={{gap:4}}>
        <Text style={{color:'#C5CEDB'}}>{LABEL[field]}</Text>
        <TextInput accessibilityLabel={LABEL[field]} editable={ready && !busy} value={draft[field]} maxLength={TRACK_LIMITS[field]}
          multiline={field === 'notes'} keyboardType={field === 'bpm' ? 'number-pad' : 'default'}
          onChangeText={value => setDraft(old => ({...old,[field]:value}))}
          style={{color:'#F1F4F8', borderColor:'#74664C', borderWidth:1, padding:10, minHeight:field === 'notes' ? 140 : 44}} />
      </View>)}
      {button('Save track sheet', () => {void save();}, !ready || busy || !draft.title.trim())}
      {Platform.OS !== 'web' && button('Share track sheet text', () => {void share();}, !ready || busy || !draft.title.trim())}
      <Text accessibilityLiveRegion="polite" style={{color:'#C5CEDB'}}>{notice}</Text>
    </ScrollView>
  </SafeAreaView>;
}
