import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildings/catalog';
import type { Citizen } from '../citizens/citizen';
import type { WorkerProfile } from '../workers/types';
import type { SystemState } from './types';

export interface SimulationSnapshot {
  buildings: SimulatedBuilding[];
  citizens: Citizen[];
  workers: WorkerProfile[];
  resources: SimResources;
}

export const DEFAULT_SYSTEM_STATE: SystemState = {
  population: 0,
  happiness: 50,
  economicHealth: 50,
  infrastructure: 50,
  resources: 50,
  stability: 50
};

export function scorePopulation(citizens: Citizen[]): number {
  return citizens.length;
}

export function scoreHappiness(citizens: Citizen[]): number {
  if (citizens.length === 0) {
    return DEFAULT_SYSTEM_STATE.happiness;
  }

  const totalHappiness = citizens.reduce((sum, citizen) => sum + citizen.mood.happiness, 0);
  return totalHappiness / citizens.length;
}

export function scoreEconomicHealth(
  resources: SimResources,
  workers: WorkerProfile[]
): number {
  const resourceScore = Math.min(100, (resources.coin || 0) / 2);

  if (workers.length === 0) {
    return (resourceScore + DEFAULT_SYSTEM_STATE.economicHealth) / 2;
  }

  const workerSatisfaction =
    workers.reduce((sum, worker) => sum + worker.jobSatisfaction, 0) / workers.length;

  return (resourceScore + workerSatisfaction) / 2;
}

const BUILDING_CONDITION_SCORES: Record<string, number> = {
  excellent: 100,
  good: 80,
  fair: 60,
  poor: 40,
  critical: 20
};

const NO_CITIZEN_BASELINE_STRESS = 30;

export function scoreInfrastructure(buildings: SimulatedBuilding[]): number {
  if (buildings.length === 0) {
    return DEFAULT_SYSTEM_STATE.infrastructure;
  }

  const totalConditionScore = buildings.reduce((sum, building) => {
    const conditionScore = BUILDING_CONDITION_SCORES[building.condition] ?? DEFAULT_SYSTEM_STATE.infrastructure;
    return sum + conditionScore;
  }, 0);

  return totalConditionScore / buildings.length;
}

export function scoreResources(resources: SimResources): number {
  const totalResources =
    (resources.coin || 0) +
    (resources.grain || 0) +
    (resources.planks || 0) +
    (resources.mana || 0);

  return Math.min(100, totalResources / 5);
}

export function scoreStability(citizens: Citizen[]): number {
  if (citizens.length === 0) {
    return Math.max(0, 100 - NO_CITIZEN_BASELINE_STRESS);
  }

  const totalStress = citizens.reduce((sum, citizen) => sum + citizen.mood.stress, 0);
  const averageStress = totalStress / citizens.length;

  return Math.max(0, 100 - averageStress);
}

export function computeSystemState(snapshot: SimulationSnapshot): SystemState {
  return {
    population: scorePopulation(snapshot.citizens),
    happiness: scoreHappiness(snapshot.citizens),
    economicHealth: scoreEconomicHealth(snapshot.resources, snapshot.workers),
    infrastructure: scoreInfrastructure(snapshot.buildings),
    resources: scoreResources(snapshot.resources),
    stability: scoreStability(snapshot.citizens)
  };
}
