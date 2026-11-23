/**
 * Guardian video-intelligence intake — 2026-11-23.
 * Research records are NOT deployed device integrations or financial endorsements.
 * Pure functions, no network calls, payments, or secrets.
 */
export type Priority = 'P0' | 'P1' | 'P2';
export type Portal = 'home' | 'work' | 'community' | 'health' | 'style' | 'creativity';
export type Verification = 'unverified' | 'conditional' | 'verified' | 'avoid';
export type Component = Readonly<{id:string;name:string;priority:Priority;portal:Portal;requires:string[];releaseGate:string}>;
export const VIDEO_COMPONENTS: readonly Component[] = [
 ['network-inventory','Network inventory','P0','home',['authorized LAN discovery'],'Inventory reviewed and user-approved'],
 ['secure-remote','Secure remote access','P0','home',['identity provider','Tailscale or equivalent'],'Unauthorized remote connections rejected'],
 ['tuya-adapter','Tuya control adapter','P0','home',['Tuya credentials','compatible device'],'Command response and physical device state agree'],
 ['ttlock-adapter','TTLock compatibility check','P0','home',['lock model','gateway/API eligibility'],'No unlock action without explicit authorization'],
 ['tv-adapter','Smart TV adapter','P1','home',['TV model','supported local or vendor API'],'Physical TV state verified'],
 ['emergency-mode','Emergency mode','P0','home',['local state persistence'],'Accessible without cloud services'],
 ['offline-knowledge','Offline knowledge cache','P0','home',['licensed offline content'],'Offline retrieval passes airplane-mode test'],
 ['emergency-lighting','Emergency lighting inventory','P0','home',['battery-backed light inventory'],'No mains-only bulb represented as backup'],
 ['power-failover','Power failover assessment','P1','home',['power monitor or UPS telemetry'],'Actual outage detection verified'],
 ['offline-maps','Offline maps','P1','community',['licensed map data'],'Maps usable with network disabled'],
 ['first-aid','First-aid reference library','P1','health',['authoritative licensed Canadian guidance'],'Source and revision date visible'],
 ['diy-safety','DIY project safety screening','P1','home',['safety rules'],'Hazardous projects require professional review'],
 ['financial-claims','Financial claim verification','P0','work',['source registry'],'Unsupported payout guarantees blocked'],
 ['assistance-directory','Assistance directory','P1','community',['official eligibility sources'],'Canadian eligibility and evidence visible'],
 ['funding-intelligence','Canadian funding intelligence','P1','work',['official funding sources'],'Grant vs investment vs donation separated'],
 ['archive-provenance','Archive provenance database','P1','style',['rights-cleared references'],'Attribution and uncertainty recorded'],
 ['construction-library','RSF construction library','P1','creativity',['approved tech packs'],'Existing locked garments preserved'],
 ['materials-intelligence','RSF material intelligence','P1','creativity',['supplier specifications'],'CAD landed costs explicitly labelled estimates'],
 ['collection-story','Collection storytelling','P2','style',['approved RSF creative direction'],'No third-party artwork copied'],
 ['viral-research','Viral claim research engine','P1','creativity',['source evidence'],'Claim and verification separated'],
].map(([id,name,priority,portal,requires,releaseGate])=>({id:id as string,name:name as string,priority:priority as Priority,portal:portal as Portal,requires:requires as string[],releaseGate:releaseGate as string}));
export type Evidence = Readonly<{sourceUrl:string;checkedAt:string;operatorVerified:boolean;canadianEligibilityVerified:boolean;independentPaymentEvidence:boolean;feesDisclosed:boolean;privacyReviewed:boolean;redFlags:readonly string[]}>;
export type Assessment = Readonly<{status:Verification;score:number;reasons:string[];mayRecommend:boolean}>;
export function assessFinancialPlatform(e:Evidence):Assessment {
 const reasons:string[]=[];
 if(!/^https:\/\//.test(e.sourceUrl)) reasons.push('HTTPS source URL required');
 if(!/^\d{4}-\d{2}-\d{2}/.test(e.checkedAt)) reasons.push('Review date missing');
 if(!e.operatorVerified) reasons.push('Operator not independently verified');
 if(!e.canadianEligibilityVerified) reasons.push('Canadian eligibility not verified');
 if(!e.independentPaymentEvidence) reasons.push('No independent payment evidence');
 if(!e.feesDisclosed) reasons.push('Fees not confirmed');
 if(!e.privacyReviewed) reasons.push('Privacy practices not reviewed');
 const score=(e.operatorVerified?20:0)+(e.canadianEligibilityVerified?15:0)+(e.independentPaymentEvidence?25:0)+(e.feesDisclosed?15:0)+(e.privacyReviewed?15:0)+(e.redFlags.length===0?10:0);
 if(e.redFlags.length) return {status:'avoid',score,reasons:[...reasons,...e.redFlags],mayRecommend:false};
 const complete=reasons.length===0;
 return {status:complete?'verified':'unverified',score,reasons,mayRecommend:complete};
}
export function releaseReady(id:string, passedGateIds:ReadonlySet<string>):boolean {
 return VIDEO_COMPONENTS.some(c=>c.id===id) && passedGateIds.has(id);
}
