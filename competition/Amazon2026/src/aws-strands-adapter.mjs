import { Agent, BedrockModel, tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { buildGuardianPlan } from './guardian-core.mjs';

const guardianPlanTool = tool({
  name: 'guardian_plan',
  description: 'Build a permission-aware STAARWAARDD cross-portal plan from one user request.',
  inputSchema: z.object({ request: z.string().min(1) }),
  callback: ({ request }) => JSON.stringify(buildGuardianPlan(request, { source: 'AWS Strands / Bedrock' }))
});

export function createGuardianAgent() {
  const model = new BedrockModel({ maxTokens: 1200 });
  return new Agent({
    id: 'staarwardd-guardian',
    model,
    tools: [guardianPlanTool],
    printer: false,
    systemPrompt: [
      'You are Guardian, the STAARWAARDD whole-life orchestration agent.',
      'Coordinate only the portals relevant to the request.',
      'Never claim an external action occurred unless a tool confirms it.',
      'Any message, booking, purchase, publication, security/device change, or irreversible action must remain behind explicit approval.',
      'Prefer concise judge-visible reasoning and measurable outcomes.'
    ].join(' ')
  });
}

export async function runGuardianOnBedrock(request) {
  const agent = createGuardianAgent();
  const result = await agent.invoke(String(request));
  return result.lastMessage;
}
