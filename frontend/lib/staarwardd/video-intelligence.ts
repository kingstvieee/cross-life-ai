/**
 * Guardian video-intelligence intake — 2026-11-23.
 * No payment, wish-funding, financial assistance, or financial-platform modules are included.
 * Pure functions, no network calls, payments, or secrets.
 */
export type Priority = 'P0' | 'P1' | 'P2';
export type Portal = 'home' | 'work' | 'community' | 'health' | 'style' | 'creativity';
export type Verification = 'unverified' | 'conditional' | 'verified' | 'avoid';
export type Component = Readonly<{id:string;name:string;priority:Priority;portal:Portal;requires:string[];releaseGate:string}>;
const definitions: Array<[string,string,Priority,Portal,string[],string]> = [
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
 ['archive-provenance','Archive provenance database','P1','style',['rights-cleared references'],'Attribution and uncertainty recorded'],
 ['construction-library','RSF construction library','P1','creativity',['approved tech packs'],'Existing locked garments preserved'],
 ['materials-intelligence','RSF material intelligence','P1','creativity',['supplier specifications'],'CAD landed costs explicitly labelled estimates'],
 ['collection-story','Collection storytelling','P2','style',['approved RSF creative direction'],'No third-party artwork copied'],
];
export const VIDEO_COMPONENTS: readonly Component[] = definitions.map(([id,name,priority,portal,requires,releaseGate])=>({id,name,priority,portal,requires,releaseGate}));
