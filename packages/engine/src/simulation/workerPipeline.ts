import type { SimResources } from '../index';
import type { GameTime } from '../types/gameTime';
import type { Citizen } from './citizens/citizen';
import type { SimulatedBuilding } from './buildingSimulation';
import { WorkerSimulationSystem } from './workerSimulation';
import type { LaborMarket } from './workerSimulation';
import type { WorkerProfile } from './workers/types';

export interface WorkerPipelineInput {
  gameTime: GameTime;
  buildings: SimulatedBuilding[];
  resources: SimResources;
  citizens: Citizen[];
}

export interface WorkerPipelineResult {
  workers: WorkerProfile[];
  laborMarket: LaborMarket;
}

export function runWorkerPipeline(
  workerSystem: WorkerSimulationSystem,
  input: WorkerPipelineInput
): WorkerPipelineResult {
  workerSystem.updateSystem(
    {
      buildings: input.buildings,
      resources: input.resources,
      citizens: input.citizens
    },
    input.gameTime
  );

  return {
    workers: workerSystem.getAllWorkers(),
    laborMarket: workerSystem.getLaborMarket()
  };
}
