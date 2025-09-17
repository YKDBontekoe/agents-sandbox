import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockGameState, createMockBuilding, createMockCitizen } from '../testUtils';
import { TrafficEffectsManager } from '../trafficEffectsManager';
import type { GameTime } from '../../../types/gameTime';

const midday: GameTime = {
  year: 1,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  totalMinutes: 12 * 60,
  timeOfDay: 'midday',
  dayProgress: 0.5,
  season: 'spring'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TrafficEffectsManager', () => {
  it('removes traffic flows once their duration expires', () => {
    const manager = new TrafficEffectsManager();
    const state = createMockGameState({
      buildings: [
        createMockBuilding({ id: 'b1', workers: 10, utilityEfficiency: 0.9 }),
        createMockBuilding({ id: 'b2', workers: 8, utilityEfficiency: 0.95 })
      ],
      citizens: [
        createMockCitizen({ id: 'c1' }),
        createMockCitizen({ id: 'c2' })
      ]
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    manager.generate(state, midday);
    expect(manager.getFlows().length).toBeGreaterThan(0);

    manager.update(5000);
    expect(manager.getFlows()).toHaveLength(0);
  });

  it('does not generate traffic when intensity thresholds are not met', () => {
    const manager = new TrafficEffectsManager();
    const state = createMockGameState({
      buildings: [createMockBuilding({ workers: 0, utilityEfficiency: 0.2 })],
      citizens: []
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.0);

    manager.generate(state, midday);
    expect(manager.getFlows()).toHaveLength(0);
  });
});
