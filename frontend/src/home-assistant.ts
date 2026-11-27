export type HomeCredentials = { origin: string; token: string };
export type LightColour = { brightness?: number; rgb?: [number, number, number] };
type LightReadback = LightColour & { canDim: boolean; canSetColour: boolean };
export type HomeEntity = { entity_id: string; state: string; name: string; unit?: string; light?: LightReadback };
const rgbModes = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];
function isRgb(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 &&
    [value[0], value[1], value[2]].every(v => Number.isInteger(v) && v >= 0 && v <= 255);
}
function lightReadback(attributes: unknown): LightReadback | undefined {
  if (!attributes || typeof attributes !== 'object') return undefined;
  const { brightness, rgb_color, supported_color_modes } = attributes as Record<string, unknown>;
  const pct = typeof brightness === 'number' && Number.isInteger(brightness) && brightness >= 0 && brightness <= 255
    ? Math.round(brightness * 100 / 255) : undefined;
  const modes = Array.isArray(supported_color_modes) ? supported_color_modes : [];
  return {
    canDim: pct !== undefined || modes.some(mode => rgbModes.includes(mode) || ['brightness', 'color_temp', 'white'].includes(mode)),
    canSetColour: isRgb(rgb_color) || modes.some(mode => rgbModes.includes(mode)),
    ...(pct === undefined ? {} : { brightness: pct }),
    ...(isRgb(rgb_color) ? { rgb: rgb_color } : {}),
  };
}

export function lightCommandConfirmed(list: HomeEntity[], target: string, expected: boolean | LightColour): boolean {
  const item = list.find(entity => entity.entity_id === target);
  if (!item) return false;
  if (typeof expected === 'boolean') return item.state === (expected ? 'on' : 'off');
  if (expected.brightness === undefined && expected.rgb === undefined) return false;
  if (expected.brightness === 0 && expected.rgb === undefined) return item.state === 'off';
  return item.state === 'on' &&
    (expected.brightness === undefined || item.light?.brightness === expected.brightness) &&
    (expected.rgb === undefined || expected.rgb.every((v, i) => v === item.light?.rgb?.[i]));
}
export function homeOrigin(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new Error('Use your trusted Home Assistant HTTPS origin, without a path, password or query.');
  }
  return url.origin;
}
export async function readHome(credentials: HomeCredentials, signal?: AbortSignal, transport: typeof fetch = fetch): Promise<HomeEntity[]> {
  const origin = homeOrigin(credentials.origin);
  const response = await transport(origin + '/api/states', {
    signal, redirect: 'error', headers: { Authorization: 'Bearer ' + credentials.token, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'Home Assistant rejected this token. Reconnect with a valid token.' : 'Home Assistant could not return device states.');
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Home Assistant returned an invalid device list.');
  return data.filter((item: any) => typeof item?.entity_id === 'string' && typeof item.state === 'string'
    && /^(light|switch|sensor|binary_sensor|climate|cover|lock|media_player)\.[a-z0-9_]+$/.test(item.entity_id))
    .map((item: any) => ({ entity_id: item.entity_id, state: item.state,
      name: typeof item.attributes?.friendly_name === 'string' ? item.attributes.friendly_name : item.entity_id,
      unit: typeof item.attributes?.unit_of_measurement === 'string' ? item.attributes.unit_of_measurement : undefined,
      ...(item.entity_id.startsWith('light.') ? { light: lightReadback(item.attributes) } : {}) }));
}
// Only explicit light actions are supported. Locks, security, switches and
// climate remain read-only; they cannot be controlled through arbitrary text.
export async function setHomeLight(credentials: HomeCredentials, entity: string, on: boolean, signal?: AbortSignal, transport: typeof fetch = fetch) {
  if (!/^light\.[a-z0-9_]+$/.test(entity)) throw new Error('Only a verified light can be controlled here.');
  const origin = homeOrigin(credentials.origin);
  const response = await transport(origin + '/api/services/light/' + (on ? 'turn_on' : 'turn_off'), {
    method: 'POST', signal, redirect: 'error', headers: { Authorization: 'Bearer ' + credentials.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entity }),
  });
  if (!response.ok) throw new Error('The light command was rejected. Refresh device states before trying again.');
  // A successful command response is not device readback.
  return readHome(credentials, signal, transport);
}

// Guardian colour control is deliberately restricted to light entities.
// The integration never issues commands to locks or security systems.
export function validateLightColour(input: LightColour): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.brightness !== undefined) {
    if (!Number.isInteger(input.brightness) || input.brightness < 0 || input.brightness > 100) throw new Error('Brightness must be an integer from 0 to 100.');
    body.brightness_pct = input.brightness;
  }
  if (input.rgb !== undefined) {
    if (!isRgb(input.rgb)) throw new Error('RGB values must be integers from 0 to 255.');
    body.rgb_color = input.rgb;
  }
  if (input.brightness === 0 && input.rgb !== undefined) throw new Error('Set a positive brightness to apply an RGB colour.');
  if (!Object.keys(body).length) throw new Error('Provide brightness or RGB colour.');
  return body;
}
export async function setHomeLightColour(credentials: HomeCredentials, entity: string, colour: LightColour, signal?: AbortSignal, transport: typeof fetch = fetch) {
  if (!/^light\.[a-z0-9_]+$/.test(entity)) throw new Error('Only a verified light can be controlled here.');
  const origin = homeOrigin(credentials.origin);
  const response = await transport(origin + '/api/services/light/turn_on', {
    method: 'POST', signal, redirect: 'error',
    headers: { Authorization: 'Bearer ' + credentials.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entity, ...validateLightColour(colour) }),
  });
  if (!response.ok) throw new Error('Colour command failed; device state is not verified.');
  return readHome(credentials, signal, transport);
}
