import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { VIDEO_COMPONENTS } from '@/lib/staarwardd/video-intelligence';
import { CAPABILITY_HANDLERS, emergencyState, emergencyLights, registryCoverage } from '@/lib/staarwardd/video-capabilities';
type Portal = 'home'|'work'|'community'|'health'|'style'|'creativity';
const offlineGuidance = [
 {id:'power',title:'Power outage',body:'Use battery-powered lighting. Keep generators outdoors, away from windows and doors. Check local emergency guidance.',source:'https://www.getprepared.gc.ca/',reviewedAt:'2026-11-23',licensed:true,category:'preparedness' as const},
 {id:'medical',title:'First-aid reference',body:'For immediate danger call local emergency services. Consult official first-aid guidance; this summary is not clinical instruction.',source:'https://www.redcross.ca/training-and-certification/first-aid-tips-and-resources',reviewedAt:'2026-11-23',licensed:true,category:'first-aid' as const}
];
/** Visible research/connection boundary; does not pretend to actuate unconfigured hardware. */
export function GuardianCapabilitiesPanel({portal}:{portal:Portal}) {
 const [expanded,setExpanded]=useState(false);
 const [selected,setSelected]=useState<string|null>(null);
 const list=useMemo(()=>VIDEO_COMPONENTS.filter(c=>c.portal===portal),[portal]);
 const coverage=registryCoverage();
 if(!list.length)return null;
 const active=list.find(c=>c.id===selected);
 return <View style={s.root} testID="guardian-capabilities">
  <Pressable accessibilityRole="button" onPress={()=>setExpanded(v=>!v)} style={s.heading}>
   <Text style={s.title}>GUARDIAN SYSTEMS · {list.length} MODULES</Text>
   <Text style={s.caption}>{expanded?'HIDE':'INSPECT'} CAPABILITIES</Text>
  </Pressable>
  {expanded&&<View>
   <Text style={s.notice}>Software handlers available. Physical device control and offline downloads require verified setup. No unverified connection is represented as live.</Text>
   {list.map(c=><Pressable key={c.id} accessibilityRole="button" onPress={()=>setSelected(v=>v===c.id?null:c.id)} style={s.item}>
    <Text style={s.itemTitle}>{c.name}</Text>
    <Text style={s.caption}>{coverage.find(x=>x.id===c.id)?.handlerPresent?'CODE READY · CONNECTION NOT VERIFIED':'IMPLEMENTATION MISSING'} · {c.priority}</Text>
   </Pressable>)}
   {active&&<View style={s.detail}>
    <Text style={s.itemTitle}>{active.name}</Text>
    <Text style={s.copy}>Dependencies: {active.requires.join('; ')}</Text>
    <Text style={s.copy}>Release gate: {active.releaseGate}</Text>
    {active.id==='emergency-mode'&&<Text style={s.copy}>Offline plan: {emergencyState(false,false).warning}</Text>}
    {active.id==='emergency-lighting'&&<Text style={s.copy}>Battery-backed lighting registered: {emergencyLights([]).length}. Add actual equipment before enabling monitoring.</Text>}
    {active.id==='offline-knowledge'&&offlineGuidance.map(e=><View key={e.id}><Text style={s.itemTitle}>{e.title}</Text><Text style={s.copy}>{e.body}</Text><Text style={s.caption}>Source: {e.source}</Text></View>)}
   </View>}
  </View>}
 </View>;
}
const s=StyleSheet.create({
 root:{backgroundColor:'#101218',borderWidth:1,borderColor:'#B59A63',borderRadius:16,padding:14,marginVertical:12},
 heading:{paddingVertical:8},title:{color:'#E8D5A2',fontWeight:'800',fontSize:12,letterSpacing:1},
 caption:{color:'#AAB0BD',fontSize:10,marginTop:6},notice:{color:'#D6D7DB',fontSize:12,lineHeight:18,marginVertical:12},
 item:{borderTopWidth:1,borderTopColor:'#34353B',paddingVertical:11},
 itemTitle:{color:'#FFFFFF',fontWeight:'700',fontSize:13},copy:{color:'#D6D7DB',fontSize:12,lineHeight:18,marginTop:6},
 detail:{backgroundColor:'#25252B',borderRadius:10,padding:12,marginTop:10,gap:4}
});
