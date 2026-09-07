import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { PORTALS } from "@/lib/staarwardd/portal-data";
import { glow, textGlow } from "@/lib/staarwardd/shadow";

const ORDER = ["creativity", "work", "home", "wellbeing", "relationships", "style", "events"];
const NAMES: Record<string,string> = { events: "COMMUNITY" };

export function WorldSummoning({ onComplete }: { onComplete: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const worlds = useMemo(() => ORDER.map(id => PORTALS.find(p => p.id === id)!).filter(Boolean), []);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= worlds.length) {
      const done = setTimeout(onComplete, 1700);
      return () => clearTimeout(done);
    }
    const next = setTimeout(() => setStep(s => s + 1), compact ? 1450 : 1250);
    return () => clearTimeout(next);
  }, [step, worlds.length, compact, onComplete]);

  const active = worlds[Math.min(step, worlds.length - 1)];
  return <View style={s.root}>
    <LinearGradient colors={["#02050C", "#07152A", "#211007"]} style={StyleSheet.absoluteFill} />
    <View style={s.skyGlow} />
    <Text style={s.kicker}>GUARDIAN · THE CALL HAS BEEN ANSWERED</Text>
    <Text style={[s.heading, compact && s.headingSmall]}>{step < worlds.length ? "OPENING YOUR WORLDS" : "THE HUB IS READY"}</Text>

    <View style={[s.stage, compact && s.stageSmall]}>
      <View style={[s.guardian, compact && s.guardianSmall]}>
        <GuardianCharacter state="portalSelection" mood="focused" portalMode="hub" size={compact ? 245 : 390} />
        <View style={s.handEnergy} />
      </View>

      <View style={[s.portal, compact && s.portalSmall, { borderColor: active?.color || "#E8C86F", ...glow(active?.color || "#E8C86F", 34, .8) }]}>
        {active && <Image source={active.image} resizeMode="cover" style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={["rgba(0,0,0,.02)", "rgba(0,0,0,.18)", "rgba(0,0,0,.76)"]} style={StyleSheet.absoluteFill} />
        <View style={s.ringA} /><View style={s.ringB} /><View style={s.spark1} /><View style={s.spark2} />
        <View style={s.copy}>
          <Text style={s.count}>{Math.min(step + 1, 7)} / 7</Text>
          <Text style={[s.worldName, compact && s.worldNameSmall]}>{active ? (NAMES[active.id] || active.name.toUpperCase()) : ""}</Text>
          <Text style={s.tagline}>{active?.tagline}</Text>
          <Text style={s.open}>{step < worlds.length ? "WORLD OPEN" : "SEVEN WORLDS · ONE LIFE"}</Text>
        </View>
      </View>
    </View>

    <View style={s.progress}>{worlds.map((p,i)=><View key={p.id} style={[s.dot, i <= step && { backgroundColor:p.accent || p.color, ...glow(p.accent || p.color,10,.7) }]} />)}</View>
    <Text style={s.footer}>STAARWAARDD · TORONTO</Text>
    <Pressable accessibilityRole="button" onPress={onComplete} style={s.skip}><Text style={s.skipText}>ENTER HUB</Text></Pressable>
  </View>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#02050C",alignItems:"center",justifyContent:"center",padding:18,overflow:"hidden"},
 skyGlow:{position:"absolute",width:700,height:700,borderRadius:999,backgroundColor:"rgba(232,200,111,.07)",...glow("#E8C86F",70,.55)},
 kicker:{position:"absolute",top:54,color:"#F5D77B",fontSize:9,letterSpacing:2.2,fontWeight:"900"},
 heading:{position:"absolute",top:78,color:"#FFF4D0",fontSize:25,letterSpacing:4,fontWeight:"900",...textGlow("#B47B20",12)},headingSmall:{fontSize:17,letterSpacing:2.2},
 stage:{width:"100%",maxWidth:1180,height:"72%",flexDirection:"row",alignItems:"center",justifyContent:"center"},stageSmall:{height:"74%",flexDirection:"column",paddingTop:35},
 guardian:{width:"42%",height:"100%",alignItems:"center",justifyContent:"center",zIndex:4},guardianSmall:{width:"100%",height:"42%",marginBottom:-35},
 handEnergy:{position:"absolute",right:"5%",top:"42%",width:82,height:82,borderRadius:999,borderWidth:2,borderColor:"#FFE49A",backgroundColor:"rgba(255,213,91,.12)",...glow("#FFC94F",34,.95)},
 portal:{width:"52%",aspectRatio:1.15,borderRadius:999,borderWidth:4,overflow:"hidden",justifyContent:"flex-end",transform:[{rotate:"-1deg"}]},portalSmall:{width:"94%",maxHeight:390,aspectRatio:1.08,borderWidth:3},
 ringA:{position:"absolute",inset:9,borderRadius:999,borderWidth:2,borderColor:"rgba(255,232,164,.88)"},ringB:{position:"absolute",inset:19,borderRadius:999,borderWidth:1,borderColor:"rgba(255,255,255,.52)"},
 spark1:{position:"absolute",top:20,right:55,width:10,height:10,borderRadius:9,backgroundColor:"#FFF4BD",...glow("#FFD45D",20,1)},spark2:{position:"absolute",bottom:70,left:25,width:7,height:7,borderRadius:7,backgroundColor:"#FFF",...glow("#FFD45D",16,1)},
 copy:{padding:28,alignItems:"center"},count:{color:"#FFEBA9",fontSize:9,letterSpacing:2,fontWeight:"900"},worldName:{color:"#FFF",fontSize:38,letterSpacing:2,fontWeight:"900",...textGlow("#000",12)},worldNameSmall:{fontSize:27},tagline:{color:"#FFF0C6",fontSize:12,fontWeight:"700",marginTop:3,textAlign:"center"},open:{color:"#F1CB65",fontSize:9,letterSpacing:2.4,fontWeight:"900",marginTop:12},
 progress:{position:"absolute",bottom:48,flexDirection:"row",gap:9},dot:{width:34,height:3,borderRadius:9,backgroundColor:"rgba(255,255,255,.18)"},footer:{position:"absolute",bottom:24,color:"#E8C86F",fontSize:8,letterSpacing:2.1,fontWeight:"800"},
 skip:{position:"absolute",right:18,bottom:18,borderWidth:1,borderColor:"rgba(232,200,111,.5)",borderRadius:999,paddingHorizontal:14,paddingVertical:8,backgroundColor:"rgba(0,0,0,.4)"},skipText:{color:"#F7DE91",fontSize:8,letterSpacing:1.4,fontWeight:"900"}
});
