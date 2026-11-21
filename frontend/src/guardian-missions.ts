type MissionApi = (path: string, init?: RequestInit) => Promise<Response>;

export type MissionAction = 'withdraw' | 'cancel-pending' | 'queue-preview' | 'acknowledge-preview';
export type Mission = {
  mission_id: string;
  objective: string;
  success_criteria: string;
  status: string;
  created_at?: string;
  expires_at?: string | null;
  not_before?: string;
  preview_digest?: string;
  preview_acknowledged_at?: string;
  available_actions?: MissionAction[];
  evidence?: { passed?: boolean; verified_at?: string; result_digest?: string };
};

type ProposalDraft = { objective: string; criteria: string; deadline: string };
type MissionPage = { missions: Mission[]; next_cursor: string | null };
type MissionSummary = { counts: Record<string, number>; total: number };
const BASE = '/api/guardian/missions';

export function optionalMissionTime(value: string) {
  const input = value.trim();
  if (!input) return undefined;
  const match = /^([0-9]{4}-[0-9]{2}-[0-9]{2})T[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.exec(input);
  const timestamp = new Date(input);
  if (!match || !Number.isFinite(timestamp.getTime())) {
    throw new Error('Enter a date and time with a timezone, such as 2026-12-01T14:00:00-05:00.');
  }
  const calendarDate = new Date(match[1] + 'T00:00:00Z');
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== match[1]) {
    throw new Error('Enter a valid calendar date.');
  }
  return timestamp.toISOString();
}

export function missionProposal(draft: ProposalDraft, key: string) {
  const objective = draft.objective.trim();
  const success_criteria = draft.criteria.trim();
  if (!objective || !success_criteria) throw new Error('Enter an objective and success criteria.');
  if (objective.length > 2000 || success_criteria.length > 2000) {
    throw new Error('Keep the objective and success criteria within 2,000 characters each.');
  }
  return { objective, success_criteria, idempotency_key: key, budget_cad: 0,
    expires_at: optionalMissionTime(draft.deadline) };
}

export function mergeMissionPages(previous: Mission[], page: Mission[]) {
  const missions = new Map(previous.map(item => [item.mission_id, item]));
  for (const item of page) missions.set(item.mission_id, item);
  return Array.from(missions.values());
}

export function guardianMissionClient(api: MissionApi) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await api(path, init);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (response.status === 401) throw new Error('Sign in again to open your Guardian missions.');
      if (response.status === 409) throw new Error('The mission state or deadline changed. Refresh and review it.');
      if (response.status === 404 && body?.detail === 'mission_preview_disabled') {
        throw new Error('Preview execution is disabled in this environment.');
      }
      if (response.status === 404) throw new Error('This mission or history page is no longer available.');
      throw new Error(`Guardian could not complete the request (${response.status}).`);
    }
    return response.json() as Promise<T>;
  }

  const missionPath = (id: string) => `${BASE}/${encodeURIComponent(id)}`;
  return {
    list(status: string, after?: string, signal?: AbortSignal) {
      const params = new URLSearchParams({ limit: '15' });
      if (status) params.set('status', status);
      if (after) params.set('after', after);
      return request<MissionPage>(`${BASE}?${params}`, { signal });
    },
    summary(signal?: AbortSignal) {
      return request<MissionSummary>(`${BASE}/summary`, { signal });
    },
    detail(id: string, signal?: AbortSignal) {
      return request<Mission>(missionPath(id), { signal });
    },
    propose(draft: ProposalDraft, key: string, signal?: AbortSignal) {
      return request<{mission_id: string}>(BASE, {
        method: 'POST', body: JSON.stringify(missionProposal(draft, key)), signal,
      });
    },
    action(mission: Mission, action: MissionAction, schedule = '', signal?: AbortSignal) {
      if (!mission.available_actions?.includes(action)) {
        throw new Error('This action is no longer available. Refresh the mission.');
      }
      let body: string | undefined;
      if (action === 'queue-preview') {
        if (!mission.preview_digest) throw new Error('Refresh the proposal before scheduling the preview.');
        body = JSON.stringify({ proposal_digest: mission.preview_digest, run_at: optionalMissionTime(schedule) });
      }
      return request<unknown>(`${missionPath(mission.mission_id)}/${action}`, { method: 'POST', body, signal });
    },
  };
}
