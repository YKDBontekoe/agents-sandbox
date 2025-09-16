import type { Citizen } from './citizen';

export interface MoodUpdateContext {
  threatLevel: number;
  cityEvents: string[];
}

export function updateNeeds(citizen: Citizen): void {
  const decayRate = 1 - citizen.personality.contentment * 0.3;

  citizen.needs.food = clamp(citizen.needs.food - 2 * decayRate);
  citizen.needs.shelter = clamp(citizen.needs.shelter - 0.5 * decayRate);
  citizen.needs.social = clamp(citizen.needs.social - 1.5 * decayRate);
  citizen.needs.purpose = clamp(citizen.needs.purpose - 1 * decayRate);
  // Safety decay continues to be governed externally
}

export function updateMood(citizen: Citizen, context: MoodUpdateContext): void {
  const needsSatisfaction =
    (citizen.needs.food +
      citizen.needs.shelter +
      citizen.needs.social +
      citizen.needs.purpose +
      citizen.needs.safety) /
    5;

  const targetHappiness = needsSatisfaction * (0.7 + citizen.personality.contentment * 0.3);
  citizen.mood.happiness = lerp(citizen.mood.happiness, targetHappiness, 0.1);

  const needsStress = Math.max(0, 100 - needsSatisfaction);
  const threatStress = context.threatLevel * (1 - citizen.personality.contentment);
  const targetStress = Math.min(100, needsStress * 0.5 + threatStress * 0.3);
  citizen.mood.stress = lerp(citizen.mood.stress, targetStress, 0.15);

  const workLoad = citizen.jobTitle !== 'Unemployed' ? 20 : 0;
  const targetEnergy = Math.max(20, 100 - citizen.mood.stress * 0.3 - workLoad);
  citizen.mood.energy = lerp(citizen.mood.energy, targetEnergy, 0.2);

  const targetMotivation = citizen.needs.purpose * 0.6 + citizen.personality.ambition * 40;
  citizen.mood.motivation = lerp(citizen.mood.motivation, targetMotivation, 0.1);
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
