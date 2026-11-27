import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cleanWorkFocus, visibleHubWorkFocus, workFocusHubPreferenceKey, workFocusKey } from '@/src/work-focus';
import { WorldScene } from './world-scene';
import { lockedPortalArtwork } from './locked-portal-artwork';
import { WORLDS } from '@/lib/staarwardd/world-directory';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { accountStorageKey } from '@/src/account-storage';
import { GUEST_GUARDIAN_WELCOME } from '@/src/guardian-voice-policy';
import { arrivalPresentationAllowsGreeting, decodeArrivalConsent, decodeArrivalPreference, makeArrivalCooldown, permitsArrivalTime, shouldRearmArrival, type ArrivalPreference } from '@/src/guardian-greeting-policy';

const claimAutomaticArrival = makeArrivalCooldown();

type World = (typeof WORLDS)[number];

// Viewport cutout of the already approved master; do not generate a new logo.
const lockedHubMaster = require('@/assets/images/staarwardd/locked/homepage.png');
function LockedHubWordmark() {
  const { width, height } = useWindowDimensions();
  const displayW = Math.min(width - 28, height * .64, 412);
  const scale = displayW / 666;
  return (
    <View pointerEvents="none" accessible accessibilityRole="header"
      accessibilityLabel="STAARWAARDD Portal Hub"
      style={[s.wordmark, { width: displayW, height: 183 * scale }]}>
      <Image accessible={false} contentFit="fill" source={lockedHubMaster}
        style={{position:'absolute', width:1672 * scale, height:941 * scale, left:-503 * scale, top:0}} />
    </View>
  );
}


const MAX_ARRIVAL_VISUAL_WAIT_MS = 10000;

function HubFocus({ onFocus }: { onFocus: () => () => void }) {
  useFocusEffect(onFocus);
  return null;
}

function GuestPortalExplorer({ world, onClose, onSignIn }: {
  world: World; onClose: () => void; onSignIn: () => void;
}) {
  return <SafeAreaView style={s.guestExplorer} accessibilityViewIsModal>
    <View style={s.guestToolbar}>
      <Pressable accessibilityRole="button" onPress={onClose} style={s.guestBack}>
        <Ionicons name="arrow-back" size={18} color="#E8D8AE" />
        <Text style={s.guestLink}>Back to worlds</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onSignIn} style={s.previewEnter}>
        <Text style={s.previewEnterText}>Sign in for tools</Text>
      </Pressable>
    </View>
    <Image source={lockedPortalArtwork[world.id]} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="contain" accessible={false} />
    <View style={s.guestCover}>
      <Text accessibilityRole="header" style={s.previewTitle}>{world.name}</Text>
      <Text style={s.previewDetail}>{world.id === 'diggitstaar' ? 'Guest entrance. Sign in to access studio tools.' : 'Guest preview. Private tools stay locked until you sign in.'}</Text>
    </View>
  </SafeAreaView>;
}

