import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedOrigin, verifyLiveProductionBackend} from '../scripts/verify-live-production-backend.mjs';

const base='https://staarwardd-guardian-production.onrender.com';
const res=(status,data,headers={})=>({status,json:async()=>data,headers:{get:key=>headers[key]}});
const respond=async (url,options={})=>{
 const p=new URL(url).pathname;
 if(p==='/api/health/live')return res(200,{status:'alive'});
 if(p==='/api/health/ready')return res(200,{status:'ready',database:'connected'});
 if(p==='/api/auth/providers'&&options.method==='OPTIONS')return res(400,{detail:'Disallowed CORS origin'});
 if(p==='/api/auth/providers')return res(200,{nativeEnabled:true,providers:[{id:'google',enabled:true},{id:'microsoft',enabled:false}]});
 if(p==='/api/auth/me')return res(401,{detail:'authentication_required'});
 throw Error('unexpected path '+p);
};
test('only dedicated HTTPS production origins can be probed',()=>{
 assert.equal(validatedOrigin(base),base);
 for(const v of [
  'http://staarwardd-guardian-production.onrender.com',
  'https://staarwardd-guardian-preview.onrender.com',
  'https://cross-life-ai.emergent.host',
  'https://staarwardd-guardian-production.onrender.com/unsafe',
  'https://a:b@staarwardd-guardian-production.onrender.com',
  'not-a-url',
 ])assert.throws(()=>validatedOrigin(v),/production_origin_/);
});
test('live production gate verifies DB/Google/CORS/auth without claiming device or owner login',async()=>{
 const r=await verifyLiveProductionBackend(base,{request:respond});
 assert.equal(r.database,'connected');
 assert.equal(r.googleProviderConfigured,true);
 assert.equal(r.realOwnerGoogleReadbackCertified,false);
 assert.equal(r.archiveAndDeviceCertified,false);
});
test('offline backend, 401 Google config, permissive CORS, or anonymous access fail signed release gate',async()=>{
 const cases=[
  ['/api/health/ready',res(503,{detail:'database_unavailable'}),'production_mongo_readiness_failed'],
  ['/api/auth/providers',res(200,{nativeEnabled:false,providers:[]}), 'production_google_auth_not_configured'],
  ['/api/auth/me',res(200,{user_id:'unsafe'}),'production_anonymous_auth_boundary_failed'],
 ];
 for(const [p,replacement,err] of cases) {
  await assert.rejects(verifyLiveProductionBackend(base,{request:(u,options)=>u.endsWith(p)&&(!options?.method||options.method!=='OPTIONS')?replacement:respond(u,options)}),new RegExp(err));
 }
 await assert.rejects(verifyLiveProductionBackend(base,{request:(u,o)=>o?.method==='OPTIONS'?res(200,{}):respond(u,o)}),/production_cors_origin_not_rejected/);
});
