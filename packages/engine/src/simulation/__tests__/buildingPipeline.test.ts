import { describe, expect, it } from 'vitest';
import { createGameTime } from '../../types/gameTime';
import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildings';
import { runBuildingPipeline } from '../buildingPipeline';

const baseResources: SimResources = {
  grain: 120,
  coin: 0,
  mana: 40,
  favor: 5,
  workers: 30,
  wood: 60,
  planks: 25
};

describe('runBuildingPipeline', () => {
  it('updates building efficiency and recommends maintenance for overdue structures', () => {
    const gameTime = createGameTime(60 * 6);
    const rawBuilding = {
      id: 'b-1',
      typeId: 'farm',
      x: 0,
      y: 0,
      level: 1,
      workers: 2
    };

    const previousState: SimulatedBuilding = {
      ...rawBuilding,
      condition: 'good',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1,
      traits: undefined
    };

    const result = runBuildingPipeline({
      buildings: [rawBuilding],
      resources: baseResources,
      gameTime,
      previousSimulatedBuildings: [previousState]
    });

    expect(result.simulatedBuildings).toHaveLength(1);
    expect(result.simulatedBuildings[0].condition).toBe('fair');
    expect(result.simulatedBuildings[0].utilityEfficiency).toBeCloseTo(0.85, 2);
    expect(result.maintenanceActions).toContainEqual(
      expect.objectContaining({ buildingId: 'b-1', reason: 'overdue', priority: 'high' })
    );
  });
});
