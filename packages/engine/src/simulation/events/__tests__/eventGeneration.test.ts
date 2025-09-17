import { describe, expect, it } from 'vitest';
import {
  adjustEventProbability,
  generateEventCandidates
} from '../eventGeneration';
import type { SystemState, EventDefinition, EventType, ActiveEvent } from '../types';

const baseSystemState: SystemState = {
  population: 60,
  happiness: 25,
  economicHealth: 80,
  infrastructure: 35,
  resources: 70,
  stability: 20
};

function createEventDefinition(
  type: EventType,
  overrides: Partial<EventDefinition> = {}
): EventDefinition {
  const { impact: overrideImpact, ...rest } = overrides;

  const baseImpact: EventDefinition['impact'] = {
    resources: { coin: 0 },
    citizenMood: { happiness: 0, stress: 0, motivation: 0 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1, maintenanceCostMultiplier: 1 },
    economicEffects: { wageMultiplier: 1, tradeMultiplier: 1, growthRate: 0 },
    duration: 2,
    probability: 0.2
  };

  return {
    type,
    severity: rest.severity ?? 'moderate',
    title: rest.title ?? `Event: ${type}`,
    description: rest.description ?? `Description for ${type}`,
    impact: {
      ...baseImpact,
      ...overrideImpact,
      resources: {
        ...baseImpact.resources,
        ...(overrideImpact?.resources ?? {})
      },
      citizenMood: {
        ...baseImpact.citizenMood,
        ...(overrideImpact?.citizenMood ?? {})
      },
      buildingEffects: {
        ...baseImpact.buildingEffects,
        ...(overrideImpact?.buildingEffects ?? {})
      },
      economicEffects: {
        ...baseImpact.economicEffects,
        ...(overrideImpact?.economicEffects ?? {})
      }
    },
    iconType: rest.iconType ?? 'warning',
    color: rest.color ?? '#abcdef',
    animationType: rest.animationType ?? 'pulse',
    responses: rest.responses,
    triggers: rest.triggers
  };
}

describe('eventGeneration utilities', () => {
  it('adjusts probabilities based on system pressure', () => {
    const unrestProbability = adjustEventProbability('social_unrest', 0.1, baseSystemState);
    const plagueProbability = adjustEventProbability('plague_outbreak', 0.05, baseSystemState);
    const breakthroughProbability = adjustEventProbability(
      'technological_breakthrough',
      0.2,
      baseSystemState
    );

    expect(unrestProbability).toBeCloseTo(0.3, 5);
    expect(plagueProbability).toBeCloseTo(0.078, 5);
    expect(breakthroughProbability).toBeCloseTo(0.24, 5);
  });

  it('generates candidates in detection order with indicator sequencing', () => {
    const socialUnrest = createEventDefinition('social_unrest', {
      impact: {
        probability: 0.4,
        citizenMood: { happiness: -5, stress: 4, motivation: -2 }
      },
      color: '#ff0000'
    });

    const economicBoom = createEventDefinition('economic_boom', {
      impact: {
        probability: 0.35,
        resources: { coin: 20 },
        economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.2, growthRate: 0.05 }
      },
      color: '#00ff99',
      severity: 'major'
    });

    const eventDefinitions: Record<EventType, EventDefinition> = {
      social_unrest: socialUnrest,
      economic_boom: economicBoom
    };

    const activeEvent: ActiveEvent = {
      id: 'active-1',
      ...socialUnrest,
      startCycle: 0,
      endCycle: 2,
      isActive: true,
      triggers: [
        {
          condition: 'high_trade',
          eventType: 'economic_boom',
          probability: 0.9
        }
      ]
    };

    const randomValues = [0.05, 0.99, 0.1];
    let callCount = 0;
    const deterministicRandom = () => randomValues[callCount++] ?? 1;

    const candidates = generateEventCandidates({
      systemState: baseSystemState,
      activeEvents: [activeEvent],
      eventDefinitions,
      random: deterministicRandom
    });

    expect(candidates).toHaveLength(2);
    expect(candidates[0].type).toBe('social_unrest');
    expect(candidates[0].reason).toBe('probability');
    expect(candidates[0].indicator.change).toBe(1);

    expect(candidates[1].type).toBe('economic_boom');
    expect(candidates[1].reason).toBe('trigger');
    expect(candidates[1].indicator.change).toBe(2);

    expect(candidates.map(candidate => candidate.indicator.icon)).toEqual([
      'social_unrest',
      'economic_boom'
    ]);
  });
});