export function WorldHub({ onSignIn }: { onSignIn?: (world?: string) => void } = {}) {
  const router = useRouter();
  const { user, api } = useAuth();
  const audio = useStaarAudio();
  const guest = Boolean(onSignIn);
  const insets = useSafeAreaInsets();
  const [inspectedPortal, setInspectedPortal] = useState<World | null>(null);
  const closePortalPreview = () => setInspectedPortal(null);
  const guestExplorerOpen = Boolean(onSignIn && inspectedPortal);
  const signInToHub = () => openSignIn();
  const [worldsOpen, setWorldsOpen] = useState(false);
  const [message, setGuardianMessage] = useState('');
  const [modelAvailable, setModelAvailable] = useState(false);
  const [guardianSpeaking, setGuardianSpeaking] = useState(false);
  const [arrivalPreference, setArrivalPreference] = useState<ArrivalPreference>('off');
  const [preferenceOwner, setPreferenceOwner] = useState<string | null>(null);
  const [consentOwner, setConsentOwner] = useState<string | null>(null);
  const greetingEnabled = arrivalPreference !== 'off';
  const greetingKey = user && !user.is_demo ? accountStorageKey('staarwardd.guardian.proactive-greeting.v2', user.user_id) : null;
  const greeted = useRef(false);
  const voiceEpoch = useRef(0);
  const activeGreetingKey = useRef<string | null>(null);
  activeGreetingKey.current = greetingKey;
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [serverConsentReady, setServerConsentReady] = useState(false);
  const [serverGreetingConsent, setServerGreetingConsent] = useState(false);
  const [serverCheckIns, setServerCheckIns] = useState(false);
  const [serverPrivate, setServerPrivate] = useState(false);
  const [serverSpeechQuiet, setServerSpeechQuiet] = useState(false);
  const [savingGreeting, setSavingGreeting] = useState(false);
  const lastBackground = useRef<number | null>(null);
  const [foregroundEpoch, setForegroundEpoch] = useState(0);
  const foregroundArrivalPreference = useRef<ArrivalPreference>('off');
  foregroundArrivalPreference.current = greetingKey && preferenceOwner === greetingKey && preferenceReady ? arrivalPreference : 'off';
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // null until iOS answers. The 3D scene mounts only after that, so the WebView
  // loads once instead of loading reduced, then reloading when the answer arrives.
  const [reduceMotion, setMotionReduced] = useState<boolean | null>(null);
  const motionReduced = reduceMotion ?? true;
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const [arrivalVisualWaitElapsed, setArrivalVisualWaitElapsed] = useState(false);
  useEffect(() => {
    let alive = true;
    // Never inherit the previous account's opt-in while the new one is loading.
    setPreferenceReady(false);
    setArrivalPreference('off');
    greeted.current = false;
    voiceEpoch.current += 1;
    if (!greetingKey) return () => { alive = false; };
    void AsyncStorage.getItem(greetingKey).then(value => {
      if (alive) { setArrivalPreference(decodeArrivalPreference(value)); setPreferenceOwner(greetingKey); setPreferenceReady(true); }
    }).catch(() => { if (alive) { setPreferenceOwner(greetingKey); setPreferenceReady(true); } });
    return () => { alive = false; };
  }, [greetingKey]);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setSavingGreeting(false);
    setServerConsentReady(false);
    setServerGreetingConsent(false);
    setServerCheckIns(false);
    setServerPrivate(false);
    setServerSpeechQuiet(false);
    if (greetingKey) void api('/api/guardian/life-map/overview', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Guardian consent could not be verified');
        const state = decodeArrivalConsent(await response.json());
        if (!alive || !state) return;
        setServerGreetingConsent(state.greetings);
        setServerCheckIns(state.checkIns);
        setServerPrivate(state.privateMode);
        setServerSpeechQuiet(state.speechQuiet);
        setConsentOwner(greetingKey);
        setServerConsentReady(true);
      }).catch(() => { /* Fail closed: an unverified server cannot authorize unsolicited speech. */ });
    return () => { alive = false; controller.abort(); clearTimeout(timeout); };
  }, [api, greetingKey, foregroundEpoch]);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setMotionReduced(value); }).catch(() => { if (alive) setMotionReduced(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setMotionReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  const onGuardianModelReady = useCallback(() => setModelAvailable(true), []);
  const onGuardianArrival = useCallback(() => setArrivalComplete(true), []);
  const onGuardianUnavailable = useCallback(() => {
    setModelAvailable(false);
    setArrivalComplete(false);
  }, []);
  const focused = useRef(Boolean(onSignIn));
  const [hasFocus, setHasFocus] = useState(Boolean(onSignIn));
  useEffect(() => {
    setArrivalVisualWaitElapsed(false);
    if (guest || !greetingKey || !hasFocus || !appActive) return;
    const timer = setTimeout(() => setArrivalVisualWaitElapsed(true), MAX_ARRIVAL_VISUAL_WAIT_MS);
    return () => clearTimeout(timer);
  }, [guest, greetingKey, hasFocus, appActive]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setAppActive(state === 'active');
      if (state !== 'active') { if (lastBackground.current === null) lastBackground.current = Date.now(); return; }
      const awaySince = lastBackground.current;
      lastBackground.current = null;
      if (awaySince === null) return;
      if (shouldRearmArrival(new Date(), awaySince, foregroundArrivalPreference.current)) greeted.current = false;
      // Recheck privacy on every foreground return, even while speech is cooling down.
      setServerConsentReady(false);
      setServerGreetingConsent(false);
      setForegroundEpoch(epoch => epoch + 1);
    });
    return () => sub.remove();
  }, []);
  const workAccount = !guest && user && !user.is_demo ? user.user_id : null;
  const [storedHubFocus, setStoredHubFocus] = useState<{ account: string; title: string } | null>(null);
  useEffect(() => {
    setStoredHubFocus(null);
    if (!workAccount || !hasFocus || !appActive) return;
    let active = true;
    const read = (id: string) => Platform.OS === 'web' ? globalThis.sessionStorage.getItem(id) : SecureStore.getItemAsync(id);
    void Promise.resolve().then(async () => {
      if (await read(workFocusHubPreferenceKey(workAccount)) !== 'yes' || !active) return null;
      return cleanWorkFocus(await read(workFocusKey(workAccount)));
    }).then(title => {
      if (active && title) setStoredHubFocus({ account: workAccount, title });
    }).catch(() => { /* Fail closed without displaying a private project. */ });
    return () => { active = false; };
  }, [workAccount, appActive, hasFocus]);
  const hubWorkFocus = visibleHubWorkFocus(storedHubFocus, workAccount, {
    foreground: appActive && hasFocus,
    privacyVerified: !!greetingKey && consentOwner === greetingKey && serverConsentReady,
    privateMode: serverPrivate,
  });
  const greet = useCallback(async (manual = false) => {
    if (!focused.current || AppState.currentState !== 'active') return;
    const epoch = ++voiceEpoch.current;
    if (guest && !manual) return;
    if (!audio.audioHydrated) return;
    if (audio.accountSpeechQuiet) {
      if (manual) setGuardianMessage('Account speech is quiet. To resume, open Guardian controls and turn Quiet speech off.');
      return;
    }
    if (audio.volume <= 0) {
      if (manual) setGuardianMessage('App volume is turned down. Raise it in audio settings to hear Guardian.');
      return;
    }
    if (!audio.master || !audio.voice || audio.speechQuiet) {
      if (!manual) return; // Automatic welcome never un-mutes or enables voice.
      audio.update({ master: true, voice: true });
      audio.setSpeechQuiet(false); // The explicitly labelled manual action authorizes this.
    }
    // Transport emits playback-active only after the voice actually starts.
    setGuardianSpeaking(true);
    setGuardianMessage(guest ? `Device voice: ${GUEST_GUARDIAN_WELCOME}` : 'Welcome back. Guardian is here.');
    try {
      const spoken = guest
        ? await audio.speakGuestWelcome()
        : await audio.speak('Welcome back. Guardian is here. Which world are we opening today?', undefined, 'guardian');
      if (!spoken && focused.current && epoch === voiceEpoch.current) {
        setGuardianMessage(guest ? 'Device voice did not play. Check Silent Mode and media volume.' : 'Guardian voice did not play. Check Silent Mode or media volume. Text chat is still available.');
      }
    } catch {
      if (focused.current && epoch === voiceEpoch.current) {
        setGuardianMessage(guest ? 'Device voice playback failed. The portal previews are still available.' : 'Voice playback failed. Text chat remains available.');
      }
    } finally {
      if (focused.current && epoch === voiceEpoch.current) {
        setGuardianSpeaking(false);
      }
    }
  }, [audio.master, audio.voice, audio.speechQuiet, audio.accountSpeechQuiet, audio.audioHydrated, audio.volume,
    audio.speak, audio.speakGuestWelcome, audio.update, audio.setSpeechQuiet, guest]);

  useEffect(() => {
    if (!focused.current || !appActive || !permitsArrivalTime(new Date(), arrivalPreference) || !preferenceReady || !audio.audioHydrated || audio.volume <= 0 || !arrivalPresentationAllowsGreeting(modelAvailable, arrivalComplete, arrivalVisualWaitElapsed) || !serverConsentReady || !serverGreetingConsent || serverPrivate || serverSpeechQuiet || !greetingKey || !greetingEnabled || !audio.master || !audio.voice || audio.speechQuiet || audio.voicePlaybackActive || audio.speechPhase !== 'idle' || user?.cross_life_paused || greeted.current) return;
    if (guest || preferenceOwner !== greetingKey || consentOwner !== greetingKey ||
        audio.accountSpeechQuiet || AppState.currentState !== 'active' ||
        !claimAutomaticArrival(greetingKey, Date.now())) return;
    greeted.current = true;
    void greet();
  }, [hasFocus, arrivalComplete, modelAvailable, arrivalVisualWaitElapsed, appActive, preferenceReady, serverConsentReady, serverGreetingConsent, serverPrivate, serverSpeechQuiet, greetingKey, greetingEnabled, foregroundEpoch, audio.master, audio.voice, audio.speechQuiet, audio.voicePlaybackActive, audio.speechPhase, user?.cross_life_paused, audio.audioHydrated, audio.volume, greet, arrivalPreference, guest, preferenceOwner, consentOwner, audio.accountSpeechQuiet]);
  const setGreeting = (enabled: boolean, explicitlyEnableDeviceVoice = false) => {
    if (!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting) return;
    if (preferenceOwner !== greetingKey || consentOwner !== greetingKey || activeGreetingKey.current !== greetingKey) return;
    const savedFor = greetingKey;
    setSavingGreeting(true);
    // Revocation is immediate locally; enabling never triggers speech before server acknowledgement.
    setArrivalPreference('off');
    greeted.current = true;
    void (async () => {
      try {
        if (!enabled) await AsyncStorage.setItem(savedFor, 'disabled');
        if (activeGreetingKey.current !== savedFor) return;
        const response = await api('/api/guardian/core/workflows/rsf-fabric-sourcing/proactive-consent', {
          method: 'POST',
          body: JSON.stringify({ greetings: enabled, check_ins: serverCheckIns }),
        });
        if (!response.ok) throw new Error('Guardian consent could not be saved');
        if (activeGreetingKey.current !== savedFor) return;
        if (enabled) await AsyncStorage.setItem(savedFor, 'arrival-on-entry');
        if (activeGreetingKey.current !== savedFor) return;
        setServerGreetingConsent(enabled);
        if (enabled && explicitlyEnableDeviceVoice) {
          audio.update({ master: true, voice: true });
          audio.setSpeechQuiet(false);
        }
        setArrivalPreference(enabled ? 'on-entry' : 'off');
        greeted.current = !enabled;
      } catch {
        if (activeGreetingKey.current !== savedFor) return;
        setServerConsentReady(false);
        setServerGreetingConsent(false);
        setArrivalPreference('off');
        greeted.current = true;
        setGuardianMessage('Guardian could not verify consent. Automatic greeting remains off.');
      } finally {
        if (activeGreetingKey.current === savedFor) setSavingGreeting(false);
      }
    })();
  };
  const greetingActive = greetingEnabled && serverGreetingConsent && !serverPrivate && !serverSpeechQuiet;
  const changeArrivalVoice = () => {
    if (arrivalPreference === 'on-entry' && greetingActive) { setGreeting(false); return; }
    const ownerAtPrompt = greetingKey;
    const accountStillMatches = () => ownerAtPrompt !== null && activeGreetingKey.current === ownerAtPrompt;
    const deviceIsSilent = !audio.master || !audio.voice || audio.speechQuiet;
    const prompt = 'Let Guardian greet you when you open the Hub or return after 20 minutes away, even during Toronto quiet hours. '
      + (deviceIsSilent ? 'This choice also turns on Guardian playback on this device. You can mute it again anytime. ' : '')
      + 'It never turns on the microphone or overrides account quiet or private mode.';
    Alert.alert('Arrival voice', prompt, [
      { text: 'Cancel', style: 'cancel' },
      ...(greetingActive ? [{ text: 'Turn off', onPress: () => { if (accountStillMatches()) setGreeting(false); } }] : []),
      { text: deviceIsSilent ? 'Enable arrival and device voice' : 'Enable on entry', onPress: () => { if (accountStillMatches()) setGreeting(true, deviceIsSilent); } },
    ]);
  };
  const navigationLocked = useRef(false);
  const onFocus = useCallback(() => {
    focused.current = true;
    setHasFocus(true);
    setServerConsentReady(false);
    setServerGreetingConsent(false);
    setForegroundEpoch(epoch => epoch + 1);
    navigationLocked.current = false;
    return () => { focused.current = false; setHasFocus(false); voiceEpoch.current += 1; setGuardianSpeaking(false); };
  }, []);
  function openSignIn(destination?: string) {
    if (!onSignIn) return;
    voiceEpoch.current += 1;
    audio.stopSpeech();
    setGuardianSpeaking(false);
    onSignIn(destination);
  }
  const welcomeLabel = audio.accountSpeechQuiet ? 'Guardian voice is quiet in account settings'
    : !audio.master || !audio.voice || audio.speechQuiet
      ? (guest ? 'Enable and hear guest welcome' : 'Enable and hear Guardian welcome')
      : (guest ? 'Hear guest welcome' : 'Hear Guardian welcome');
  const openPortal = (world: string) => {
    const target = WORLDS.find(item => item.id === world);
    if (!target) return;
    setWorldsOpen(false);
    if (onSignIn) { setInspectedPortal(target); return; }
    if (navigationLocked.current) return;
    navigationLocked.current = true;
    router.push({ pathname: '/environment', params: { world } } as never);
  };
  // Both renderer messages and native list taps request the same destination.
  const onThreeDimensionalPortalAction = (action: string) => {
    if (action.startsWith('world:')) openPortal(action.slice('world:'.length));
  };
  return (
    <View style={s.root}>
      {!guestExplorerOpen && <View style={s.flex}>
      {!onSignIn && <HubFocus onFocus={onFocus} />}
      {/* Full-bleed 3D portal ring. Swipe, pinch and tap gestures go straight to the WebView. */}
      <View style={StyleSheet.absoluteFill}>
        {reduceMotion !== null && <WorldScene world="hub" embedded onAction={onThreeDimensionalPortalAction}
          onGuardianModelReady={onGuardianModelReady} onGuardianArrival={onGuardianArrival}
          onGuardianUnavailable={onGuardianUnavailable} reduceGuardianMotion={motionReduced} />}
      </View>
      <LinearGradient pointerEvents="none" colors={['#000000B3', '#00000000']} style={[s.scrim, { top: 0, height: insets.top + 120 }]} />
      <LinearGradient pointerEvents="none" colors={['#00000000', '#000000C0']} style={[s.scrim, { bottom: 0, height: insets.bottom + 140 }]} />
      {/* box-none everywhere: only the buttons themselves take touches, so the scene
          still receives swipes across the header and control bands. */}
      <SafeAreaView pointerEvents="box-none" style={s.overlay}>
        <View pointerEvents="box-none" style={s.header}>
          <LockedHubWordmark />
          <View pointerEvents="box-none" style={s.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="All worlds" accessibilityHint="Lists all ten worlds"
              onPress={() => setWorldsOpen(true)} style={s.icon}>
              <Ionicons name="grid-outline" size={20} color="#F4F0E6" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={onSignIn ? 'Sign in' : 'Open settings'}
              onPress={onSignIn ? signInToHub : (() => router.push('/settings'))} style={s.icon}>
              <Ionicons name="options-outline" size={23} color="#F4F0E6" />
            </Pressable>
          </View>
        </View>
        {/* Status text lives under the header so it never covers the in-scene portal caption. */}
        {!!message && <View pointerEvents="none"><Text accessibilityLiveRegion="polite" numberOfLines={2} style={s.message}>{message}</Text></View>}
        <View pointerEvents="none" style={s.flex} />
        <View pointerEvents="box-none" style={s.controls}>
          {!!hubWorkFocus && <Pressable accessibilityRole="button" accessibilityHint="Opens Current Work without sending a message"
            onPress={() => {
              if (!hubWorkFocus || navigationLocked.current) return;
              navigationLocked.current = true;
              router.push('/work-focus' as never);
            }}
            style={{ alignSelf: 'center', maxWidth: '85%', minHeight: 44, justifyContent: 'center', marginBottom: 6, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#0B0C13E8', borderColor: '#74664C', borderWidth: 1 }}>
            <Text numberOfLines={1} style={{ color: '#F1DDAF', fontWeight: '700' }}>Continue: {hubWorkFocus}</Text>
          </Pressable>}
          <View pointerEvents="box-none" style={s.controlRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={audio.voicePlaybackActive ? 'Guardian speaking' : guardianSpeaking ? 'Preparing Guardian voice' : welcomeLabel}
              disabled={!audio.audioHydrated || guardianSpeaking || audio.voicePlaybackActive} onPress={() => { void greet(true); }} style={s.icon}>
              <Ionicons name="volume-high-outline" size={22} color="#F4F0E6" />
            </Pressable>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: greetingActive }} accessibilityLabel="Arrival voice" accessibilityHint="Set when Guardian speaks on opening the Hub"
              disabled={!greetingKey || !preferenceReady || !serverConsentReady || savingGreeting || serverPrivate || serverSpeechQuiet || !audio.audioHydrated || audio.accountSpeechQuiet}
              onPress={changeArrivalVoice} style={s.icon}>
              <Ionicons name={greetingActive ? 'sparkles' : 'sparkles-outline'} size={22} color={greetingActive ? '#F4DA9F' : '#D5D9E2'} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Silence Guardian" onPress={() => {
              voiceEpoch.current += 1;
              audio.setSpeechQuiet(true);
              audio.stopAll();
              setGuardianSpeaking(false);
            }} style={s.icon}><Ionicons name="volume-mute-outline" size={22} color="#F4F0E6" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Life Map and Guardian controls"
              onPress={onSignIn ? signInToHub : (() => router.push('/guardian-tools'))} style={s.icon}><Ionicons name="compass-outline" size={22} color="#F4F0E6" /></Pressable>
          </View>
        </View>
      </SafeAreaView>
      {/* Native list of all ten worlds: fast access and a VoiceOver-first route. */}
      <Modal transparent visible={worldsOpen} animationType={motionReduced ? 'none' : 'slide'} onRequestClose={() => setWorldsOpen(false)}>
        <View style={s.sheetBackdrop}>
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setWorldsOpen(false)} />
          <SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal>
            <View style={s.sheetHeader}>
              <Text accessibilityRole="header" style={s.sheetTitle}>All worlds</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close world list" onPress={() => setWorldsOpen(false)} style={s.icon}>
                <Ionicons name="close" size={22} color="#F4F0E6" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.sheetList}>
              {WORLDS.map(world => (
                <Pressable key={world.id} accessibilityRole="button" accessibilityLabel={world.name}
                  accessibilityHint={onSignIn ? 'Opens a read-only preview of this world' : 'Enters this world'}
                  onPress={() => openPortal(world.id)} style={({ pressed }) => [s.worldRow, pressed && s.pressed]}>
                  <View style={s.worldThumb}>
                    <Image source={lockedPortalArtwork[world.id]} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.worldName}>{world.name}</Text>
                    <Text numberOfLines={1} style={s.worldDetail}>{world.detail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#E8D3A4" />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
      </View>}
      {onSignIn && inspectedPortal && <GuestPortalExplorer world={inspectedPortal}
        onClose={closePortalPreview} onSignIn={() => openSignIn(inspectedPortal.id)} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#030305' },
  flex: { flex: 1 },
  scrim: { position: 'absolute', left: 0, right: 0 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, paddingHorizontal: 12, paddingBottom: 20 },
  header: { alignItems: 'center', minHeight: 52, marginBottom: 8 },
  headerActions: { flexDirection: 'row', gap: 10, alignSelf: 'flex-end', marginTop: 5 },
  wordmark: { overflow: 'hidden', alignSelf: 'center', borderRadius: 6 },
  icon: { width: 46, height: 46, borderWidth: 1, borderColor: '#A6997F', borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15151DDB' },
  message: { alignSelf: 'center', maxWidth: 420, color: '#F4F0E6', textAlign: 'center', fontSize: 12, backgroundColor: '#0C0C12E8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden' },
  controls: { alignItems: 'center', paddingTop: 6 },
  controlRow: { flexDirection: 'row', gap: 12 },
  pressed: { opacity: .7, transform: [{ scale: .98 }] },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#05050ACC' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#E8D0A466', backgroundColor: '#0E0F16', paddingHorizontal: 16, paddingTop: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { color: '#FAF8F2', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  sheetList: { gap: 8, paddingBottom: 18 },
  worldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF1A', backgroundColor: '#FFFFFF08' },
  worldThumb: { width: 84, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: '#05060A' },
  worldName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: .4 },
  worldDetail: { color: '#C9CEDA', fontSize: 12, marginTop: 2 },
  guestExplorer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#070912' },
  guestToolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  guestBack: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  guestLink: { color: '#E8D8AE', fontSize: 14, fontWeight: '700' },
  guestCover: { minHeight: 113, justifyContent: 'flex-end', padding: 16, overflow: 'hidden' },
  previewTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  previewDetail: { color: '#F4F0E6', fontSize: 14, lineHeight: 20 },
  previewEnter: { flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 15, borderRadius: 22, backgroundColor: '#F3DFC0' },
  previewEnterText: { color: '#161316', fontWeight: '700' },
});
