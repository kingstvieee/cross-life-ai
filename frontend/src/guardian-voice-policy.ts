// Remote account policy is not a persistent preference on this device.
export function guardianQuietOnDevice(localQuiet: boolean, accountQuiet: boolean) {
  return localQuiet || accountQuiet;
}

export const GUEST_GUARDIAN_WELCOME = 'Welcome to STAAR Hub. Explore the ten worlds. Sign in when you are ready to enter.';

export function canStartGuardianVoice(state: {
  foreground: boolean;
  audioHydrated: boolean;
  master: boolean;
  voice: boolean;
  quiet: boolean;
  volume: number;
}) {
  return state.foreground && state.audioHydrated && state.master && state.voice
    && !state.quiet && state.volume > 0;
}
