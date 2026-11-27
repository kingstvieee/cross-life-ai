export const CAMPAIGN_FIELDS = ['title','audience','deliverable','script'] as const;
export type Campaign = Record<(typeof CAMPAIGN_FIELDS)[number], string> & {stage: 'planning' | 'production' | 'review' | 'ready'};
export const CAMPAIGN_STAGES = ['planning','production','review','ready'] as const;
export const EMPTY_CAMPAIGN: Campaign = {title: '', audience: '', deliverable: '', script: '', stage: 'planning'};
export const CAMPAIGN_LIMITS = {title: 100, audience: 140, deliverable: 160, script: 800};

export function normalizeCampaign(value: unknown): Campaign {
  if (!value || typeof value !== 'object') return {...EMPTY_CAMPAIGN};
  const raw = value as Record<string, unknown>;
  const clean = {...EMPTY_CAMPAIGN};
  for (const field of CAMPAIGN_FIELDS) {
    const text = raw[field];
    clean[field] = typeof text === 'string' ? text.trim().slice(0,CAMPAIGN_LIMITS[field]) : '';
  }
  if (CAMPAIGN_STAGES.some(stage => stage === raw.stage)) clean.stage = raw.stage as Campaign['stage'];
  return clean;
}

export function campaignExport(value: Campaign) {
  const campaign = normalizeCampaign(value);
  if (!campaign.title) return null;
  const lines = [campaign.title, 'Stage: ' + campaign.stage];
  if (campaign.audience) lines.push('Audience: ' + campaign.audience);
  if (campaign.deliverable) lines.push('Deliverable: ' + campaign.deliverable);
  if (campaign.script) lines.push('', 'Script', campaign.script);
  return lines.join('\n');
}
