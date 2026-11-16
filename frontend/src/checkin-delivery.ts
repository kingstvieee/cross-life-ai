/** Pure native reminder delivery check. OS registration != user-authorized alerts. */
export type NativeCheckinDeliveryStatus={supported:boolean;scheduled?:boolean;authorization?:number;notificationsEnabled?:boolean};
export function canDeliverCheckin(status: NativeCheckinDeliveryStatus): boolean {
  return Boolean(status.supported && status.scheduled &&
    (status.notificationsEnabled === true ||
     (status.notificationsEnabled === undefined && [2,3,4].includes(status.authorization ?? -1))));
}
