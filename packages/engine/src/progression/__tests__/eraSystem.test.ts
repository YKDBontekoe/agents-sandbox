import { describe, expect, it } from 'vitest';
import { evaluateEra, ERA_DEFINITIONS, type EraStatus } from '../eraSystem';

const baseInput = {
  cycle: 12,
  citySize: 14,
  questsCompleted: 3,
  unrest: 18,
  threat: 16,
  manaReserve: 120,
  favor: 40
};

describe('eraSystem.evaluateEra', () => {
  it('returns the correct era and next-era preview for mid-game progress', () => {
    const status = evaluateEra(baseInput);

    expect(status.id).toBe('expansion_age');
    expect(status.stageIndex).toBe(1);
    expect(status.nextEra?.id).toBe('unrest_age');

    const expectedProgress = ((baseInput.citySize / ERA_DEFINITIONS[2].requirements.minCitySize) + (
      baseInput.questsCompleted / ERA_DEFINITIONS[2].requirements.minQuestsCompleted
    )) / 2;
    expect(status.progressToNextEra).toBeCloseTo(Math.min(1, Math.max(0, expectedProgress)), 5);

    const cityGoal = status.goals.find(goal => goal.id === 'expansion_city');
    expect(cityGoal?.current).toBe(baseInput.citySize);
    expect(cityGoal?.progress).toBeCloseTo(baseInput.citySize / 18, 5);
  });

  it('applies mitigation unlocks to reduce effective pressures', () => {
    const highProgressInput = {
      cycle: 48,
      citySize: 32,
      questsCompleted: 9,
      unrest: 40,
      threat: 42,
      manaReserve: 260,
      favor: 120
    };

    const status: EraStatus = evaluateEra(highProgressInput);
    expect(status.id).toBe('unrest_age');

    const mitigationIds = status.mitigations.filter(mitigation => mitigation.unlocked).map(mitigation => mitigation.id);
    expect(mitigationIds).toEqual(expect.arrayContaining(['shadow_network', 'warded_districts']));

    expect(status.pressures.effective.unrest).toBeLessThan(status.pressures.base.unrest);
    expect(status.pressures.effective.threat).toBeLessThan(status.pressures.base.threat);

    expect(status.overallGoalProgress).toBeGreaterThan(0.5);
  });

  it('signals ascension readiness once the final era conditions are met', () => {
    const ascensionInput = {
      cycle: 96,
      citySize: 44,
      questsCompleted: 12,
      unrest: 18,
      threat: 22,
      manaReserve: 360,
      favor: 180
    };

    const status = evaluateEra(ascensionInput);
    expect(status.id).toBe('ascension_age');
    expect(status.nextEra).toBeUndefined();
    expect(status.ascensionCondition).toBeTruthy();
    expect(status.progressToNextEra).toBe(1);
    expect(status.goals.every(goal => goal.completed || goal.optional)).toBe(true);
  });
});
