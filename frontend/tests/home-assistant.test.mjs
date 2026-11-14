import test from 'node:test';
import assert from 'node:assert/strict';
import { homeOrigin, readHome, setHomeLight } from '../src/home-assistant.ts';
const credentials = { origin: 'https://home.example', token: 'test-only-token' };
test('home connection rejects insecure URLs and embedded credentials', () => {
  for (const url of ['http://home.example', 'https://user:password@home.example', 'https://home.example/path', 'https://home.example?token=secret', 'file:///etc/passwd']) assert.throws(() => homeOrigin(url));
  assert.equal(homeOrigin(' https://home.example/ '), credentials.origin);
});
test('device readback uses the chosen origin, bearer header and cancellation signal', async () => {
  const signal = new AbortController().signal;
  const result = await readHome(credentials, signal, async (url, options) => {
    assert.equal(url, 'https://home.example/api/states'); assert.equal(options.headers.Authorization, 'Bearer test-only-token');
    assert.equal(options.redirect, 'error'); assert.equal(options.signal, signal);
    return Response.json([{ entity_id: 'light.study', state: 'off', attributes: { friendly_name: 'Study light' } }, { entity_id: 'person.private', state: 'home' }, { entity_id: 'sensor.temp', state: '21', attributes: { unit_of_measurement: '°C' } }]);
  });
  assert.equal(result.length, 2); assert.equal(result[0].name, 'Study light'); assert.equal(result[1].unit, '°C');
});
test('light action is followed by real readback, without assuming requested state', async () => {
  const calls = [];
  const result = await setHomeLight(credentials, 'light.study', true, undefined, async (url, options) => {
    calls.push(url);
    if (options.method === 'POST') { assert.equal(options.body, '{"entity_id":"light.study"}'); return Response.json([]); }
    return Response.json([{ entity_id: 'light.study', state: 'off' }]);
  });
  assert.deepEqual(calls, ['https://home.example/api/services/light/turn_on', 'https://home.example/api/states']);
  assert.equal(result[0].state, 'off');
});
test('security devices and arbitrary service paths cannot be actuated', async () => {
  for (const entity of ['lock.front_door', 'switch.security', 'climate.house', 'light.study/../../lock']) {
    await assert.rejects(setHomeLight(credentials, entity, true, undefined, async () => { assert.fail('No request should be sent'); }), /Only a verified light/);
  }
});
test('failed authentication and failed readback never become a verified connection', async () => {
  await assert.rejects(readHome(credentials, undefined, async () => new Response('', { status: 401 })), /rejected this token/);
  let count = 0;
  await assert.rejects(setHomeLight(credentials, 'light.study', false, undefined, async () => ++count === 1 ? Response.json([]) : new Response('', { status: 503 })), /could not return device states/);
  await assert.rejects(readHome(credentials, undefined, async () => Response.json({ connected: true })), /invalid device list/);
});
