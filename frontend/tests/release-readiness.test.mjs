import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProductionReadiness, RELEASE_REQUIREMENTS } from '../src/release-readiness.ts';
test('preview geometry and green CI cannot be misreported as production-ready',()=>{
 assert.equal(RELEASE_REQUIREMENTS.length,11);
 assert.deepEqual(evaluateProductionReadiness(null).blockers,RELEASE_REQUIREMENTS);
 assert.equal(evaluateProductionReadiness({startupFilmHashPassed:true,elevenVisualMasterHashesPassed:true}).ready,false);
 const all=Object.fromEntries(RELEASE_REQUIREMENTS.map(k=>[k,true]));
 assert.equal(evaluateProductionReadiness(all).ready,true);
 for(const field of RELEASE_REQUIREMENTS){
  const result=evaluateProductionReadiness({...all,[field]:false});
  assert.equal(result.ready,false);
  assert.deepEqual(result.blockers,[field]);
 }
});
