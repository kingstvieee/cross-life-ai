import { PREVIEW_WORLDS } from './portal-data';
import type { PortalId } from './types';

export type WorldId = PortalId | 'staarsonic' | 'staarverse';
export const WORLD_ACTIONS: Record<WorldId, { title: string; detail: string; choices: string[] }> = {
  creativity: { title: 'Make something worth sharing.', detail: 'Develop your ideas, projects and creative direction.', choices: ['Develop a creative brief', 'Plan a content series', 'Shape a new project'] },
  work: { title: 'Move the important work forward.', detail: 'Choose a priority, prepare a deliverable or organize your next move.', choices: ['Organize my priorities', 'Prepare a client proposal', 'Plan a focused work session'] },
  home: { title: 'Build a home that works for you.', detail: 'Start with your rooms, routines or the devices you want to connect.', choices: ['Set up my rooms and routines', 'Plan my connected home', 'Organize meals and household tasks'] },
  wellbeing: { title: 'Make room for your wellbeing.', detail: 'Plan rest, movement and sustainable daily rhythms.', choices: ['Plan movement and recovery', 'Build a better sleep routine', 'Prepare questions for an appointment'] },
  relationships: { title: 'Connect with intention.', detail: 'Prepare thoughtful conversations, time together and boundaries.', choices: ['Draft a message in my voice', 'Plan time with someone', 'Prepare a difficult conversation'] },
  events: { title: 'Find your people. Make a plan.', detail: 'Explore gatherings, prepare invitations and organize a shared occasion.', choices: ['Plan a gathering', 'Find community activities to research', 'Prepare an event checklist'] },
  style: { title: 'Your wardrobe. Your expression.', detail: 'Build looks around RISING STAARFORM and the labels you love. Add your pieces in the conversation to start styling.', choices: ['Style a RISING STAARFORM look', 'Build an outfit from my wardrobe', 'Compare brands for an occasion'] },
  staarsonic: { title: 'Find the sound of your world.', detail: 'Develop a playlist brief, explore a release idea or plan a listening session.', choices: ['Build a playlist brief', 'Plan a music release', 'Find music for my mood'] },
  staarverse: { title: 'Step into the next world.', detail: 'Explore the STARVERSE concept and shape your next adventure. Playable games are still in development.', choices: ['Explore the STARVERSE universe', 'Design a character and mission', 'Plan a cooperative game session'] },
};
export const WORLDS = PREVIEW_WORLDS.map(world => ({ ...world, ...WORLD_ACTIONS[world.id as WorldId] }));
export const WORLD_BY_ID = Object.fromEntries(WORLDS.map(world => [world.id, world]));
export function worldConversation(world: string, choice: string) {
  const entry = WORLD_BY_ID[world];
  if (!entry || !entry.choices.includes(choice)) return null;
  return { portal: world === 'staarsonic' || world === 'staarverse' ? undefined : world,
    draft: `${entry.name}: ${choice}. Start by asking what I want to set up, then offer concrete options. Distinguish suggestions from completed actions. Do not claim a device, shop, streaming service or game is connected unless verified.` };
}
