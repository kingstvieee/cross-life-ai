import { requireOptionalNativeModule } from 'expo-modules-core';

export type CheckinStatus = { supported: boolean; authorization?: number; scheduled?: boolean; hour?: number; minute?: number; timezone?: string; nextAt?: number; notificationsEnabled?: boolean };
const bridge = requireOptionalNativeModule<{
  bindAccount: (account: string) => Promise<void>;
  status: () => Promise<CheckinStatus>;
  schedule: (account: string, hour: number, minute: number) => Promise<CheckinStatus>;
  cancel: () => Promise<void>;
}>('StaarCheckins');

export async function bindCheckinAccount(account: string) { await bridge?.bindAccount(account); }
export async function cancelCheckins() { await bridge?.cancel(); }
export async function checkinStatus(): Promise<CheckinStatus> { return bridge ? bridge.status() : { supported: false }; }
export async function scheduleCheckin(account: string, hour: number, minute: number): Promise<CheckinStatus> {
  if (!bridge) throw new Error('Daily check-ins require an updated iPhone or iPad build.');
  if (!account || !Number.isInteger(hour) || hour < 12 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('Choose a time from noon onward.');
  return bridge.schedule(account, hour, minute);
}

/** Build 147: scheduled is not proof iOS currently permits delivery.
 * 2=authorized, 3=provisional, 4=ephemeral in UNAuthorizationStatus.
 */
export function canDeliverCheckin(status: CheckinStatus): boolean {
  return Boolean(status.supported && status.scheduled &&
    (status.notificationsEnabled === true ||
     (status.notificationsEnabled === undefined && [2,3,4].includes(status.authorization ?? -1))));
}
