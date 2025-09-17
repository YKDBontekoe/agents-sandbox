import type { SimResources } from '../../index';
import type { GameTime } from '../../types/gameTime';
import {
  ENHANCED_BUILDINGS,
  type BuildingCondition,
  type SimulatedBuilding
} from './catalog';

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

const MIN_CONDITION_LEVEL = 1;
const MAX_CONDITION_LEVEL = 5;

const resolveCycle = (gameTimeOrCycle: GameTime | number): number =>
  typeof gameTimeOrCycle === 'number'
    ? gameTimeOrCycle
    : Math.floor(gameTimeOrCycle.totalMinutes / 60);

export const getConditionLevel = (condition: BuildingCondition): number =>
  CONDITION_LEVELS[condition];

export const getConditionFromLevel = (level: number): BuildingCondition =>
  LEVEL_TO_CONDITION[Math.max(MIN_CONDITION_LEVEL, Math.min(MAX_CONDITION_LEVEL, Math.round(level)))] ?? 'critical';

export function calculateDeterioration(
  building: SimulatedBuilding,
  gameTimeOrCycle: GameTime | number
): BuildingCondition {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) {
    return building.condition;
  }

  const currentCycle = resolveCycle(gameTimeOrCycle);
  const cyclesSinceLastMaintenance = currentCycle - building.lastMaintenance;
  const maintenanceOverdue = Math.max(0, cyclesSinceLastMaintenance - def.maintenance.interval);

  if (maintenanceOverdue === 0) {
    return building.condition;
  }

  const currentLevel = getConditionLevel(building.condition);
  const deteriorationAmount = maintenanceOverdue * def.maintenance.deteriorationRate;
  const newLevel = Math.max(MIN_CONDITION_LEVEL, Math.floor(currentLevel - deteriorationAmount));

  return LEVEL_TO_CONDITION[newLevel] ?? 'critical';
}

export function calculateMaintenanceCost(building: SimulatedBuilding): Partial<SimResources> {
  const def = ENHANCED_BUILDINGS[building.typeId];
  if (!def) {
    return {};
  }

  const baseCost = def.maintenance.cost;
  const conditionLevel = getConditionLevel(building.condition);
  const conditionPenalty = (MAX_CONDITION_LEVEL - conditionLevel) * def.deteriorationEffects.maintenanceCostIncrease;
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

export function performMaintenance(
  building: SimulatedBuilding,
  gameTimeOrCycle: GameTime | number,
  availableResources: SimResources
): { success: boolean; cost: Partial<SimResources>; newCondition: BuildingCondition } {
  const currentCycle = resolveCycle(gameTimeOrCycle);
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

  const currentLevel = getConditionLevel(building.condition);
  const newLevel = Math.min(MAX_CONDITION_LEVEL, currentLevel + 1);
  const newCondition = LEVEL_TO_CONDITION[newLevel] ?? 'excellent';

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
  const currentCycle = resolveCycle(gameTimeOrCycle);
  return buildings.filter(building => {
    const def = ENHANCED_BUILDINGS[building.typeId];
    if (!def) {
      return false;
    }

    const cyclesSinceLastMaintenance = currentCycle - building.lastMaintenance;
    return cyclesSinceLastMaintenance >= def.maintenance.interval;
  });
}

export function createSimulatedBuilding(
  building: { id: string; typeId: string; x: number; y: number; level: number; workers: number; traits?: Record<string, number> },
  gameTimeOrCycle: GameTime | number
): SimulatedBuilding {
  const currentCycle = resolveCycle(gameTimeOrCycle);
  return {
    ...building,
    condition: 'excellent',
    lastMaintenance: currentCycle,
    maintenanceDebt: 0,
    utilityEfficiency: 1.0
  };
}
