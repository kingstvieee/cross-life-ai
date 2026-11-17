import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
import { guardianWireFrame, type GuardianAudioFrame } from '@/src/guardian-audio-frame';
import { worldSceneHtml } from '@/generated/world-runtime';
import { sceneAction, sceneFallbackActions } from '@/src/scene-events';
import { shouldDispatchSceneAction, type SceneDispatch } from '@/src/scene-action-dedup';

export function WorldScene({ world, variant = 'realm', onAction, guardianAudioFrame = null }: { world: string; variant?: 'realm' | 'singles'; onAction: (action: string) => void; guardianAudioFrame?: GuardianAudioFrame | null }) {
  const audio=useStaarAudio();
  const webviewRef=useRef<WebView>(null);
  const pushGuardianFrame=()=>{
    const allowed=audio.master&&audio.voice&&!audio.speechQuiet&&audio.voicePlaybackActive;
    const packet=guardianWireFrame(allowed?(guardianAudioFrame??audio.guardianAudioFrame):null,session);
    const js="window.dispatchEvent(new MessageEvent('message',{data:"+JSON.stringify(packet)+"}));true;";
    webviewRef.current?.injectJavaScript(js);
  };
  // Explicitly opt-in at build time; disabled in normal production builds.
  const qaEnabled = world==='hub' && process.env.EXPO_PUBLIC_GUARDIAN_DEVICE_QA === '1';
  const qaLatest = useRef<string | null>(null);
  const [qaSummary,setQaSummary] = useState('No on-device Guardian measurements collected');
  const captureDeviceQa=()=>{
    const msg={source:'staar-guardian-device-qa-request-v1',session};
    webviewRef.current?.injectJavaScript(
      "window.dispatchEvent(new MessageEvent('message',{data:"+JSON.stringify(msg)+"}));true;");
  };
  const exportDeviceQa=()=>{
    if(!qaLatest.current)return;
    // Only operator-initiated local iOS Share Sheet; no network upload.
    void Share.share({title:'STAARWAARDD Guardian Device QA',
      message:qaLatest.current}).catch(()=>{});
  };
  const [retryCount, setRetryCount] = useState(0);
  const session = useMemo(() => `${Date.now()}_${Math.random().toString(36).slice(2)}`, [world, variant, retryCount]);
  useEffect(()=>{pushGuardianFrame();},[
    guardianAudioFrame,audio.guardianAudioFrame,audio.master,audio.voice,
    audio.speechQuiet,audio.voicePlaybackActive,session,
  ]);

  useEffect(()=>{
    audio.setGuardianRigHash(null);
    return ()=>audio.setGuardianRigHash(null);
  },[world,variant,session,audio.setGuardianRigHash]);

  const html = useMemo(() => worldSceneHtml(world, variant, session, qaEnabled), [world, variant, session, qaEnabled]);
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
  if (loadFailed) return <ScrollView contentContainerStyle={{ padding: 22, gap: 12, backgroundColor: '#030713', minHeight: 420 }}>
    <Text accessibilityRole="alert" style={{ color: '#F2DFB4', fontSize: 18, fontWeight: '700' }}>3D preview unavailable</Text>
    <Text style={{ color: '#D6DFEC', lineHeight: 22 }}>The local scene could not load. Use these safe navigation controls instead. No devices or external services have been activated.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retry local 3D scene" onPress={() => { setRetryCount(count => count + 1); setLoadFailed(false); }}
      style={{ minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D5C08B', justifyContent: 'center' }}><Text style={{ color: '#F2DFB4', fontSize: 15 }}>Retry 3D preview</Text></Pressable>
    {fallback.map(([label, action]) => <Pressable key={action} accessibilityRole="button"
      onPress={() => onAction(action)} style={{ minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#9AAABF', justifyContent: 'center' }}>
      <Text style={{ color: '#F2F5FA', fontSize: 15 }}>{label}</Text>
    </Pressable>)}
  </ScrollView>;
  return <View style={{ width: '100%', height: '100%', minHeight: 420 }}>
    {qaEnabled ? <View style={{ padding: 8, backgroundColor:'#080E1B', gap:6 }}>
      <Text style={{color:'#E8D9AF',fontSize:12,fontWeight:'600'}}>
        GUARDIAN DEVICE QA · {qaSummary}
      </Text>
      <View style={{flexDirection:'row',gap:12}}>
        <Pressable onPress={captureDeviceQa} accessibilityRole="button"
          accessibilityLabel="Capture local Guardian frame metrics"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Capture frame QA</Text>
        </Pressable>
        <Pressable onPress={exportDeviceQa} disabled={!qaLatest.current}
          accessibilityRole="button" accessibilityLabel="Share Guardian device QA report"
          style={{minHeight:44,padding:12,borderWidth:1,borderColor:'#C9AC6D',borderRadius:8}}>
          <Text style={{color:'#FFFFFF'}}>Export QA</Text>
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
      onMessage={event => { try { const message: unknown = JSON.parse(event.nativeEvent.data); if (!message || typeof message !== 'object' || !('session' in message) || message.session !== session) return; if (message && typeof message === 'object' && 'source' in message && 'type' in message && 'world' in message && message.source === 'staar-scene-v1' && message.type === 'unavailable' && message.world === world) { setLoadFailed(true); return; } if (message && typeof message === 'object' && 'source' in message && 'type' in message && 'world' in message && message.source === 'staar-scene-v1' && message.type === 'ready' && message.world === world) { sceneReady.current = true; return; } if (message && typeof message === 'object' && 'source' in message && 'type' in message && 'world' in message && 'modelSha256' in message && message.source === 'staar-scene-v1' && message.type === 'guardian-face-ready' && world === 'hub' && message.world === world && typeof message.modelSha256 === 'string') { audio.setGuardianRigHash(message.modelSha256); return; } if(qaEnabled && 'source' in message && 'type' in message && 'world' in message &&
        'metrics' in message && message.source==='staar-scene-v1' &&
        message.type==='guardian-device-qa' && message.world==='hub' &&
        message.metrics && typeof message.metrics==='object' &&
        !Array.isArray(message.metrics) &&
        'schema' in message.metrics &&
        message.metrics.schema==='staar-guardian-physical-device-qa-telemetry-v1'){
          const metrics=message.metrics as Record<string,unknown>;
          const report={
            ...metrics,
            exportedAt:new Date().toISOString(),
            clientPlatform:Platform.OS,
            renderSession:session,
            physicalIphoneOwnerAttestation:false,
            // An exported client report is not external AV latency evidence.
            realDeviceCertification:'UNVERIFIED',
          };
          qaLatest.current=JSON.stringify(report,null,2);
          setQaSummary(String(metrics.frameCount??0)+' rendered frames; '+
            (metrics.modelBound===true?'GLB bound':'no approved GLB'));
          return;
        }
        const action = sceneAction(message, world); if (action) { const next = { world, action, atMs: Date.now() }; if (shouldDispatchSceneAction(lastDispatch.current, next)) { lastDispatch.current = next; onAction(action); } } } catch { /* Invalid renderer messages are ignored. */ } }}
      style={{ backgroundColor: '#030713' }} />
  </View>;
}
