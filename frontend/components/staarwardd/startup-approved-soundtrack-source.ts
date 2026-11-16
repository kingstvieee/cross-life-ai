import type { AudioSource } from "expo-audio";

/**
 * Public-repository fallback. This is not the approved music.
 * A privately staged, gitignored .native.ts variant overrides this module
 * only after the owner-approved AAC binary passes the exact SHA-256 check.
 * The signed-build preflight rejects any package missing the private variant.
 */
const approvedStartupSoundtrackSource: AudioSource | null = null;
export default approvedStartupSoundtrackSource;
