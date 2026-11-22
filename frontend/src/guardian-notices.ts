type NoticeApi = (path: string, init?: RequestInit) => Promise<Response>;
const BASE = '/api/guardian/notices';

export type GuardianNotice = {
  notice_id: string;
  kind: 'result_ready' | 'needs_review';
  label: string;
  created_at: string;
  read_at: string | null;
};

export class NoticeRequestError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, detail?: string) {
    super(status === 401 ? 'Sign in again to see Guardian notices.' :
      detail === 'notice_mission_unavailable' ? 'The mission for this notice is unavailable.' :
        'Guardian notices are temporarily unavailable.');
    this.status = status;
    this.detail = detail;
  }
}

export function mergeNoticePages(current: GuardianNotice[], next: GuardianNotice[]) {
  const merged = new Map(current.map(notice => [notice.notice_id, notice]));
  for (const notice of next) merged.set(notice.notice_id, notice);
  return [...merged.values()];
}

export function applyNoticeRead(rows: GuardianNotice[], id: string, readAt: string, unreadOnly: boolean) {
  return unreadOnly ? rows.filter(notice => notice.notice_id !== id) :
    rows.map(notice => notice.notice_id === id ? { ...notice, read_at: readAt } : notice);
}

export function guardianNoticeClient(api: NoticeApi) {
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await api(path, init);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new NoticeRequestError(response.status, body?.detail);
    }
    return response.json() as Promise<T>;
  }

  return {
    list(unread: boolean, after?: string, signal?: AbortSignal) {
      const params = new URLSearchParams({ limit: '25' });
      if (unread) params.set('unread', 'true');
      if (after) params.set('after', after);
      return request<{ notices: GuardianNotice[]; next_cursor: string | null }>(`${BASE}?${params}`, { signal });
    },
    summary(signal?: AbortSignal) {
      return request<{ unread: number }>(`${BASE}/summary`, { signal });
    },
    read(id: string, signal?: AbortSignal) {
      return request<{ notice_id: string; read_at: string }>(`${BASE}/${encodeURIComponent(id)}/read`,
        { method: 'POST', signal });
    },
    mission(id: string, signal?: AbortSignal) {
      return request<{ mission_id: string }>(`${BASE}/${encodeURIComponent(id)}/mission`, { signal });
    },
  };
}
