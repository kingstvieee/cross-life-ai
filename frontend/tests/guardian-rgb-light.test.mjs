import test from 'node:test';
import assert from 'node:assert/strict';
import { setHomeLightColour, validateLightColour } from '../src/home-assistant.ts';
const credentials = { origin: 'https://home.example', token: 'test-only-token' };
test('RGB and brightness input is validated', () => {
  assert.deepEqual(validateLightColour({ brightness: 30, rgb: [255, 200, 0] }), { brightness_pct: 30, rgb_color: [255, 200, 0] });
  for (const input of [{brightness: 101}, {brightness: -1}, {rgb: [300, 0, 0]}, {rgb: [1, 2]}, {}]) {
    assert.throws(() => validateLightColour(input), /Brightness|RGB|Provide/);
  }
});
test('colour action uses verified light service and actual state readback', async () => {
  const calls = [];
  const result = await setHomeLightColour(credentials, 'light.study', { brightness: 30, rgb: [255, 200, 0] }, undefined, async (url, options) => {
    calls.push(url);
    if (options.method === 'POST') {
      assert.deepEqual(JSON.parse(options.body), { entity_id: 'light.study', brightness_pct: 30, rgb_color: [255, 200, 0] });
      return Response.json([]);
    }
    return Response.json([{ entity_id: 'light.study', state: 'off' }]);
  });
  assert.equal(result[0].state, 'off');
  assert.deepEqual(calls, ['https://home.example/api/services/light/turn_on', 'https://home.example/api/states']);
});
test('lock and malformed entity IDs never issue a request', async () => {
  for (const entity of ['lock.front_door', 'light.study/../lock', 'switch.office']) {
    await assert.rejects(setHomeLightColour(credentials, entity, {brightness: 50}, undefined, async () => { throw new Error('Network must not be used'); }), /Only a verified light/);
  }
});
