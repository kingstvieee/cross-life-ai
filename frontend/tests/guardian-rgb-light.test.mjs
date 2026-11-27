import test from 'node:test';
import assert from 'node:assert/strict';
import { lightCommandConfirmed, readHome, setHomeLightColour, validateLightColour } from '../src/home-assistant.ts';
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

test('native Home readback reports only supported and validated light attributes', async () => {
  const list = await readHome(credentials, undefined, async () => Response.json([
    { entity_id: 'light.study', state: 'on', attributes: { brightness: 128, rgb_color: [255, 0, 0], supported_color_modes: ['rgb'] } },
    { entity_id: 'light.hall', state: 'off', attributes: { brightness: 500, rgb_color: [0, null, 0], supported_color_modes: ['color_temp'] } },
    { entity_id: 'lock.front_door', state: 'locked', attributes: { brightness: 10, rgb_color: [0, 0, 0] } },
  ]));
  assert.deepEqual(list[0].light, { brightness: 50, rgb: [255, 0, 0], canDim: true, canSetColour: true });
  assert.deepEqual(list[1].light, { canDim: true, canSetColour: false });
  assert.equal(list[2].light, undefined);
});

test('confirmation describes matching device readback only, never stale, missing or unrelated state', () => {
  const item = { entity_id: 'light.study', state: 'on', name: 'Study', light: { brightness: 50, rgb: [255, 0, 0], canDim: true, canSetColour: true } };
  assert.equal(lightCommandConfirmed([item], 'light.study', { brightness: 50, rgb: [255, 0, 0] }), true);
  assert.equal(lightCommandConfirmed([item], 'light.study', { brightness: 75 }), false);
  assert.equal(lightCommandConfirmed([item], 'light.study', { rgb: [255, 1, 0] }), false);
  assert.equal(lightCommandConfirmed([item], 'light.other', true), false);
  assert.equal(lightCommandConfirmed([{ ...item, state: 'unavailable' }], 'light.study', true), false);
  assert.equal(lightCommandConfirmed([{ ...item, state: 'off' }], 'light.study', { brightness: 0 }), true);
  assert.equal(lightCommandConfirmed([{ ...item, light: undefined }], 'light.study', { brightness: 50 }), false);
  assert.equal(lightCommandConfirmed([item], 'light.study', {}), false);
  assert.throws(() => validateLightColour({ rgb: new Array(3) }), /RGB/);
  assert.throws(() => validateLightColour({ rgb: [255, 0, 0], brightness: 0 }), /positive brightness/);
});
