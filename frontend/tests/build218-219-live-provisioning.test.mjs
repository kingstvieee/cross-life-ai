import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');

test('Build 218 independent deployed control plane is deny-by-default and never turns on a claimed emergency kill switch',()=>{
  const edge=read('../backend/starcenttinel_deployment/index.ts');
  const sql=read('../backend/starcenttinel_deployment/read_only_status.sql');
  assert.match(edge,/verify_jwt|JWT validation remains ENABLED/);
  assert.match(edge,/ready_for_live_actions:false/);
  assert.match(edge,/reply\(423/);
  assert.match(edge,/X-StarCenttinel-Nonce/);
  assert.match(edge,/STARCENTTINEL_PROOF_KEY/);
  assert.match(edge,/crypto\.subtle\.sign/);
  assert.doesNotMatch(edge,/UPDATE\s+starcenttinel_private|DELETE\s+FROM\s+starcenttinel_private/i);
  assert.match(sql,/SECURITY INVOKER/);
  assert.match(sql,/FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/TO service_role/);
  assert.match(sql,/owner_webauthn_verified',false/);
  assert.match(sql,/provider_revocation_verified',false/);
});

test('Build 219 never claims upload inclusion rules equal actual EAS private archive proof',()=>{
 const script=read('../scripts/verify-production-package.mjs');
 assert.match(script,/STAAR_INSPECTED_EAS_ARCHIVE_DIR/);
 assert.match(script,/inspectPrivateEasArchive\(\{archiveRoot\}\)/);
 assert.match(script,/fail\('private-eas-inspected-archive'/);
 const inspector=read('../scripts/prepare-private-eas-archive.mjs');
 assert.match(inspector,/private_audio_absent_or_altered_in_eas_inspected_archive/);
 assert.match(inspector,/verifyStagedNativeSource\(frontendRoot,expected\)/);
});
