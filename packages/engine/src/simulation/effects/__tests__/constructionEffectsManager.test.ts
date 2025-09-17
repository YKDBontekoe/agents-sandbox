import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConstructionEffectsManager } from '../constructionEffectsManager';
import { createMockGameState, createMockBuilding } from '../testUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConstructionEffectsManager', () => {
  it('removes animations when their duration elapses', () => {
    const manager = new ConstructionEffectsManager();
    const state = createMockGameState({
      buildings: [createMockBuilding({ id: 'b1', condition: 'poor', utilityEfficiency: 0.6 })]
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    const startTime = 1_000;
    manager.generate(state, startTime);
    expect(manager.getAnimations()).toHaveLength(1);

    const animation = manager.getAnimations()[0];
    const completionTime = startTime + animation.duration + 1;
    manager.update(completionTime);
    expect(manager.getAnimations()).toHaveLength(0);
  });

  it('skips generation when no buildings meet thresholds', () => {
    const manager = new ConstructionEffectsManager();
    const state = createMockGameState({
      buildings: [createMockBuilding({ condition: 'good', utilityEfficiency: 0.5 })]
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.0);

    manager.generate(state, 500);
    expect(manager.getAnimations()).toHaveLength(0);
  });
});
