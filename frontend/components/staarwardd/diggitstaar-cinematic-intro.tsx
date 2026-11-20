/**
 * Owner-approved DIGGITSTAAR cinematic entry. Playback is optional until the
 * exact, hash-verified media is staged; the existing 3D studio always remains.
 * Does not touch the Guardian opening soundtrack or other portal identities.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { DIGGITSTAAR_MEDIA_PORTRAIT, DIGGITSTAAR_MEDIA_WIDE } from '@/lib/staarwardd/diggitstaar-cinematic-sources';

export function DiggitstaarCinematicIntro({ onFinish }: { onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const source = (width > height ? DIGGITSTAAR_MEDIA_WIDE : DIGGITSTAAR_MEDIA_PORTRAIT)!;
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(source, p => {
    p.loop = false;
    p.muted = true;
    p.play();
  });
  useEffect(() => {
    const ended = player.addListener('playToEnd', onFinish);
    const status = player.addListener('statusChange', e => {
      if (e.status === 'error') onFinish();
    });
    // Fail open if an iPhone has an unsupported codec or media never loads.
    const fallback = setTimeout(onFinish, 8500);
    return () => { ended.remove(); status.remove(); clearTimeout(fallback); };
  }, [player, onFinish]);
  return <Modal visible transparent={false} animationType="fade" onRequestClose={onFinish} statusBarTranslucent>
    <View style={s.root}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain"
        nativeControls={false} playsInline surfaceType="textureView" />
      <View style={s.header}>
        <Text style={s.title}>DIGGITSTAAR · CREATIVE COMMAND</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute workstation film' : 'Mute workstation film'}
          onPress={() => {
            const next = !muted;
            // expo-video exposes mutable playback controls; this does not mutate React state.
            // eslint-disable-next-line react-hooks/immutability
            player.muted = next;
            setMuted(next);
          }} style={s.control}>
          <Text style={s.action}>{muted ? 'SOUND OFF' : 'SOUND ON'}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip workstation film and enter 3D studio"
        onPress={onFinish} style={[s.control, s.skip]}>
        <Text style={s.action}>ENTER STUDIO / SKIP</Text>
      </Pressable>
      <Text style={s.disclosure}>CINEMATIC PREVIEW · LIVE PROVIDER STATUS VERIFIED INSIDE THE STUDIO</Text>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor:'#060910', justifyContent:'space-between'},
  header: {paddingTop: 58, paddingHorizontal: 20, flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:8},
  title: {color:'#FFE2A1', fontWeight:'900', fontSize:12, letterSpacing:1.1, flex:1},
  control: {backgroundColor:'rgba(8,15,31,.85)', paddingHorizontal:14, paddingVertical:12, borderColor:'#9DDCEF', borderWidth:1, borderRadius:12},
  action: {color:'#E8F7FF', fontWeight:'800', fontSize:11},
  skip: {alignSelf:'center', marginTop:'auto'},
  disclosure: {color:'#D1DAEB', backgroundColor:'rgba(3,9,19,.82)', fontSize:9, textAlign:'center', paddingVertical:18}
});
