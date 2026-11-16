import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ios=readFileSync(new URL('../modules/staar-watch/ios/StaarWatchModule.swift',import.meta.url),'utf8');
test('a paired Watch is not automatically a verified recent handshake',()=>{
 assert.match(ios,/let lastVerified = queue\.sync \{ verifiedAt \}/);
 assert.match(ios,/lastVerified > 0/);
 assert.match(ios,/Date\(\)\.timeIntervalSince1970 - lastVerified <= 600/);
 assert.match(ios,/s\.activationState == \.activated && s\.isPaired && s\.isWatchAppInstalled/);
 assert.match(ios,/"verified": recentlyVerified/);
});
test('unknown Watch messages cannot forge successful verification',()=>{
 assert.match(ios,/message\["action"\] as\? String == "verify"/);
 assert.match(ios,/replyHandler\(\["version": 1, "error": "unsupported_message"\]\)/);
});
