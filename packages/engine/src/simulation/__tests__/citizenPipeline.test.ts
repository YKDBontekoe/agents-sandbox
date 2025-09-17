import { describe, expect, it } from 'vitest';
import { createGameTime } from '../../types/gameTime';
import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildingSimulation';
import { CitizenBehaviorSystem } from '../citizenBehavior';
import { runCitizenPipeline } from '../citizenPipeline';

const baselineResources: SimResources = {
  grain: 80,
  coin: 50,
  mana: 20,
  favor: 10,
  workers: 25,
  wood: 35,
  planks: 15
};

describe('runCitizenPipeline', () => {
  it('updates citizen states and reports community mood', () => {
    const citizenSystem = new CitizenBehaviorSystem();
    citizenSystem.generateCitizen('citizen-1', 'Iris', 28, 12345);

    const gameTime = createGameTime(60 * 4);
    const simulatedBuilding: SimulatedBuilding = {
      id: 'b-1',
      typeId: 'house',
      x: 0,
      y: 0,
      level: 1,
      workers: 0,
      condition: 'good',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1
    };

    const result = runCitizenPipeline(citizenSystem, {
      gameTime,
      buildings: [simulatedBuilding],
      resources: baselineResources,
      activeEvents: [],
      threatLevel: 5
    });

    expect(result.citizens).toHaveLength(1);
    expect(result.communityMood.happiness).toBeGreaterThan(0);
    expect(result.communityMood.stress).toBeGreaterThanOrEqual(0);
  });
});
