import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page=readFileSync(new URL('../app/checkins.tsx',import.meta.url),'utf8');
const guardian=readFileSync(new URL('../app/guardian-tools.tsx',import.meta.url),'utf8');
const native=readFileSync(new URL('../modules/staar-watch/ios/StaarCheckinsModule.swift',import.meta.url),'utf8');
test('daily reminders fail closed when account or backend consent is unavailable',()=>{
 assert.match(page,/api\('\/api\/guardian\/life-map\/overview'\)/);
 assert.match(page,/const privateMode = state\.privateMode === true/);
 assert.match(page,/state\.consent\?\.checkIns === true && !privateMode/);
 assert.match(page,/if \(serverPrivateMode\) throw new Error/);
 assert.match(page,/!serverConsentReady \|\| serverPrivateMode/);
 assert.match(page,/bindCheckinAccount\(allowed \? account : ''\)/);
 assert.match(page,/await bindCheckinAccount\(''\)/);
 assert.match(page,/if \(!serverConsentReady\) throw new Error/);
 assert.match(page,/busy \|\| !status\.supported \|\| !account \|\| !serverConsentReady/);
});
test('tap to enable requires server write prior to native scheduling',()=>{
 const index=page.indexOf("const response = await api('/api/guardian/core/workflows/rsf-fabric-sourcing/proactive-consent'");
 const scheduling=page.indexOf('const next = await scheduleCheckin(account');
 assert.ok(index>=0 && scheduling>index);
 assert.match(page,/if \(!response\.ok\) throw new Error\('Guardian could not enable check-in consent/);
 assert.match(page,/greetings: serverGreetingConsent, check_ins: true/);
});
test('switching off check-in permission and entering private mode cancel local scheduling',()=>{
 assert.match(guardian,/if\(!value\)await bindCheckinAccount\(''\);await checked\(CORE\+'\/proactive-consent'/);
 assert.match(guardian,/if\(value\)await bindCheckinAccount\(''\);await checked\('\/api\/guardian\/core\/private-mode'/);
 assert.match(native,/if next\.isEmpty \|\| UserDefaults\.standard\.string/);
 assert.match(native,/clear\(\)/);
});

test('out-of-order consent responses cannot override a new account or foreground verification',()=>{
 assert.match(page,/verificationEpoch = useRef\(0\)/);
 assert.match(page,/const epoch = \+\+verificationEpoch\.current/);
 assert.match(page,/if \(epoch !== verificationEpoch\.current\) return/);
 assert.match(page,/verificationEpoch\.current \+= 1; sub\.remove\(\)/);
});
