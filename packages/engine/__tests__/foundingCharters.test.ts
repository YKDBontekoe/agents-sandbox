import { describe, expect, it } from 'vitest';
import { produceBuildings, processTick, type GameState, type SimBuildingType, FOUNDING_CHARTERS } from '../src';

const BASE_RESOURCES = { grain: 0, coin: 0, mana: 0, favor: 0, wood: 0, planks: 0, unrest: 0, threat: 0 } as Record<string, number>;

describe('founding charter effects', () => {
  it('boosts farm output for the Verdant Accord charter', () => {
    const farm: SimBuildingType = {
      id: 'farm',
      name: 'Farm',
      cost: {},
      inputs: { workers: 2 },
      outputs: { grain: 10 },
      workCapacity: 2,
    };
    const charter = FOUNDING_CHARTERS.find(c => c.id === 'verdant_accord');
    expect(charter).toBeTruthy();
    const state: GameState = {
      id: 's1',
      cycle: 0,
      resources: { ...BASE_RESOURCES },
      workers: 2,
      buildings: [{ id: 'b1', typeId: 'farm', workers: 2 }],
      founding_charter: charter!,
    };
    const { resources } = produceBuildings(state, { farm });
    expect(resources.grain).toBe(14);
  });

  it('applies per-tick mana adjustments for the Arcane Sanctum charter', () => {
    const charter = FOUNDING_CHARTERS.find(c => c.id === 'arcane_sanctum');
    expect(charter).toBeTruthy();
    const state: GameState = {
      id: 's2',
      cycle: 0,
      resources: { ...BASE_RESOURCES, mana: 50 },
      workers: 0,
      buildings: [],
      founding_charter: charter!,
    };
    const { state: next } = processTick(state, [], {});
    expect(next.resources.mana).toBe(48);
  });

  it("reduces sawmill input costs for the Architect's Legacy charter", () => {
    const sawmill: SimBuildingType = {
      id: 'sawmill',
      name: 'Sawmill',
      cost: {},
      inputs: { wood: 10, workers: 1 },
      outputs: { planks: 5 },
      workCapacity: 1,
    };
    const baseState: GameState = {
      id: 's3',
      cycle: 0,
      resources: { ...BASE_RESOURCES, wood: 20 },
      workers: 1,
      buildings: [{ id: 'b2', typeId: 'sawmill', workers: 1 }],
    };
    const withoutCharter = produceBuildings(baseState, { sawmill });
    const woodAfterBase = withoutCharter.resources.wood;

    const charter = FOUNDING_CHARTERS.find(c => c.id === 'architects_legacy');
    expect(charter).toBeTruthy();
    const withCharterState: GameState = { ...baseState, founding_charter: charter! };
    const withCharter = produceBuildings(withCharterState, { sawmill });
    expect(withCharter.resources.wood).toBeGreaterThan(woodAfterBase);
  });
});
