import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enabledLoginProviders, LOGIN_PROVIDER_IDS } from '../src/login-provider-availability.ts';
test('only verified supported providers can be offered for sign in',()=>{
 const payload={nativeEnabled:true,providers:[{id:'google',enabled:true},{id:'apple',enabled:false},{id:'rogue',enabled:true},{id:'email',enabled:true},{id:'google',enabled:true}]};
 assert.deepEqual(enabledLoginProviders(payload,true),['google','email']);
 assert.deepEqual(enabledLoginProviders(payload,false),['google','email']);
 assert.deepEqual(enabledLoginProviders({...payload,nativeEnabled:false},true),[]);
 assert.deepEqual(enabledLoginProviders({...payload,nativeEnabled:false},false),['google','email']);
 assert.deepEqual(enabledLoginProviders({providers:'invalid',nativeEnabled:true},true),[]);
 assert.deepEqual(enabledLoginProviders(null,true),[]);
 assert.equal(LOGIN_PROVIDER_IDS.length,5);
});
test('sign-in UI is explicit about disabled options; does not represent them as available',()=>{
 const ui=readFileSync(new URL('../components/staarwardd/access-boundary.tsx',import.meta.url),'utf8');
 assert.match(ui,/enabledLoginProviders\(data, Platform\.OS !== 'web'\)/);
 assert.match(ui,/disabled=\{!ready \|\| Boolean\(busy\)\}/);
 assert.match(ui,/CHECKING' : 'UNAVAILABLE'/);
});

test('native login cannot open an arbitrary unknown OAuth provider', () => {
 const src=readFileSync(new URL('../src/native-login.ts',import.meta.url),'utf8');
 assert.match(src,/LOGIN_PROVIDER_IDS\.includes\(provider as LoginProviderId\)/);
 assert.match(src,/Unsupported sign-in provider/);
 assert.match(src,/const start = backendUrl/);
 assert.ok(src.indexOf('Unsupported sign-in provider') < src.indexOf('const start = backendUrl'));
});
