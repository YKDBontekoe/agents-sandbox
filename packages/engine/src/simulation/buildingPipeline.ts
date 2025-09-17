import type { SimResources } from '../index';
import type { GameTime } from '../types/gameTime';
import {
  calculateDeterioration,
  calculateMaintenanceCost,
  calculateUtilityEfficiency,
  createSimulatedBuilding,
  getBuildingsNeedingMaintenance,
  type SimulatedBuilding
} from './buildingSimulation';

export interface RawBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
  level: number;
  workers: number;
  traits?: Record<string, number>;
}

export type MaintenanceReason = 'overdue' | 'low_condition' | 'efficiency';
export type MaintenancePriority = 'high' | 'medium' | 'low';

export interface MaintenanceAction {
  buildingId: string;
  cost: Partial<SimResources>;
  priority: MaintenancePriority;
  reason: MaintenanceReason;
}

export interface BuildingPipelineInput {
  buildings: RawBuilding[];
  resources: SimResources;
  gameTime: GameTime;
  previousSimulatedBuildings?: SimulatedBuilding[];
}

export interface BuildingPipelineResult {
  simulatedBuildings: SimulatedBuilding[];
  maintenanceActions: MaintenanceAction[];
}

const mergeBuildingState = (
  rawBuilding: RawBuilding,
  gameTime: GameTime,
  previousSimulatedBuildings?: Map<string, SimulatedBuilding>
): SimulatedBuilding => {
  const previous = previousSimulatedBuildings?.get(rawBuilding.id);
  if (previous) {
    return {
      ...previous,
      ...rawBuilding
    };
  }

  return createSimulatedBuilding(rawBuilding, gameTime);
};

const determineMaintenancePriority = (
  building: SimulatedBuilding,
  dueForMaintenance: boolean
): { priority: MaintenancePriority; reason: MaintenanceReason } | null => {
  if (dueForMaintenance) {
    return { priority: 'high', reason: 'overdue' };
  }

  if (building.condition === 'poor' || building.condition === 'critical') {
    return { priority: 'medium', reason: 'low_condition' };
  }

  if ((building.utilityEfficiency ?? 1) < 0.8) {
    return { priority: 'low', reason: 'efficiency' };
  }

  return null;
};

export function runBuildingPipeline(input: BuildingPipelineInput): BuildingPipelineResult {
  const previousMap = input.previousSimulatedBuildings
    ? new Map(input.previousSimulatedBuildings.map(building => [building.id, building]))
    : undefined;

  const simulatedBuildings = input.buildings.map(rawBuilding => {
    const baseState = mergeBuildingState(rawBuilding, input.gameTime, previousMap);
    const condition = calculateDeterioration(baseState, input.gameTime);
    const updated: SimulatedBuilding = {
      ...baseState,
      ...rawBuilding,
      condition
    };

    const utilityEfficiency = calculateUtilityEfficiency(updated, input.resources);

    return {
      ...updated,
      utilityEfficiency
    };
  });

  const dueForMaintenance = new Set(
    getBuildingsNeedingMaintenance(simulatedBuildings, input.gameTime).map(building => building.id)
  );

  const maintenanceActions: MaintenanceAction[] = [];
  for (const building of simulatedBuildings) {
    const maintenanceMeta = determineMaintenancePriority(
      building,
      dueForMaintenance.has(building.id)
    );

    if (!maintenanceMeta) {
      continue;
    }

    maintenanceActions.push({
      buildingId: building.id,
      cost: calculateMaintenanceCost(building),
      priority: maintenanceMeta.priority,
      reason: maintenanceMeta.reason
    });
  }

  return {
    simulatedBuildings,
    maintenanceActions
  };
}
