import type { GameTime } from '../types/gameTime';
import type { SimulatedBuilding } from './buildings/types';

export { ENHANCED_BUILDINGS } from './buildings/catalog';
export type {
  BuildingCondition,
  MaintenanceRequirements,
  UtilityConsumption,
  EnhancedBuildingDef,
  SimulatedBuilding,
} from './buildings/types';
export {
  calculateDeterioration,
  calculateUtilityEfficiency,
  calculateMaintenanceCost,
  calculateBuildingOutput,
  performMaintenance,
  getBuildingsNeedingMaintenance,
  calculateTotalUtilityConsumption,
} from './buildings/maintenance';

export function createSimulatedBuilding(
  building: { id: string; typeId: string; x: number; y: number; level: number; workers: number; traits?: Record<string, number> },
  gameTimeOrCycle: GameTime | number
): SimulatedBuilding {
  const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
  return {
    ...building,
    condition: 'excellent',
    lastMaintenance: currentCycle,
    maintenanceDebt: 0,
    utilityEfficiency: 1.0
  };
}
