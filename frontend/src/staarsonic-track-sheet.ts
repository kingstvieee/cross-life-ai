export const TRACK_LIMITS = {title: 100, bpm: 3, musicalKey: 40, notes: 950} as const;
export type TrackSheet = Record<keyof typeof TRACK_LIMITS, string>;
export const TRACK_FIELDS = ['title', 'bpm', 'musicalKey', 'notes'] as const;
export const EMPTY_TRACK_SHEET: TrackSheet = {title:'', bpm:'', musicalKey:'', notes:''};
type Storage = {get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void>};

export function normalizeTrackSheet(input: unknown): TrackSheet {
  const out = {...EMPTY_TRACK_SHEET};
  if (!input || typeof input !== 'object') return out;
  const values = input as Record<string, unknown>;
  for (const field of TRACK_FIELDS) {
    const value = values[field];
    if (typeof value === 'string') out[field] = value.trim().slice(0, field === 'bpm' ? 12 : TRACK_LIMITS[field]);
  }
  return out;
}

export function formatTrackSheet(sheet: TrackSheet) {
  const lines = [sheet.title];
  if (sheet.bpm) lines.push('BPM: ' + sheet.bpm);
  if (sheet.musicalKey) lines.push('Key: ' + sheet.musicalKey);
  if (sheet.notes) lines.push('', 'Session notes', sheet.notes);
  return lines.join('\n');
}

export function trackSheetStore(storage: Storage, owner: string) {
  if (!owner || owner.startsWith('demo_')) throw new Error('A real account is required.');
  const key = 'staar.sonic.track.' + Array.from(owner, c => c.codePointAt(0)!.toString(16)).join('.');
  return {
    async load(): Promise<TrackSheet> {
      const text = await storage.get(key);
      if (text === null) return {...EMPTY_TRACK_SHEET};
      const saved: unknown = JSON.parse(text);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved) || !normalizeTrackSheet(saved).title) {
        throw new Error('The saved track sheet is invalid.');
      }
      return normalizeTrackSheet(saved);
    },
    async save(input: unknown): Promise<TrackSheet> {
      const sheet = normalizeTrackSheet(input);
      if (!sheet.title) throw new Error('Name the track first.');
      if (sheet.bpm && (!/^\d{2,3}$/.test(sheet.bpm) || Number(sheet.bpm) < 20 || Number(sheet.bpm) > 300)) {
        throw new Error('Enter a BPM from 20 to 300, or leave it blank.');
      }
      const data = JSON.stringify(sheet);
      const bytes = Array.from(data).reduce((sum, c) => {
        const n = c.codePointAt(0)!;
        return sum + (n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4);
      }, 0);
      if (bytes > 1900) throw new Error('This track sheet is too large to save. Shorten the notes.');
      await storage.set(key, data);
      return sheet;
    },
  };
}
