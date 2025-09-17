import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityEffectsManager } from '../activityEffectsManager';
import { createMockGameState, createMockBuilding, createMockCitizen } from '../testUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ActivityEffectsManager', () => {
  it('expires activity indicators after their duration', () => {
    const manager = new ActivityEffectsManager();
    const state = createMockGameState({
      buildings: [createMockBuilding({ utilityEfficiency: 0.9 })],
      citizens: []
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    manager.generate(state);
    expect(manager.getIndicators()).toHaveLength(1);

    manager.update(3000);
    expect(manager.getIndicators()).toHaveLength(0);
  });

  it('does not create indicators when thresholds are unmet', () => {
    const manager = new ActivityEffectsManager();
    const state = createMockGameState({
      buildings: [createMockBuilding({ utilityEfficiency: 0.6 })],
      citizens: [createMockCitizen({ mood: { happiness: 55, stress: 40, energy: 60, motivation: 50 } })]
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.0);

    manager.generate(state);
    expect(manager.getIndicators()).toHaveLength(0);
  });
});
