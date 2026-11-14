import { requireOptionalNativeModule } from 'expo-modules-core';
export type WatchStatus = { supported: boolean; activated?: boolean; paired?: boolean; installed?: boolean; reachable?: boolean; sharing?: boolean; verifiedAt?: number };
const bridge = requireOptionalNativeModule<{ status: () => Promise<WatchStatus>; share: (enabled: boolean, companion: string) => Promise<void> }>('StaarWatch');
export const watchStatus = async (): Promise<WatchStatus> => bridge ? bridge.status() : { supported: false };
export async function shareWithWatch(enabled: boolean, companion: string) { if (bridge) await bridge.share(enabled, companion); }
