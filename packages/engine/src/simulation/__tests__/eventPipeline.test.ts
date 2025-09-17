import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameTime } from '../../types/gameTime';
import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildingSimulation';
import { CitizenBehaviorSystem } from '../citizenBehavior';
import { EventManager } from '../events/EventManager';
import { runEventPipeline } from '../eventPipeline';
import { WorkerSimulationSystem } from '../workerSimulation';
import type { JobRole } from '../workers/types';

const eventResources: SimResources = {
  grain: 110,
  coin: 95,
  mana: 45,
  favor: 12,
  workers: 45,
  wood: 55,
  planks: 22
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runEventPipeline', () => {
  it('updates event manager state and returns system health insights', () => {
    const eventManager = new EventManager();
    const citizenSystem = new CitizenBehaviorSystem();
    const citizen = citizenSystem.generateCitizen('citizen-1', 'Lena', 29, 777);

    const technicianRole: JobRole = {
      id: 'technician',
      title: 'Technician',
      category: 'maintenance',
      requiredSkills: {},
      baseWage: 20,
      maxLevel: 3,
      responsibilities: ['Maintain infrastructure'],
      workload: 45,
      prestige: 30
    };

    const workerSystem = new WorkerSimulationSystem({
      jobCatalog: new Map([[technicianRole.id, technicianRole]])
    });
    workerSystem.createWorker(citizen, technicianRole.id);
    const worker = workerSystem.getAllWorkers()[0];
    expect(worker).toBeDefined();

    const simulatedBuilding: SimulatedBuilding = {
      id: 'b-1',
      typeId: 'automation_workshop',
      x: 2,
      y: 3,
      level: 2,
      workers: 3,
      condition: 'good',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1
    };

    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const result = runEventPipeline(eventManager, {
      gameTime: createGameTime(60),
      buildings: [simulatedBuilding],
      citizens: [citizen],
      workers: worker ? [worker] : [],
      resources: eventResources
    });

    expect(Array.isArray(result.activeEvents)).toBe(true);
    expect(Array.isArray(result.visualIndicators)).toBe(true);
    expect(result.systemHealth).toHaveProperty('overallHealth');
  });
});
