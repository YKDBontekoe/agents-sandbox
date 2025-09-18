import { describe, it, expect } from 'vitest';
import { WorkerSimulationSystem } from '@engine/simulation/workerSimulation';
import { JobCatalogService } from '../jobCatalogService';
import { WorkerRepository } from '../workerRepository';
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
  it('creates workers, assigns them, and surfaces summaries', () => {
    const jobCatalogService = new JobCatalogService();
    const laborMarketService = new MockLaborMarketService();
    const progressionService = new MockWorkerProgressionService();
    const repository = new WorkerRepository();

    const system = new WorkerSimulationSystem({
      jobCatalogService,
      laborMarketService,
      workerProgressionService: progressionService,
      workerRepository: repository,
    });

    const citizenBehavior = new CitizenBehaviorSystem();
    const citizen = citizenBehavior.generateCitizen('citizen-1', 'Test Citizen', 30, 1);
    citizen.skills.agriculture = 40;
    citizen.skills.physical_strength = 40;

    const worker = system.createWorker(citizen, 'farmer');
    expect(worker).not.toBeNull();
    expect(repository.getWorker(citizen.id)).toBeDefined();

    const workplace = system.createWorkplace('building-1', 'field operations');
    expect(system.assignWorkerToWorkplace(citizen.id, 'building-1')).toBe(true);
    expect(workplace.workers).toContain(citizen.id);

    const resources: SimResources = {
      grain: 100,
      coin: 100,
      mana: 10,
      favor: 5,
      workers: 1,
      wood: 50,
      planks: 20,
      defense: 0,
    };

    system.updateSystem(
      {
        buildings: [
          {
            id: 'building-1',
            typeId: 'farm',
            x: 0,
            y: 0,
            level: 1,
            workers: 1,
            condition: 'good',
            lastMaintenance: 0,
            maintenanceDebt: 0,
            utilityEfficiency: 0.8,
          },
        ],
        resources,
        citizens: [citizen],
      },
      createGameTime(60)
    );

    expect(progressionService.updateCalls).toBe(1);
    expect(progressionService.updatedWorkers).toContain(citizen.id);

    expect(laborMarketService.updateCalls).toBe(1);
    expect(laborMarketService.contexts[0].buildings).toHaveLength(1);
    expect(laborMarketService.contexts[0].resources).toEqual(resources);

    const updatedWorker = system.getWorker(citizen.id);
    expect(updatedWorker).toBeDefined();
    expect(updatedWorker?.experienceLevel).toBeGreaterThan(0);

    const workerSummary = system.getWorkerPerformance(citizen.id);
    expect(workerSummary).not.toBeNull();
    expect(workerSummary?.efficiency).toBeGreaterThan(0);
    expect(workerSummary?.issues).toBeDefined();

    const summary = system.getLaborMarketSummary();
    expect(summary.unemployment).toBe(
      laborMarketService.getLaborMarket().unemploymentRate
    );

    expect(system.getAllWorkers()).toHaveLength(1);
  });
});
