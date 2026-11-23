// Required before any signed IPA: check the actual production API and its
// Mongo readiness/auth boundaries. A valid HTTPS URL alone is not certification.
export const FORBIDDEN_ORIGINS = new Set([
  'https://cross-life-ai.emergent.host',
  'https://staarwardd-guardian-preview.onrender.com',
]);
export function validatedOrigin(value) {
  if(typeof value!=='string') throw new Error('production_origin_missing');
  let url;
  try{url=new URL(value)}catch{throw new Error('production_origin_invalid')}
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||
     FORBIDDEN_ORIGINS.has(url.origin)||!url.hostname) throw new Error('production_origin_not_isolated');
  return url.origin;
}
export async function verifyLiveProductionBackend(origin,{request=globalThis.fetch}={}) {
  const base=validatedOrigin(origin);
  if(typeof request!=='function') throw new Error('fetch_unavailable');
  async function probe(path,init={}) {
    const r=await request(base+path,{...init,redirect:'manual',headers:{Accept:'application/json',...(init.headers||{})},signal:AbortSignal.timeout(65_000)});
    return r;
  }
  const live=await probe('/api/health/live');
  if(live.status!==200||(await live.json()).status!=='alive')throw new Error('production_liveness_failed');
  const ready=await probe('/api/health/ready');
  const readyBody=await ready.json();
  if(ready.status!==200||readyBody.status!=='ready'||readyBody.database!=='connected')
    throw new Error('production_mongo_readiness_failed');
  const providers=await probe('/api/auth/providers');
  const p=await providers.json();
  if(providers.status!==200||!p.nativeEnabled||!p.providers?.some(x=>x.id==='google'&&x.enabled))
    throw new Error('production_google_auth_not_configured');
  const anonymous=await probe('/api/auth/me');
  if(anonymous.status!==401)throw new Error('production_anonymous_auth_boundary_failed');
  const spoofedOrigin=await probe('/api/auth/providers',{method:'OPTIONS',headers:{
    Origin:'https://untrusted.example.invalid','Access-Control-Request-Method':'GET',
  }});
  if(spoofedOrigin.status!==400||spoofedOrigin.headers?.get?.('access-control-allow-origin'))
    throw new Error('production_cors_origin_not_rejected');
  return {
    base,readiness:'pass',database:'connected',googleProviderConfigured:true,
    anonymousBoundary:'401',crossOriginBoundary:'400',
    realOwnerGoogleReadbackCertified:false,archiveAndDeviceCertified:false,
  };
}
if(process.argv[1]?.endsWith('verify-live-production-backend.mjs')) {
  verifyLiveProductionBackend(process.env.STAAR_PRODUCTION_BACKEND_URL)
    .then(r=>{console.log(JSON.stringify(r));})
    .catch(e=>{console.error('PRODUCTION_BACKEND_PRECHECK_FAILED: '+e.message);process.exitCode=1});
}
