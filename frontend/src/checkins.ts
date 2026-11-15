import { requireOptionalNativeModule } from 'expo-modules-core';
export type CheckinStatus = { supported: boolean; authorization?: number; scheduled?: number };
const native = requireOptionalNativeModule<{ checkinStatus(): Promise<CheckinStatus>; cancelCheckins(): Promise<void>; scheduleCheckin(hour: number, minute: number): Promise<void> }>('StaarWatch');
export async function checkinStatus(): Promise<CheckinStatus> { return native ? native.checkinStatus() : { supported: false }; }
export async function cancelCheckins() { if (native) await native.cancelCheckins(); }
export async function scheduleCheckin(hour: number, minute: number) {
  if (!native) throw new Error('Check-ins require the updated iPhone app.');
  await native.scheduleCheckin(hour, minute);
}
