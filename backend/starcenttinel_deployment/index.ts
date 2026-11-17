// Build 218 live independent health attestation: read-only and fail-closed.
// The API never activates owner recovery, portal enforcement, or real revocations.
// JWT validation remains ENABLED at the Supabase gateway.
const PROJECT="khpprzhqovzhgxdltarq";
const BASE="https://"+PROJECT+".supabase.co";
const HEADERS={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store, private, max-age=0",
  "x-content-type-options":"nosniff",
  "vary":"Authorization",
};
const DENIED={service:"starcenttinel-security-control",state:"LOCKDOWN",
  revision:0,external_authority_verified:false,owner_webauthn_verified:false,
  provider_revocation_verified:false,portal_enforcement_count:0,
  ready_for_live_actions:false};
const encoder=new TextEncoder();
function reply(status:number,body:unknown,proof?:string){
  return new Response(JSON.stringify(body),{
    status,headers:{...HEADERS,...(proof?{"X-StarCenttinel-Proof":"sha256="+proof}:{})}
  });
}
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");}
async function prove(nonce:string,body:string){
  const secret=Deno.env.get("STARCENTTINEL_PROOF_KEY")||"";
  if(secret.length<32)return null; // missing secret = unsigned, never attest ready
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(nonce+"\n"+body)));
}
async function snapshot():Promise<Record<string,unknown>>{
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(serviceKey.length<24)return {...DENIED};
  try{
    const signal=AbortSignal.timeout(1800);
    const response=await fetch(BASE+"/rest/v1/rpc/starcenttinel_security_snapshot",{
      method:"POST",signal,
      headers:{"authorization":"Bearer "+serviceKey,"apikey":serviceKey,
        "content-type":"application/json","accept":"application/json"},
      body:"{}",
    });
    if(!response.ok)return {...DENIED};
    const data=await response.json();
    if(!data||Array.isArray(data)||typeof data!=="object"||
      data.service!==DENIED.service||!Number.isSafeInteger(data.revision)||
      data.revision<0)return {...DENIED};
    // DO NOT infer activation from mode or revision. Only actual externally
    // verified evidence can upgrade these fields in a future audited version.
    return {...DENIED,
      state:data.state==="LOCKDOWN"?"LOCKDOWN":"LOCKDOWN",
      revision:data.revision,
    };
  }catch{return {...DENIED};}
}
Deno.serve(async req=>{
  const url=new URL(req.url);
  if(req.method==="GET"&&url.pathname.endsWith("/sentinel-control/health")){
    const nonce=req.headers.get("X-StarCenttinel-Nonce")||"";
    if(!/^[a-f0-9]{48,128}$/.test(nonce))return reply(400,{error:"nonce_required"});
    const data=await snapshot();
    const body={...data,nonce,issued_at:new Date().toISOString()};
    const raw=JSON.stringify(body);
    // A signature attests the DENIED state only. It is never proof of WebAuthn.
    const proof=await prove(nonce,raw).catch(()=>null);
    return new Response(raw,{status:200,headers:{
      ...HEADERS,...(proof?{"X-StarCenttinel-Proof":"sha256="+proof}:{})
    }});
  }
  if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
  return reply(423,{error:"independent_authority_not_provisioned",
    state:"LOCKDOWN",retryable:false});
});
