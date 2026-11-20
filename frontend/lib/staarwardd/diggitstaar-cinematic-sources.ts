/** Exact approved cinematic masters; verify hashes with stage_diggitstaar_cinematic.py --check. */
export const DIGGITSTAAR_MEDIA_WIDE: number | null = require('@/assets/videos/diggitstaar-workstation-wide.mp4');
export const DIGGITSTAAR_MEDIA_PORTRAIT: number | null = require('@/assets/videos/diggitstaar-workstation-portrait.mp4');
export const DIGGITSTAAR_MEDIA_READY = DIGGITSTAAR_MEDIA_WIDE !== null && DIGGITSTAAR_MEDIA_PORTRAIT !== null;
