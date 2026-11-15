import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, BACKEND } from '../../hosting/guardian-worker.mjs';
const origin = 'https://hub.example.test';
const token = 'a'.repeat(64);
const cookie = `__Host-staar_web_session=${token}`;
test('web handoff stores a first-party HttpOnly session without exposing its token', async () => {
  const response = await handle(new Request(origin+'/api/auth/web/exchange', {method:'POST', headers:{Origin:origin}, body:JSON.stringify({code:'one-use',verifier:'held-in-browser'})}), {}, async (url, init) => {
    assert.equal(url, BACKEND+'/api/auth/web/exchange'); assert.equal(init.redirect,'manual');
    return Response.json({session_token:token,user:{user_id:'owner',is_demo:false}});
  });
  assert.equal(response.status,200); assert.match(response.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax; Max-Age=604800/);
  assert.deepEqual(await response.json(),{user:{user_id:'owner',is_demo:false}});
});
test('session survives independent page requests without browser token storage', async () => {
  for (let attempt=0;attempt<2;attempt++) {
    const response=await handle(new Request(origin+'/api/auth/me',{headers:{Cookie:cookie}}),{},async (url, init)=>{
      assert.equal(init.headers.get('Authorization'),`Bearer ${token}`);assert.equal(init.headers.has('Cookie'),false);return Response.json({user_id:'owner'});
    });
    assert.equal((await response.json()).user_id,'owner');
  }
});
test('foreign origins and anonymous private writes never reach the backend',async()=>{
  const forbidden=()=>{throw new Error('unauthorized transport');};
  assert.equal((await handle(new Request(origin+'/api/user/profile',{method:'POST',headers:{Origin:'https://evil.test',Cookie:cookie}}),{},forbidden)).status,403);
  assert.equal((await handle(new Request(origin+'/api/user/profile',{method:'POST',headers:{Origin:origin}}),{},forbidden)).status,401);
});
test('logout clears the local session even if the backend fails',async()=>{
 const response=await handle(new Request(origin+'/api/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:cookie}}),{},async()=>{throw new Error('offline');});
 assert.equal(response.status,502);assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
});
test('upstream redirects are not followed with account authority',async()=>{
 const response=await handle(new Request(origin+'/api/user/profile',{headers:{Cookie:cookie}}),{},async()=>new Response(null,{status:302,headers:{Location:'https://evil.test'}}));assert.equal(response.status,502);
});
test('static requests use the asset binding',async()=>assert.equal((await handle(new Request(origin+'/'),{ASSETS:{fetch:async()=>new Response('Hub')}})).status,200));
