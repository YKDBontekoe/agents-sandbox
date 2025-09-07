import type { SimResources, SimBuildingType } from '../../index';

export type BuildingCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface MaintenanceRequirements {
  interval: number; // cycles between maintenance
  cost: Partial<SimResources>;
  deteriorationRate: number; // condition loss per cycle without maintenance
}

export interface UtilityConsumption {
  base: Partial<SimResources>; // base consumption regardless of workers
  perWorker: Partial<SimResources>; // additional consumption per worker
  efficiency: number; // 0-1, affects output when utilities are insufficient
}

export interface EnhancedBuildingDef extends SimBuildingType {
  maintenance: MaintenanceRequirements;
  utilities: UtilityConsumption;
  deteriorationEffects: {
    outputPenalty: number; // multiplier reduction per condition level below excellent
    maintenanceCostIncrease: number; // cost multiplier increase per condition level
  };
}

export interface SimulatedBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
  level: number;
  workers: number;
  condition: BuildingCondition;
  lastMaintenance: number; // cycle when last maintained
  maintenanceDebt: number; // accumulated maintenance cost multiplier
  utilityEfficiency: number; // current efficiency based on utility availability
  traits?: Record<string, number>;
}
