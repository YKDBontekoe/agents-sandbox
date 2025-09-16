import type { Citizen } from './citizen';
import type { PersonalityTraits } from './types';

export interface SocialInteractionContext {
  availableTargets: string[];
  getCitizenById: (id: string) => Citizen | undefined;
  random?: () => number;
  timestamp?: number;
}

export function triggerSocialInteraction(
  citizen: Citizen,
  context: SocialInteractionContext
): void {
  const targets = context.availableTargets;
  if (!targets.length) {
    return;
  }

  const random = context.random ?? Math.random;
  const timestamp = context.timestamp ?? Date.now();
  const targetId = targets[Math.floor(random() * targets.length)];
  const target = context.getCitizenById(targetId);

  if (!target) {
    return;
  }

  let relationship = citizen.relationships.find(rel => rel.targetId === targetId);
  if (!relationship) {
    relationship = {
      targetId,
      type: 'friend',
      strength: 20,
      lastInteraction: 0,
      interactionHistory: []
    };
    citizen.relationships.push(relationship);
  }

  const compatibility = calculateCompatibility(citizen.personality, target.personality);
  const interactionQuality =
    compatibility > 0.6 ? 'positive' : compatibility < 0.4 ? 'negative' : 'neutral';

  relationship.lastInteraction = timestamp;
  relationship.interactionHistory.push({
    cycle: timestamp,
    type: interactionQuality,
    context: 'casual_interaction'
  });

  if (interactionQuality === 'positive') {
    relationship.strength = Math.min(100, relationship.strength + 3);
  } else if (interactionQuality === 'negative') {
    relationship.strength = Math.max(0, relationship.strength - 2);
  }
}

function calculateCompatibility(p1: PersonalityTraits, p2: PersonalityTraits): number {
  const differences = [
    Math.abs(p1.ambition - p2.ambition),
    Math.abs(p1.sociability - p2.sociability),
    Math.abs(p1.industriousness - p2.industriousness),
    Math.abs(p1.contentment - p2.contentment),
    Math.abs(p1.curiosity - p2.curiosity)
  ];

  const avgDifference = differences.reduce((a, b) => a + b, 0) / differences.length;
  return 1 - avgDifference;
}
