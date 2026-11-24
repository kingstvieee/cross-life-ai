export type HomeCredentials = { origin: string; token: string };
export type HomeEntity = { entity_id: string; state: string; name: string; unit?: string };
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
      unit: typeof item.attributes?.unit_of_measurement === 'string' ? item.attributes.unit_of_measurement : undefined }));
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
export type LightColour = { brightness?: number; rgb?: [number, number, number] };
export function validateLightColour(input: LightColour): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.brightness !== undefined) {
    if (!Number.isInteger(input.brightness) || input.brightness < 0 || input.brightness > 100) throw new Error('Brightness must be an integer from 0 to 100.');
    body.brightness_pct = input.brightness;
  }
  if (input.rgb !== undefined) {
    if (!Array.isArray(input.rgb) || input.rgb.length !== 3 || input.rgb.some(v => !Number.isInteger(v) || v < 0 || v > 255)) throw new Error('RGB values must be integers from 0 to 255.');
    body.rgb_color = input.rgb;
  }
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
