import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cm=readFileSync(path.join(root,'codemagic.yaml'),'utf8');
const script=readFileSync(path.join(root,'frontend/scripts/build-ios-simulator.cjs'),'utf8');

test('Codemagic compile does not force iOS SDK onto native Apple Watch target',()=>{
  const start=cm.indexOf('staar-native-compile-116:');
  assert.ok(start>=0);
  const compileBlock=cm.slice(start);
  assert.match(compileBlock,/node scripts\/build-ios-simulator\.cjs/);
  assert.doesNotMatch(compileBlock,/\-sdk iphonesimulator(?!:)/);
  assert.doesNotMatch(compileBlock,/SWIFT_VERSION=5\.0/);
  assert.match(compileBlock,/CODE_SIGNING_ALLOWED=NO|scripts\/build-ios-simulator\.cjs/);
});
test('native compile helper chooses exact iPhone host scheme and lets Xcode select Watch SDK',()=>{
  assert.match(script,/item\.name\?\.replaceAll\('"', ''\) === 'STAARHub'/);
  assert.match(script,/generic\/platform=iOS Simulator/);
  assert.match(script,/CODE_SIGNING_ALLOWED=NO/);
  assert.doesNotMatch(script,/'-sdk',\s*'iphonesimulator'/);
  assert.doesNotMatch(script,/SWIFT_VERSION=5\.0/);
});
