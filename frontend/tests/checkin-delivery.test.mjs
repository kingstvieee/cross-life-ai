import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canDeliverCheckin } from '../src/checkin-delivery.ts';
test('native check-ins report real notification availability, not merely a pending schedule',()=>{
  for(const authorization of [2,3,4])assert.equal(canDeliverCheckin({supported:true,scheduled:true,authorization}),true);
  for(const authorization of [0,1])assert.equal(canDeliverCheckin({supported:true,scheduled:true,authorization}),false);
  assert.equal(canDeliverCheckin({supported:true,scheduled:true,authorization:2,notificationsEnabled:false}),false);
  assert.equal(canDeliverCheckin({supported:true,scheduled:false,authorization:2}),false);
  assert.equal(canDeliverCheckin({supported:false,scheduled:true,authorization:2}),false);
});
test('native bridge passes permission status and UI does not misstate delivery',()=>{
 const swift=readFileSync(new URL('../modules/staar-watch/ios/StaarCheckinsModule.swift',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/checkins.tsx',import.meta.url),'utf8');
 assert.match(swift,/settings.authorizationStatus == \.authorized/);
 assert.match(swift,/notificationsEnabled/);
 assert.match(ui,/canDeliverCheckin\(status\)/);
 assert.match(ui,/Notification permission currently unavailable/);
});
