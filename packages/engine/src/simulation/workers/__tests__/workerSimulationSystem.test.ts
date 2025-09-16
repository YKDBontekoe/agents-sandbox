import { describe, it, expect } from 'vitest';
import { WorkerSimulationSystem } from '@engine/simulation/workerSimulation';
import { createDefaultJobCatalog } from '../jobCatalog';
import {
  LaborMarketService,
  type LaborMarketUpdateContext,
} from '../laborMarketService';
import {
  WorkerProgressionService,
  type WorkerProgressionContext,
} from '../workerProgressionService';
import type { WorkerProfile } from '../types';
import type { SimResources } from '@engine/index';
import { createGameTime } from '@engine/types/gameTime';
import { CitizenBehaviorSystem } from '@engine/simulation/citizenBehavior';

class MockLaborMarketService extends LaborMarketService {
  public updateCalls = 0;
  public contexts: LaborMarketUpdateContext[] = [];

  updateLaborMarket(context: LaborMarketUpdateContext): void {
    this.updateCalls += 1;
    this.contexts.push(context);
    super.updateLaborMarket(context);
  }
}

class MockWorkerProgressionService extends WorkerProgressionService {
  public updateCalls = 0;
  public updatedWorkers: string[] = [];

  updateWorkerProgression(worker: WorkerProfile, context: WorkerProgressionContext): void {
    this.updateCalls += 1;
    this.updatedWorkers.push(worker.citizenId);
    super.updateWorkerProgression(worker, context);
  }
}

describe('WorkerSimulationSystem integration', () => {
  it('delegates worker updates to progression and labor market services', () => {
    const jobCatalog = createDefaultJobCatalog();
    const laborMarketService = new MockLaborMarketService();
    const progressionService = new MockWorkerProgressionService();

    const system = new WorkerSimulationSystem({
      jobCatalog,
      laborMarketService,
      workerProgressionService: progressionService,
    });

    const citizenBehavior = new CitizenBehaviorSystem();
    const citizen = citizenBehavior.generateCitizen('citizen-1', 'Test Citizen', 30, 1);
    citizen.skills.agriculture = 40;
    citizen.skills.physical_strength = 40;

    const worker = system.createWorker(citizen, 'farmer');
    expect(worker).not.toBeNull();

    const resources: SimResources = {
      grain: 100,
      coin: 100,
      mana: 10,
      favor: 5,
      workers: 1,
      wood: 50,
      planks: 20,
    };

    system.updateSystem(
      {
        buildings: [],
        resources,
        citizens: [citizen],
      },
      createGameTime(60)
    );

    expect(progressionService.updateCalls).toBe(1);
    expect(progressionService.updatedWorkers).toContain(citizen.id);

    expect(laborMarketService.updateCalls).toBe(1);
    expect(laborMarketService.contexts[0].buildings).toEqual([]);
    expect(laborMarketService.contexts[0].resources).toEqual(resources);

    const updatedWorker = system.getWorker(citizen.id);
    expect(updatedWorker).toBeDefined();
    expect(updatedWorker?.experienceLevel).toBeGreaterThan(0);

    const summary = system.getLaborMarketSummary();
    expect(summary.unemployment).toBe(
      laborMarketService.getLaborMarket().unemploymentRate
    );
  });
});
