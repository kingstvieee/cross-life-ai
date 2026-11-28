import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/src/auth';
import { CAMPAIGN_FIELDS, CAMPAIGN_LIMITS, CAMPAIGN_STAGES, EMPTY_CAMPAIGN, campaignExport, normalizeCampaign, type Campaign } from '@/src/diggit-campaign';

const LABELS = { title: 'Campaign name', audience: 'Audience', deliverable: 'Deliverable', script: 'Script' };
const keyFor = (owner: string, field: string) => 'staar.diggit.campaign.' + field + '.' + Array.from(owner, c => c.codePointAt(0)!.toString(16)).join('.');

export default function DiggitCampaign() {
  const { user } = useAuth();
  return user && !user.is_demo ? <CampaignEditor key={user.user_id} owner={user.user_id} /> : null;
}

function CampaignEditor({ owner }: { owner: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign>({...EMPTY_CAMPAIGN});
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('Loading your campaign…');
  const mounted = useRef(false);
  const lock = useRef(false);
  const fields = [...CAMPAIGN_FIELDS, 'stage'] as const;
  const key = keyFor(owner, 'draft');

  useEffect(() => {
    mounted.current = true;
    let live = true;
    const get = (k: string) => Platform.OS === 'web' ? globalThis.sessionStorage.getItem(k) : SecureStore.getItemAsync(k);
    void Promise.resolve().then(() => get(key)).then(raw => {
      if (raw === null) return {...EMPTY_CAMPAIGN};
      return normalizeCampaign(JSON.parse(raw));
    }).then(value => {
      if (live) { setCampaign(value); setReady(true); setNotice(''); }
    }).catch(() => { if (live) setNotice('Campaign storage could not be read. No saved draft was overwritten.'); });
    return () => { live = false; mounted.current = false; };
  }, [key]);

  async function save() {
    if (!ready || lock.current) return;
    const next = normalizeCampaign(campaign);
    if (!next.title) { setNotice('Name the campaign first.'); return; }
    const serialized = JSON.stringify(Object.fromEntries(fields.map(field => [field, next[field]])));
    // SecureStore values should fit comfortably on devices with a 2 KB keychain limit.
    // This conservative count avoids assuming TextEncoder exists in the native JS runtime.
    const utf8Bytes = Array.from(serialized, char => {
      const cp = char.codePointAt(0)!;
      return cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    }).reduce((sum, bytes) => sum + bytes, 0);
    if (utf8Bytes > 1900) { setNotice('The draft is too large to store on this device. Shorten it or share the current text.'); return; }
    lock.current = true; setWorking(true);
    try {
      if (Platform.OS === 'web') globalThis.sessionStorage.setItem(key, serialized);
      else await SecureStore.setItemAsync(key, serialized);
      if (mounted.current) setNotice(Platform.OS === 'web' ? 'Campaign saved in this browser session.' : 'Campaign saved on this device.');
    } catch { if (mounted.current) setNotice('Could not save this campaign. Your text is still in the editor.'); }
    finally { lock.current = false; if (mounted.current) setWorking(false); }
  }

  async function share() {
    const message = campaignExport(campaign);
    if (!message) return;
    try {
      await Share.share({ message, title: 'DIGGITSTAAR campaign' });
    } catch { if (mounted.current) setNotice('Could not open sharing for this campaign.'); }
  }

  const button = (label: string, onPress: () => void, disabled = false) => <Pressable key={label} accessibilityRole="button" disabled={disabled}
    onPress={onPress} style={{ padding: 12, borderColor: '#74664C', borderWidth: 1, borderRadius: 10, minHeight: 44, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: '#F1DDAF' }}>{label}</Text>
  </Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#080B10' }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 12 }}>
      {button('Back', () => router.back())}
      <Text accessibilityRole="header" style={{ color: '#F1F4F8', fontSize: 28 }}>DIGGITSTAAR Campaign</Text>
      <Text style={{ color: '#C5CEDB' }}>Write a campaign brief and script, track its stage, and share the text when you choose. This does not publish or connect a provider.</Text>
      {CAMPAIGN_FIELDS.map(field => <View key={field} style={{ gap: 4 }}>
        <Text style={{ color: '#C5CEDB' }}>{LABELS[field]}</Text>
        <TextInput accessibilityLabel={LABELS[field]} editable={ready && !working} maxLength={CAMPAIGN_LIMITS[field]}
          multiline={field === 'script'} value={campaign[field]} onChangeText={value => setCampaign(c => ({...c, [field]: value}))}
          style={{ color: '#F1F4F8', padding: 10, borderColor: '#74664C', borderWidth: 1, minHeight: field === 'script' ? 130 : 44 }} />
      </View>)}
      <Text style={{ color: '#C5CEDB' }}>Current stage: {campaign.stage}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CAMPAIGN_STAGES.map(stage => button('Stage: ' + stage, () => setCampaign(c => ({...c, stage})), !ready || working || stage === campaign.stage))}
      </View>
      {button('Save campaign', () => { void save(); }, !ready || working || !campaign.title.trim())}
      {Platform.OS !== 'web' && button('Share campaign text', () => { void share(); }, !ready || working || !campaign.title.trim())}
      <Text accessibilityLiveRegion="polite" style={{ color: '#C5CEDB' }}>{notice}</Text>
    </ScrollView>
  </SafeAreaView>;
}
