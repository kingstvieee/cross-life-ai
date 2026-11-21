import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { isProactiveWelcomeTime } from '@/src/guardian-greeting-policy';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';
export function GuardianNotifications() {
  const {user} = useAuth();
  return user && !user.is_demo ? <AccountNotifications key={user.user_id}/> : null;
}
function AccountNotifications() {
  const {user,api} = useAuth();
  const audio = useStaarAudio();
  const router = useRouter();
  const [line,setLine] = useState('');
  const active = useRef(true);
  const busy = useRef(false);
  const latest = useRef(audio);
  latest.current = audio;
  useEffect(()=>{
    active.current = true;
    async function run() {
      if(busy.current || AppState.currentState !== 'active') return;
      busy.current = true;
      try {
        const stateResponse=await api('/api/guardian/life-map/overview');
        if(!stateResponse.ok || !active.current) return;
        const state=await stateResponse.json();
        if(state.privateMode || user?.cross_life_paused) { latest.current.stopAll();setLine('');return; }
        if(state.speechQuiet && !latest.current.speechQuiet) latest.current.setSpeechQuiet(true);
        // The Hub owns the arrival welcome and synchronizes it with the 3D reveal.
        const canSpeak = () => {
          const voice = latest.current;
          return active.current && AppState.currentState === 'active' &&
            isProactiveWelcomeTime(new Date()) && voice.master && voice.voice &&
            !voice.speechQuiet && !voice.voicePlaybackActive && voice.speechPhase === 'idle';
        };
        if(state.consent?.checkIns !== true || state.speechQuiet || !canSpeak()) return;
        const inbox=await api('/api/guardian/life-map/notifications');
        if(!inbox.ok || !active.current) return;
        const event=[...(await inbox.json()).events].reverse().find((e:any)=>e.kind==='checkIns' && e.state==='pending');
        if(!event || !canSpeak()) return;
        const response=await api(`/api/guardian/life-map/notifications/${event.key}/claim`,{method:'POST'});
        if(!response.ok || !active.current) return;
        const claim=await response.json();
        if(!claim.claimed) return;
        const message = 'There is an update in your Guardian inbox.';
        const ready = canSpeak();
        if (ready) setLine(message);
        const played = ready && await latest.current.speak(message, undefined, 'guardian');
        if(active.current) await api(`/api/guardian/life-map/notifications/${event.key}/receipt`,{method:'POST',body:JSON.stringify({token:claim.token,outcome:played?'played':'failed'})});
      } catch { /* Retain durable state without inventing successful playback. */ }
      finally { busy.current=false; }
    }
    void run();
    const timer=setInterval(()=>void run(),15000);
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')void run();else latest.current.stopAll();});
    return()=>{active.current=false;clearInterval(timer);subscription.remove();latest.current.stopAll();};
  },[api,user?.user_id,user?.cross_life_paused]);
  return line ? <View style={s.box}><Text accessibilityLiveRegion="polite" style={s.text}>{line}</Text>{!!audio.voiceNotice && <Text style={s.detail}>{audio.voiceNotice}</Text>}<View style={s.row}><Pressable accessibilityRole="button" onPress={()=>router.push('/guardian-tools')}><Text style={s.link}>Open Guardian inbox</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Dismiss Guardian update" onPress={()=>setLine('')}><Text style={s.link}>Dismiss</Text></Pressable></View></View> : null;
}
const s=StyleSheet.create({box:{position:'absolute',bottom:22,left:18,right:18,maxWidth:560,alignSelf:'center',padding:16,borderRadius:18,borderWidth:1,borderColor:'#8693A5',backgroundColor:'#111821',gap:7},text:{color:'#F0F4FA',fontSize:14,lineHeight:21},detail:{color:'#B9C4D4',fontSize:12},row:{flexDirection:'row',justifyContent:'space-between'},link:{paddingVertical:6,color:'#DEE9FA',fontWeight:'600'}});
