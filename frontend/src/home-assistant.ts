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
