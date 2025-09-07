import type { SimResources } from '../../index';
import type { GameTime } from '../../types/gameTime';
import { ENHANCED_BUILDINGS } from './catalog';
import { BuildingCondition, SimulatedBuilding } from './types';

const CONDITION_LEVELS: Record<BuildingCondition, number> = {
  excellent: 5,
  good: 4,
  fair: 3,
  poor: 2,
  critical: 1
};

const LEVEL_TO_CONDITION: Record<number, BuildingCondition> = {
  5: 'excellent',
  4: 'good',
  3: 'fair',
  2: 'poor',
  1: 'critical'
};

export function calculateDeterioration(
  building: SimulatedBuilding,
  gameTimeOrCycle: GameTime | number
): BuildingCondition {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) return building.condition;

  const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
  const cyclesSinceLastMaintenance = currentCycle - building.lastMaintenance;
  const maintenanceOverdue = Math.max(0, cyclesSinceLastMaintenance - def.maintenance.interval);

  if (maintenanceOverdue === 0) return building.condition;

  const currentLevel = CONDITION_LEVELS[building.condition];
  const deteriorationAmount = maintenanceOverdue * def.maintenance.deteriorationRate;
  const newLevel = Math.max(1, Math.floor(currentLevel - deteriorationAmount));

  return LEVEL_TO_CONDITION[newLevel];
}

export function calculateUtilityEfficiency(
  building: SimulatedBuilding,
  availableResources: SimResources
): number {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) return 1.0;

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

export function calculateMaintenanceCost(
  building: SimulatedBuilding
): Partial<SimResources> {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) return {};

  const baseCost = def.maintenance.cost;
  const conditionLevel = CONDITION_LEVELS[building.condition];
  const conditionPenalty = (5 - conditionLevel) * def.deteriorationEffects.maintenanceCostIncrease;
  const debtPenalty = building.maintenanceDebt;

  const totalMultiplier = 1 + conditionPenalty + debtPenalty;

  const adjustedCost: Partial<SimResources> = {};
  for (const [resource, amount] of Object.entries(baseCost)) {
    if (amount && (amount as number) > 0) {
      adjustedCost[resource as keyof SimResources] = Math.ceil((amount as number) * totalMultiplier);
    }
  }

  return adjustedCost;
}

export function calculateBuildingOutput(
  building: SimulatedBuilding,
  baseOutput: Partial<SimResources>
): Partial<SimResources> {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) return baseOutput;

  const conditionLevel = CONDITION_LEVELS[building.condition];
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

export function performMaintenance(
  building: SimulatedBuilding,
  gameTimeOrCycle: GameTime | number,
  availableResources: SimResources
): { success: boolean; cost: Partial<SimResources>; newCondition: BuildingCondition } {
  const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
  const maintenanceCost = calculateMaintenanceCost(building);

  let canAfford = true;
  for (const [resource, cost] of Object.entries(maintenanceCost)) {
    const available = availableResources[resource as keyof SimResources] || 0;
    if ((cost || 0) > available) {
      canAfford = false;
      break;
    }
  }

  if (!canAfford) {
    building.maintenanceDebt += 0.1;
    return {
      success: false,
      cost: maintenanceCost,
      newCondition: building.condition
    };
  }

  building.lastMaintenance = currentCycle;
  building.maintenanceDebt = Math.max(0, building.maintenanceDebt - 0.2);

  const currentLevel = CONDITION_LEVELS[building.condition];
  const newLevel = Math.min(5, currentLevel + 1);
  const newCondition = LEVEL_TO_CONDITION[newLevel];

  return {
    success: true,
    cost: maintenanceCost,
    newCondition
  };
}

export function getBuildingsNeedingMaintenance(
  buildings: SimulatedBuilding[],
  gameTimeOrCycle: GameTime | number
): SimulatedBuilding[] {
  const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
  return buildings.filter(building => {
    const def = ENHANCED_BUILDINGS[building.typeId];
    if (!def) return false;

    const cyclesSinceLastMaintenance = currentCycle - building.lastMaintenance;
    return cyclesSinceLastMaintenance >= def.maintenance.interval;
  });
}

export function calculateTotalUtilityConsumption(
  buildings: SimulatedBuilding[]
): Partial<SimResources> {
  const totalConsumption: Partial<SimResources> = {};

  for (const building of buildings) {
    const def = ENHANCED_BUILDINGS[building.typeId];
    if (!def) continue;

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
