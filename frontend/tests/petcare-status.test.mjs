import test from 'node:test';
import assert from 'node:assert/strict';
import { readPetcareDevices, recordPetcareEmergency } from '../src/petcare-status.ts';

test('pet care reads an allowlist of telemetry states, never server-supplied safety claims', () => {
  assert.deepEqual(readPetcareDevices({ safety: 'safe', devices: {
    camera: 'live', feeder: 'armed', climate: 'stale', unrelated: 'live',
  }}), { camera: 'live', feeder: 'unavailable', climate: 'stale', audio: 'unavailable' });
  for (const payload of [null, {}, { devices: [] }, { devices: 'live' }]) {
    assert.throws(() => readPetcareDevices(payload));
  }
});

test('pet emergency is recorded only with the exact receipt and never implies delivery', async () => {
  const receipt = { event_id: 'f'.repeat(32), kind: 'emergency_requested', data: { delivery: 'not_configured' } };
  assert.equal(await recordPetcareEmergency(async () => Response.json(receipt)), 'recorded');
  for (const respond of [
    () => Response.json(receipt, { status: 503 }),
    () => new Response('OK'),
    () => Response.json({ ...receipt, event_id: undefined }),
    () => Response.json({ ...receipt, data: { delivery: 'sent' } }),
    () => { throw new Error('offline'); },
  ]) {
    assert.equal(await recordPetcareEmergency(async () => respond()), 'unconfirmed');
  }
});
