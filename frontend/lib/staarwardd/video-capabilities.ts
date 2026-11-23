/** Guardian video-derived capability implementations. No payment features.
 * Pure, offline-safe functions; external devices require authenticated adapters.
 */
import { VIDEO_COMPONENTS } from './video-intelligence';
export type Device = {id:string;name:string;kind:'light'|'lock'|'tv'|'sensor'|'switch';provider:'home-assistant'|'tuya'|'ttlock'|'google-home'|'other';state:string;lastSeen?:string};
export function inventory(devices:readonly Device[]) {
 const ids=new Set<string>(); return devices.filter(d=>{if(!/^[a-z0-9_.:-]{2,128}$/i.test(d.id)||ids.has(d.id))return false;ids.add(d.id);return true;});
}
export type AccessContext={authenticated:boolean;role:'owner'|'admin'|'guest';explicitConsent:boolean};
export function authorizeRemote(ctx:AccessContext){return ctx.authenticated&&ctx.explicitConsent&&(ctx.role==='owner'||ctx.role==='admin');}
export type Adapter={provider:Device['provider'];read:(id:string)=>Promise<string>;command?:(id:string,action:'on'|'off')=>Promise<void>};
export async function verifiedControl(device:Device,action:'on'|'off',ctx:AccessContext,adapter:Adapter){
 if(!authorizeRemote(ctx))throw Error('Permission denied');
 if(device.kind!=='light'&&device.kind!=='tv')throw Error('Only light/TV controls are supported; locks remain read-only');
 if(device.provider!==adapter.provider||!adapter.command)throw Error('Compatible control adapter unavailable');
 await adapter.command(device.id,action);const actual=await adapter.read(device.id);
 return {id:device.id,requested:action,actual,verified:actual===action};
}
export function ttlockCapability(device:Device,hasGateway:boolean,hasApprovedApi:boolean){
 return {supported:device.provider==='ttlock'&&device.kind==='lock'&&hasGateway&&hasApprovedApi,unlockEnabled:false};
}
export type OfflineEntry={id:string;title:string;body:string;source:string;reviewedAt:string;licensed:boolean;category:'preparedness'|'first-aid'|'maps'|'diy'};
export function searchOffline(entries:readonly OfflineEntry[],query:string,category?:OfflineEntry['category']){
 const q=query.trim().toLowerCase();if(!q)return [];
 return entries.filter(e=>e.licensed&&(!category||e.category===category)&&(e.title+' '+e.body).toLowerCase().includes(q)).slice(0,30);
}
export function emergencyState(online:boolean,backupPowerAvailable:boolean){
 return {mode:online?'normal':'offline',knowledgeAvailable:true,remoteAutomationAvailable:online,backupPowerAvailable,
 warning:!backupPowerAvailable?'Local hardware may stop when mains power fails':undefined};
}
export type Light={id:string;location:string;batteryBacked:boolean;chargePercent?:number};
export function emergencyLights(lights:readonly Light[]){return lights.filter(l=>l.batteryBacked).map(l=>({...l,needsCharge:l.chargePercent!==undefined&&l.chargePercent<30}));}
export type PowerSample={source:'ups'|'battery'|'manual';mainsAvailable?:boolean;batteryPercent?:number;timestamp:string};
export function assessPower(sample:PowerSample){return {outageConfirmed:sample.source==='ups'&&sample.mainsAvailable===false,lowBattery:sample.batteryPercent!==undefined&&sample.batteryPercent<25,source:sample.source};}
export function offlineMapReady(entries:readonly OfflineEntry[]){return entries.some(e=>e.category==='maps'&&e.licensed&&!!e.source);}
export function firstAidReferences(entries:readonly OfflineEntry[]){return entries.filter(e=>e.category==='first-aid'&&e.licensed&&!!e.source&&/^\d{4}-\d{2}-\d{2}$/.test(e.reviewedAt));}
export function diyRisk(text:string){const flags=['mains wiring','lithium cell','generator indoors','carbon monoxide','medical treatment','firearm','explosive'];const matched=flags.filter(x=>text.toLowerCase().includes(x));return {requiresExpertReview:matched.length>0,flags:matched};}
export type ArchivePiece={id:string;title:string;designer?:string;era?:string;source:string;rightsCleared:boolean;attribution:'confirmed'|'inferred'|'unknown'};
export function archiveCatalog(pieces:readonly ArchivePiece[]){return pieces.filter(p=>p.rightsCleared&&p.source&&p.attribution!=='unknown');}
export type Garment={id:string;name:string;locked:boolean;constructionNotes:string[];approvedChanges:string[]};
export function proposeConstruction(garment:Garment,note:string){if(!note.trim())throw Error('Construction note required');return {...garment,constructionNotes:[...garment.constructionNotes,note],approvedChanges:[...garment.approvedChanges]};}
export type Material={name:string;quantity:number;unitCostCad:number;shippingCad?:number;dutyCad?:number};
export function materialsEstimate(items:readonly Material[]){if(items.some(i=>![i.quantity,i.unitCostCad,i.shippingCad??0,i.dutyCad??0].every(Number.isFinite)||i.quantity<0||i.unitCostCad<0||(i.shippingCad??0)<0||(i.dutyCad??0)<0))throw Error('Invalid CAD estimate');return {currency:'CAD' as const,estimated:true,totalCad:Math.round(items.reduce((n,i)=>n+i.quantity*i.unitCostCad+(i.shippingCad??0)+(i.dutyCad??0),0)*100)/100};}
export function collectionStory(title:string,originalText:string,approved:boolean){return {title,originalText,status:approved?'approved':'draft',publicationAllowed:approved&&!!title.trim()&&!!originalText.trim()};}
export const CAPABILITY_HANDLERS=Object.freeze({
 'network-inventory':inventory,'secure-remote':authorizeRemote,'tuya-adapter':verifiedControl,
 'ttlock-adapter':ttlockCapability,'tv-adapter':verifiedControl,'emergency-mode':emergencyState,
 'offline-knowledge':searchOffline,'emergency-lighting':emergencyLights,'power-failover':assessPower,
 'offline-maps':offlineMapReady,'first-aid':firstAidReferences,'diy-safety':diyRisk,
 'archive-provenance':archiveCatalog,'construction-library':proposeConstruction,
 'materials-intelligence':materialsEstimate,'collection-story':collectionStory
});
export function registryCoverage(){return VIDEO_COMPONENTS.map(c=>({id:c.id,handlerPresent:Object.prototype.hasOwnProperty.call(CAPABILITY_HANDLERS,c.id)}));}
