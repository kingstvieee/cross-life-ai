import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { guardianWireFrame, type GuardianAudioFrame } from '@/src/guardian-audio-frame';
import { worldSceneHtml } from '@/generated/world-runtime';
import { sceneAction, sceneFallbackActions } from '@/src/scene-events';
import { shouldDispatchSceneAction, type SceneDispatch } from '@/src/scene-action-dedup';
import {normalizeIphoneQa, iphoneQaStatus} from '@/src/iphone-qa-controls';
import {readWorldQaArchive,saveWorldQaCapture,exportWorldQaArchive,clearWorldQaArchive,worldQaProgress} from '@/src/iphone-qa-archive';

export function WorldScene({ world, variant = 'realm', onAction, guardianAudioFrame = null, embedded = false, onSceneReady, onGuardianModelReady }: { world: string; variant?: 'realm' | 'singles'; onAction: (action: string) => void; guardianAudioFrame?: GuardianAudioFrame | null; embedded?: boolean; onSceneReady?: () => void; onGuardianModelReady?: (modelSha256: string) => void }) {
  const audio=useStaarAudio();
  const webviewRef=useRef<WebView>(null);
  const pushGuardianFrame=()=>{
    const allowed=audio.master&&audio.voice&&!audio.speechQuiet&&audio.voicePlaybackActive;
    const packet=guardianWireFrame(allowed?(guardianAudioFrame??audio.guardianAudioFrame):null,session);
    const js="window.dispatchEvent(new MessageEvent('message',{data:"+JSON.stringify(packet)+"}));true;";
    webviewRef.current?.injectJavaScript(js);
  };
  // Explicitly opt-in at build time; disabled in normal production builds.
  const qaEnabled = Platform.OS==='ios' && world==='hub' && process.env.EXPO_PUBLIC_GUARDIAN_DEVICE_QA === '1';
  const worldQaEnabled = Platform.OS==='ios' && world!=='hub' && process.env.EXPO_PUBLIC_WORLD_COLLISION_QA === '1';
  const worldQaLatest = useRef<string | null>(null);
  const [worldQaSummary,setWorldQaSummary] = useState('No capture yet');
  const [motionQaSummary,setMotionQaSummary] = useState('No Guardian motion test requested');
  const [worldQaReady,setWorldQaReady] = useState(false);
  const [archiveSummary,setArchiveSummary] = useState('0/10 world QA captures saved');
  const [archiveReady,setArchiveReady] = useState(false);
  const [qaReady,setQaReady] = useState(false);
  const qaLatest = useRef<string | null>(null);
  const [qaSummary,setQaSummary] = useState('No capture yet');
  const captureDeviceQa=()=>{
    if(!qaEnabled)return;
    qaLatest.current=null;setQaReady(false);
    setQaSummary('Capture requested — awaiting renderer');
    const msg={source:'staar-guardian-device-qa-request-v1',session};
    webviewRef.current?.injectJavaScript(
      "window.dispatchEvent(new MessageEvent('message',{data:"+JSON.stringify(msg)+"}));true;");
  };
  const requestWorldQa=()=>{
    if(!worldQaEnabled)return;
    worldQaLatest.current=null;setWorldQaReady(false);
    setWorldQaSummary('Capture requested — awaiting renderer');
    const msg={source:'staar-world-physics-qa-request-v1',session};
    webviewRef.current?.injectJavaScript("window.dispatchEvent(new MessageEvent('message',{data:"+JSON.stringify(msg)+"}));true;");
  };
  const exportWorldQa=()=>{
    if(!worldQaEnabled||!worldQaLatest.current)return;
    void Share.share({title:'STAARWAARDD World Collision QA',message:worldQaLatest.current}).catch(()=>{});
  };
  const exportAllWorldQa=()=>{
    if(!worldQaEnabled)return;
    void readWorldQaArchive(AsyncStorage).then(archive=>{
      const payload=exportWorldQaArchive(archive,new Date().toISOString());
      return Share.share({title:'STAARWAARDD Ten-World QA — Review Only',message:payload});
    }).catch(()=>setArchiveSummary('Local archive unavailable'));
  };
  const requestClearWorldQa=()=>{
    if(!worldQaEnabled)return;
    Alert.alert('Clear saved world QA?', 'Remove ten-world local test results from this iPhone. This cannot be undone.',[
      {text:'Cancel',style:'cancel'},
      {text:'Clear results',style:'destructive',onPress:()=>{
        void clearWorldQaArchive(AsyncStorage).then(()=>{
          setArchiveSummary('0/10 world QA captures saved');setArchiveReady(false);
        }).catch(()=>setArchiveSummary('Local archive unavailable'));
      }}
    ]);
  };
  const issueMotionQa=(mode:'idle'|'walk'|'run')=>{
    if(!qaEnabled)return;
    setMotionQaSummary(mode.toUpperCase()+' requested — awaiting renderer');
    const msg={source:'staar-guardian-locomotion-qa-command-v1',session,mode};
    webviewRef.current?.injectJavaScript("window.dispatchEvent(new MessageEvent('message',{data:"+JSON.stringify(msg)+"}));true;");
  };
  const exportDeviceQa=()=>{
    if(!qaEnabled||!qaLatest.current)return;
    // Only operator-initiated local iOS Share Sheet; no network upload.
    void Share.share({title:'STAARWAARDD Guardian Device QA',
      message:qaLatest.current}).catch(()=>{});
  };
  const [retryCount, setRetryCount] = useState(0);
  const session = useMemo(() => `${Date.now()}_${Math.random().toString(36).slice(2)}`, [world, variant, retryCount]);
  useEffect(()=>{
    qaLatest.current=null;worldQaLatest.current=null;
    setQaReady(false);setWorldQaReady(false);
    setQaSummary('No capture yet');setWorldQaSummary('No capture yet');
    setMotionQaSummary('No Guardian motion test requested');
  },[session]);
  useEffect(()=>{
    if(!worldQaEnabled)return;
    let active=true;
    void readWorldQaArchive(AsyncStorage).then(archive=>{
      if(!active)return;
      const progress=worldQaProgress(archive);
      setArchiveSummary(progress.captured+'/10 world QA captures saved; '+progress.withModel+' with approved GLB');
      setArchiveReady(progress.captured>0);
    }).catch(()=>{if(active)setArchiveSummary('Local archive unavailable');});
    return ()=>{active=false;};
  },[worldQaEnabled,world,variant]);
  const makeQaContext=()=>({scene:world,variant,session,platform:Platform.OS,
    capturedAt:new Date().toISOString()});
  useEffect(()=>{pushGuardianFrame();},[
    guardianAudioFrame,audio.guardianAudioFrame,audio.master,audio.voice,
    audio.speechQuiet,audio.voicePlaybackActive,session,
  ]);

  useEffect(()=>{
    audio.setGuardianRigHash(null);
    return ()=>audio.setGuardianRigHash(null);
  },[world,variant,session,audio.setGuardianRigHash]);

  const html = useMemo(() => worldSceneHtml(world, variant, session, qaEnabled, worldQaEnabled), [world, variant, session, qaEnabled, worldQaEnabled]);
  const [loadFailed, setLoadFailed] = useState(false);
  const sceneReady = useRef(false);
  const lastDispatch = useRef<SceneDispatch | null>(null);
  useEffect(() => {
    sceneReady.current = false;
    const watchdog = setTimeout(() => { if (!sceneReady.current) setLoadFailed(true); }, 15000);
    return () => clearTimeout(watchdog);
  }, [world, variant, retryCount]);
  useEffect(() => { setLoadFailed(false); setRetryCount(0); }, [world, variant]);
  const fallback = sceneFallbackActions(world);
  if (loadFailed) return <ScrollView contentContainerStyle={{ padding: 22, gap: 12, backgroundColor: '#030713', minHeight: embedded ? 0 : 420 }}>
    <Text accessibilityRole="alert" style={{ color: '#F2DFB4', fontSize: 18, fontWeight: '700' }}>3D preview unavailable</Text>
    <Text style={{ color: '#D6DFEC', lineHeight: 22 }}>The local scene could not load. Use these safe navigation controls instead. No devices or external services have been activated.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retry local 3D scene" onPress={() => { setRetryCount(count => count + 1); setLoadFailed(false); }}
      style={{ minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D5C08B', justifyContent: 'center' }}><Text style={{ color: '#F2DFB4', fontSize: 15 }}>Retry 3D preview</Text></Pressable>
    {fallback.map(([label, action]) => <Pressable key={action} accessibilityRole="button"
      onPress={() => onAction(action)} style={{ minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#9AAABF', justifyContent: 'center' }}>
      <Text style={{ color: '#F2F5FA', fontSize: 15 }}>{label}</Text>
    </Pressable>)}
  </ScrollView>;
  return <View style={{ width: '100%', height: '100%', minHeight: embedded ? 0 : 420 }}>
    {qaEnabled && !embedded ? <View style={{ padding: 8, backgroundColor:'#080E1B', gap:6 }}>
      <Text style={{color:'#E8D9AF',fontSize:12,fontWeight:'600'}}>
        GUARDIAN DEVICE QA · {qaSummary}
      </Text>
      <View style={{flexDirection:'row',gap:12}}>
        <Pressable onPress={captureDeviceQa} accessibilityRole="button"
          accessibilityLabel="Capture local Guardian frame metrics"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Capture frame QA</Text>
        </Pressable>
        <Pressable onPress={exportDeviceQa} disabled={!qaReady}
          accessibilityRole="button" accessibilityLabel="Share Guardian device QA report"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Export QA</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="text" style={{color:'#E8D9AF',fontSize:12}}>{motionQaSummary}</Text>
      <View style={{flexDirection:'row',gap:8}}>
        {(['idle','walk','run'] as const).map(mode=><Pressable key={mode}
          accessibilityRole="button" accessibilityLabel={'Guardian '+mode+' motion QA'}
          onPress={()=>issueMotionQa(mode)}
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#9DABBD',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>{mode.toUpperCase()}</Text>
        </Pressable>)}
      </View>
    </View>:null}
    {worldQaEnabled && !embedded ? <View style={{padding:8,backgroundColor:'#080E1B',gap:6}}>
      <Text style={{color:'#E8D9AF',fontSize:12,fontWeight:'600'}}>WORLD COLLISION QA · {worldQaSummary}</Text>
      <Text style={{color:'#DDE6F2',fontSize:12}}>{archiveSummary}</Text>
      <View style={{flexDirection:'row',gap:12}}>
        <Pressable onPress={requestWorldQa} accessibilityRole="button" accessibilityLabel="Capture local world collision QA"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Capture world QA</Text>
        </Pressable>
        <Pressable onPress={exportWorldQa} disabled={!worldQaReady}
          accessibilityRole="button" accessibilityLabel="Share local world collision QA"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Export world QA</Text>
        </Pressable>
      </View>
      <View style={{flexDirection:'row',gap:12}}>
        <Pressable onPress={exportAllWorldQa} disabled={!archiveReady}
          accessibilityRole="button" accessibilityLabel="Export consolidated ten-world QA reports"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Export all worlds</Text>
        </Pressable>
        <Pressable onPress={requestClearWorldQa} disabled={!archiveReady}
          accessibilityRole="button" accessibilityLabel="Clear local ten-world QA results"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#9DABBD',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Clear results</Text>
        </Pressable>
      </View>
    </View>:null}
    <WebView ref={webviewRef} onLoadEnd={pushGuardianFrame} key={`${world}:${variant}:${retryCount}`} source={{ html }} javaScriptEnabled scrollEnabled={false}
      originWhitelist={['about:blank']} allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false} mediaPlaybackRequiresUserAction
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('data:text/html')}
      onError={() => setLoadFailed(true)}
      onRenderProcessGone={() => setLoadFailed(true)}
      onContentProcessDidTerminate={() => setLoadFailed(true)}
      onMessage={event => { try { const message: unknown = JSON.parse(event.nativeEvent.data); if (!message || typeof message !== 'object' || !('session' in message) || message.session !== session) return; if (message && typeof message === 'object' && 'source' in message && 'type' in message && 'world' in message && message.source === 'staar-scene-v1' && message.type === 'unavailable' && message.world === world) { setLoadFailed(true); return; } if (message && typeof message === 'object' && 'source' in message && 'type' in message && 'world' in message && message.source === 'staar-scene-v1' && message.type === 'ready' && message.world === world) { sceneReady.current = true; onSceneReady?.(); return; } if (message && typeof message === 'object' && 'source' in message && 'type' in message && 'world' in message && 'modelSha256' in message && message.source === 'staar-scene-v1' && message.type === 'guardian-face-ready' && world === 'hub' && message.world === world && typeof message.modelSha256 === 'string') { audio.setGuardianRigHash(message.modelSha256); onGuardianModelReady?.(message.modelSha256); return; } if(qaEnabled && 'source' in message && 'type' in message && 'world' in message &&
        'metrics' in message && message.source==='staar-scene-v1' &&
        message.type==='guardian-device-qa' && message.world==='hub' &&
        message.metrics && typeof message.metrics==='object' &&
        !Array.isArray(message.metrics) &&
        'schema' in message.metrics &&
        message.metrics.schema==='staar-guardian-physical-device-qa-telemetry-v1'){
          const report=normalizeIphoneQa('guardian',message.metrics,makeQaContext());
          qaLatest.current=report?JSON.stringify(report,null,2):null;
          setQaReady(Boolean(report));
          setQaSummary(report?iphoneQaStatus(report):'Invalid renderer report rejected');
          return;
        }
        if(worldQaEnabled && 'source' in message && 'type' in message && 'world' in message &&
          'metrics' in message && message.source==='staar-scene-v1' && message.type==='world-physics-qa' &&
          message.world===world && message.metrics && typeof message.metrics==='object' &&
          !Array.isArray(message.metrics) && 'schema' in message.metrics &&
          message.metrics.schema==='staar-world-physical-device-qa-telemetry-v1'){
          const report=normalizeIphoneQa('world',message.metrics,makeQaContext());
          worldQaLatest.current=report?JSON.stringify(report,null,2):null;
          setWorldQaReady(Boolean(report));
          setWorldQaSummary(report?iphoneQaStatus(report):'Invalid renderer report rejected');
          if(report){
            void saveWorldQaCapture(AsyncStorage,report).then(archive=>{
              const progress=worldQaProgress(archive);
              setArchiveSummary(progress.captured+'/10 world QA captures saved; '+progress.withModel+' with approved GLB');
              setArchiveReady(progress.captured>0);
            }).catch(()=>setArchiveSummary('Local archive unavailable'));
          }
          return;
        }
        if(qaEnabled && 'source' in message && 'type' in message && 'world' in message &&
          message.source==='staar-scene-v1' && message.type==='guardian-locomotion-qa' &&
          message.world==='hub' && 'accepted' in message && 'mode' in message){
          const validMode=message.mode==='idle'||message.mode==='walk'||message.mode==='run';
          if(validMode&&typeof message.accepted==='boolean'){
            setMotionQaSummary(message.accepted
              ?String(message.mode).toUpperCase()+' selected for local QA — not certified'
              :'Motion rejected — approved full-body GLB not available');
          }
          return;
        }
        const action = sceneAction(message, world); if (action) { const next = { world, action, atMs: Date.now() }; if (shouldDispatchSceneAction(lastDispatch.current, next)) { lastDispatch.current = next; onAction(action); } } } catch { /* Invalid renderer messages are ignored. */ } }}
      style={{ backgroundColor: '#030713' }} />
  </View>;
}
