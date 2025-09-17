import type { SimResources } from '../../index';
import { ENHANCED_BUILDINGS, type SimulatedBuilding } from './catalog';
import { getConditionLevel } from './maintenance';

export function calculateUtilityEfficiency(
  building: SimulatedBuilding,
  availableResources: SimResources
): number {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) {
    return 1.0;
  }

  const requiredBase = def.utilities.base;
  const requiredPerWorker = def.utilities.perWorker;
  const workers = building.workers || 0;

  let totalEfficiency = 1.0;

  for (const [resource, amount] of Object.entries(requiredBase)) {
    const required = amount || 0;
    const available = availableResources[resource as keyof SimResources] || 0;
    if (required > 0) {
      const efficiency = Math.min(1.0, available / required);
      totalEfficiency *= efficiency;
    }
  }

  for (const [resource, amount] of Object.entries(requiredPerWorker)) {
    const required = (amount || 0) * workers;
    const available = availableResources[resource as keyof SimResources] || 0;
    if (required > 0) {
      const efficiency = Math.min(1.0, available / required);
      totalEfficiency *= efficiency;
    }
  }

  return Math.max(def.utilities.efficiency, totalEfficiency);
}

export function calculateBuildingOutput(
  building: SimulatedBuilding,
  baseOutput: Partial<SimResources>
): Partial<SimResources> {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) {
    return baseOutput;
  }

  const conditionLevel = getConditionLevel(building.condition);
  const conditionPenalty = (5 - conditionLevel) * def.deteriorationEffects.outputPenalty;
  const utilityEfficiency = building.utilityEfficiency || 1.0;

  const totalEfficiency = Math.max(0.1, (1 - conditionPenalty) * utilityEfficiency);

  const adjustedOutput: Partial<SimResources> = {};
  for (const [resource, amount] of Object.entries(baseOutput)) {
    if (amount && (amount as number) > 0) {
      adjustedOutput[resource as keyof SimResources] = Math.floor((amount as number) * totalEfficiency);
    }
  }

  return adjustedOutput;
}

export function calculateTotalUtilityConsumption(
  buildings: SimulatedBuilding[]
): Partial<SimResources> {
  const totalConsumption: Partial<SimResources> = {};

  for (const building of buildings) {
    const def = ENHANCED_BUILDINGS[building.typeId];
    if (!def) {
      continue;
    }

    const workers = building.workers || 0;

    for (const [resource, amount] of Object.entries(def.utilities.base)) {
      if (amount && (amount as number) > 0) {
        totalConsumption[resource as keyof SimResources] =
          (totalConsumption[resource as keyof SimResources] || 0) + amount;
      }
    }

    for (const [resource, amount] of Object.entries(def.utilities.perWorker)) {
      if (amount && (amount as number) > 0) {
        totalConsumption[resource as keyof SimResources] =
          (totalConsumption[resource as keyof SimResources] || 0) + ((amount as number) * workers);
      }
    }
  }

  return totalConsumption;
}
