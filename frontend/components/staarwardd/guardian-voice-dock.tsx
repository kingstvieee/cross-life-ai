import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/auth';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';

/** Mounted above the router: controls persist while navigating between all nine worlds. */
export function GuardianVoiceDock() {
  const { user } = useAuth();
  const audio = useStaarAudio();
  const router = useRouter();
  const pathname = usePathname();
  if (!user || pathname === '/chat' || pathname.startsWith('/auth')) return null;
  const audible = audio.master && audio.voice && !audio.speechQuiet;
  const name = user.companion === 'kaia' ? 'Kaia' : user.companion === 'atlas' ? 'Atlas' : 'Guardian';
  return <View pointerEvents="box-none" style={s.layer}>
    <View style={s.dock}>
      <View style={s.identity}><View style={[s.dot, !audible && s.off]} /><Text style={s.name}>{name}</Text><Text style={s.status}>{audible ? 'VOICE READY' : 'SILENT'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={audible ? 'Mute Guardian everywhere' : 'Enable Guardian voice everywhere'} onPress={() => {
        if (audible) audio.setSpeechQuiet(true);
        else { audio.update({ master: true, voice: true }); audio.setSpeechQuiet(false); }
      }} style={s.action}><Ionicons name={audible ? 'volume-high-outline' : 'volume-mute-outline'} size={21} color="#E9EDF2" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Guardian conversation" onPress={() => router.push('/chat')} style={s.action}><Ionicons name="chatbubble-ellipses-outline" size={21} color="#E9EDF2" /></Pressable>
    </View>
  </View>;
}
const s=StyleSheet.create({
  layer:{position:'absolute',bottom:10,left:12,right:12,alignItems:'center'},
  dock:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,borderRadius:26,borderWidth:1,borderColor:'#87929E',backgroundColor:'rgba(10,12,16,.96)',maxWidth:390,width:'100%'},
  identity:{flex:1,flexDirection:'row',alignItems:'center',gap:7},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:'#D9E3F0'},off:{backgroundColor:'#747982'},
  name:{color:'#F4F5F7',fontSize:12,fontWeight:'700'},status:{color:'#B8C2D0',fontSize:9,letterSpacing:.7},
  action:{padding:8,borderRadius:16,borderWidth:1,borderColor:'#5C6671'}
});
