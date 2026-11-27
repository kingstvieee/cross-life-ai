import test from 'node:test';
import assert from 'node:assert/strict';
import { VIDEO_COMPONENTS } from '../lib/staarwardd/video-intelligence.ts';
import { CAPABILITY_HANDLERS,registryCoverage,inventory,authorizeRemote,verifiedControl,ttlockCapability,searchOffline,emergencyState,emergencyLights,assessPower,offlineMapReady,firstAidReferences,diyRisk,archiveCatalog,proposeConstruction,materialsEstimate,collectionStory } from '../lib/staarwardd/video-capabilities.ts';
test('all 16 modules registered with handlers, no finance scope',()=>{
 assert.equal(VIDEO_COMPONENTS.length,16);assert.equal(Object.keys(CAPABILITY_HANDLERS).length,16);
 assert.ok(registryCoverage().every(c=>c.handlerPresent));
 assert.ok(VIDEO_COMPONENTS.every(c=>!/payment|wish|funding|financial|trading/i.test(c.name)));
});
test('network and access safety',()=>{
 assert.equal(inventory([{id:'light.one',name:'A',kind:'light',provider:'tuya',state:'off'},{id:'light.one',name:'B',kind:'light',provider:'tuya',state:'on'}]).length,1);
 assert.equal(authorizeRemote({authenticated:true,role:'guest',explicitConsent:true}),false);
 assert.equal(ttlockCapability({id:'lock.one',name:'Door',kind:'lock',provider:'ttlock',state:'locked'},true,true).unlockEnabled,false);
});
test('commands demand consent and real readback',async()=>{
 const light={id:'light.one',name:'A',kind:'light',provider:'tuya',state:'off'};
 const ctx={authenticated:true,role:'owner',explicitConsent:true};
 const adapter={provider:'tuya',read:async()=> 'off',command:async()=>{}};
 const result=await verifiedControl(light,'on',ctx,adapter);assert.equal(result.verified,false);
 await assert.rejects(verifiedControl({...light,kind:'lock'},'on',ctx,adapter),/Only light/);
 await assert.rejects(verifiedControl(light,'on',{...ctx,explicitConsent:false},adapter),/Permission denied/);
});
test('offline, power and safety do not invent telemetry',()=>{
 const entry={id:'a',title:'Preparedness',body:'Emergency kit',source:'https://example.org',reviewedAt:'2026-11-23',licensed:true,category:'preparedness'};
 assert.equal(searchOffline([entry],'emergency').length,1);
 assert.equal(emergencyState(false,false).mode,'offline');
 assert.equal(emergencyLights([{id:'a',location:'hall',batteryBacked:false}]).length,0);
 assert.equal(assessPower({source:'manual',mainsAvailable:false,timestamp:'2026-11-23'}).outageConfirmed,false);
 assert.equal(offlineMapReady([entry]),false);
 assert.equal(firstAidReferences([entry]).length,0);
 assert.equal(diyRisk('generator indoors').requiresExpertReview,true);
});
test('RSF records preserve approvals and CAD estimates',()=>{
 assert.equal(archiveCatalog([{id:'a',title:'Reference',source:'x',rightsCleared:false,attribution:'confirmed'}]).length,0);
 const g=proposeConstruction({id:'g',name:'STELLAR TRACK',locked:true,constructionNotes:[],approvedChanges:[]},'Check seams');
 assert.equal(g.locked,true);assert.equal(g.approvedChanges.length,0);
 assert.equal(materialsEstimate([{name:'fabric',quantity:2,unitCostCad:12.5}]).totalCad,25);
 assert.equal(collectionStory('RSF','Original',false).publicationAllowed,false);
});
