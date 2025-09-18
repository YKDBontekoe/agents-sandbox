import { describe, expect, it } from 'vitest';
import { createGameTime } from '../../types/gameTime';
import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildings';
import { CitizenBehaviorSystem } from '../citizenBehavior';
import { WorkerSimulationSystem } from '../workerSimulation';
import type { JobRole } from '../workers/types';
import { runWorkerPipeline } from '../workerPipeline';

const workerResources: SimResources = {
  grain: 90,
  coin: 75,
  mana: 30,
  favor: 8,
  workers: 40,
  wood: 45,
  planks: 18,
  defense: 0,
};

describe('runWorkerPipeline', () => {
  it('advances worker simulation and exposes labor market data', () => {
    const citizenSystem = new CitizenBehaviorSystem();
    const citizen = citizenSystem.generateCitizen('citizen-1', 'Rowan', 32, 4242);

    const generalistRole: JobRole = {
      id: 'generalist',
      title: 'Generalist',
      category: 'service',
      requiredSkills: {},
      baseWage: 12,
      maxLevel: 3,
      responsibilities: ['Support daily operations'],
      workload: 40,
      prestige: 20
    };

    const workerSystem = new WorkerSimulationSystem({
      jobCatalog: new Map([[generalistRole.id, generalistRole]])
    });

    const worker = workerSystem.createWorker(citizen, generalistRole.id);
    expect(worker).not.toBeNull();

    const simulatedBuilding: SimulatedBuilding = {
      id: 'b-1',
      typeId: 'farm',
      x: 0,
      y: 0,
      level: 1,
      workers: 2,
      condition: 'good',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1
    };

    const result = runWorkerPipeline(workerSystem, {
      gameTime: createGameTime(60 * 3),
      buildings: [simulatedBuilding],
      resources: workerResources,
      citizens: [citizen]
    });

    expect(result.workers.length).toBeGreaterThan(0);
    expect(result.laborMarket.averageWages).toHaveProperty('service');
  });
});
