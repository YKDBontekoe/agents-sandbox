import type { GameTime } from '../../types/gameTime';
import type { Citizen } from './citizen';
import type { CitizenMood } from './types';

export interface LifeEventTriggerContext {
  threatLevel: number;
  random?: () => number;
  eventChance?: number;
  cycleOverride?: number;
}

export interface TriggeredLifeEvent {
  cycle: number;
  type: string;
  description: string;
  impact: Partial<CitizenMood>;
}

export function maybeTriggerLifeEvent(
  citizen: Citizen,
  gameTime: GameTime,
  context: LifeEventTriggerContext
): TriggeredLifeEvent | null {
  const random = context.random ?? Math.random;
  const eventChance = context.eventChance ?? 0.02;

  if (random() >= eventChance) {
    return null;
  }

  const eventType = selectLifeEvent(citizen, context.threatLevel, random);
  const cycle = context.cycleOverride ?? Math.floor(gameTime.totalMinutes / 60);

  return triggerLifeEvent(citizen, eventType, cycle);
}

export function selectLifeEvent(
  citizen: Citizen,
  threatLevel: number,
  random: () => number = Math.random
): string {
  const events = ['promotion', 'illness', 'friendship', 'conflict', 'discovery'];

  if (threatLevel > 50) {
    return random() < 0.6 ? 'conflict' : 'illness';
  }

  if (citizen.mood.happiness > 70) {
    return random() < 0.5 ? 'promotion' : 'friendship';
  }

  return events[Math.floor(random() * events.length)];
}

export function triggerLifeEvent(
  citizen: Citizen,
  eventType: string,
  cycle: number
): TriggeredLifeEvent {
  let impact: Partial<CitizenMood> = {};
  let description = '';

  switch (eventType) {
    case 'promotion':
      impact = { happiness: 15, motivation: 10, stress: 5 };
      description = `${citizen.name} received a promotion at work!`;
      citizen.income += 5;
      break;

    case 'illness':
      impact = { happiness: -10, energy: -20, stress: 10 };
      description = `${citizen.name} fell ill and needs rest.`;
      break;

    case 'friendship':
      impact = { happiness: 8 };
      description = `${citizen.name} made a new friend.`;
      citizen.needs.social = clamp(citizen.needs.social + 15);
      break;

    case 'conflict':
      impact = { happiness: -12, stress: 15 };
      description = `${citizen.name} had a conflict with someone.`;
      citizen.needs.social = clamp(citizen.needs.social - 10);
      break;

    case 'discovery':
      impact = { happiness: 5, motivation: 8 };
      description = `${citizen.name} discovered something interesting.`;
      break;

    default:
      description = `${citizen.name} experienced an unexpected event.`;
      break;
  }

  applyMoodImpact(citizen, impact);

  const record: TriggeredLifeEvent = {
    cycle,
    type: eventType,
    description,
    impact
  };

  citizen.lifeEvents.push(record);
  return record;
}

function applyMoodImpact(citizen: Citizen, impact: Partial<CitizenMood>): void {
  for (const [key, value] of Object.entries(impact)) {
    const moodKey = key as keyof CitizenMood;
    const current = citizen.mood[moodKey] ?? 0;
    citizen.mood[moodKey] = clamp(current + (value ?? 0));
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
