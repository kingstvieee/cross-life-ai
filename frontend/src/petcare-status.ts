export const PETCARE_DEVICES = ['camera', 'feeder', 'climate', 'audio'] as const;
type Device = typeof PETCARE_DEVICES[number];
type DeviceStatus = 'live' | 'stale' | 'unavailable';

export function readPetcareDevices(payload: unknown): Partial<Record<Device, DeviceStatus>> {
  if (!record(payload) || !record(payload.devices)) throw new Error('Invalid pet care dashboard');
  const states = payload.devices;
  const result: Partial<Record<Device, DeviceStatus>> = {};
  for (const name of PETCARE_DEVICES) {
    const state = states[name];
    result[name] = state === 'live' || state === 'stale' ? state : 'unavailable';
  }
  return result;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function recordPetcareEmergency(
  send: () => Promise<Pick<Response, 'ok' | 'json'>>,
): Promise<'recorded' | 'unconfirmed'> {
  try {
    const response = await send();
    if (!response.ok) return 'unconfirmed';
    const receipt: unknown = await response.json();
    return record(receipt) && receipt.kind === 'emergency_requested' &&
      typeof receipt.event_id === 'string' && /^[0-9a-f]{32}$/.test(receipt.event_id) &&
      record(receipt.data) && receipt.data.delivery === 'not_configured' ? 'recorded' : 'unconfirmed';
  } catch {
    return 'unconfirmed';
  }
}
