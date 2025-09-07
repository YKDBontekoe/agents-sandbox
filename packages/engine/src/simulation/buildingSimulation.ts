import type { SimResources } from '../index';
import { SIM_BUILDINGS, type SimBuildingType } from './buildingCatalog';

// Building condition states
export type BuildingCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

// Building maintenance requirements
export interface MaintenanceRequirements {
  interval: number; // cycles between maintenance
  cost: Partial<SimResources>;
  deteriorationRate: number; // condition loss per cycle without maintenance
}

// Utility consumption patterns
export interface UtilityConsumption {
  base: Partial<SimResources>; // base consumption regardless of workers
  perWorker: Partial<SimResources>; // additional consumption per worker
  efficiency: number; // 0-1, affects output when utilities are insufficient
}

// Enhanced building definition with simulation features
export interface EnhancedBuildingDef extends SimBuildingType {
  maintenance: MaintenanceRequirements;
  utilities: UtilityConsumption;
  deteriorationEffects: {
    outputPenalty: number; // multiplier reduction per condition level below excellent
    maintenanceCostIncrease: number; // cost multiplier increase per condition level
  };
}

// Building instance with simulation state
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

// Condition level mappings
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

// Enhanced building catalog with simulation features
export const ENHANCED_BUILDINGS: Record<string, EnhancedBuildingDef> = {
  council_hall: {
    ...SIM_BUILDINGS.council_hall,
    maintenance: {
      interval: 4, // Reduced from 8 for faster expansion
      cost: { coin: 10, mana: 1 }, // Reduced costs
      deteriorationRate: 0.05 // Reduced deterioration
    },
    utilities: {
      base: { mana: 1 },
      perWorker: {},
      efficiency: 0.8
    },
    deteriorationEffects: {
      outputPenalty: 0.15,
      maintenanceCostIncrease: 0.25
    }
  },
  trade_post: {
    ...SIM_BUILDINGS.trade_post,
    maintenance: {
      interval: 3, // Reduced from 6
      cost: { coin: 6, planks: 1 }, // Reduced costs
      deteriorationRate: 0.08 // Reduced deterioration
    },
    utilities: {
      base: { coin: 1 },
      perWorker: {},
      efficiency: 0.9
    },
    deteriorationEffects: {
      outputPenalty: 0.2,
      maintenanceCostIncrease: 0.3
    }
  },
  automation_workshop: {
    ...SIM_BUILDINGS.automation_workshop,
    maintenance: {
      interval: 2, // Reduced from 4
      cost: { coin: 12, mana: 3 }, // Reduced costs
      deteriorationRate: 0.1 // Reduced deterioration
    },
    utilities: {
      base: { mana: 2 },
      perWorker: {},
      efficiency: 0.7
    },
    deteriorationEffects: {
      outputPenalty: 0.25,
      maintenanceCostIncrease: 0.4
    }
  },
  farm: {
    ...SIM_BUILDINGS.farm,
    maintenance: {
      interval: 3, // Reduced from 5
      cost: { coin: 5, planks: 1 }, // Reduced costs
      deteriorationRate: 0.06 // Reduced deterioration
    },
    utilities: {
      base: { coin: 1 },
      perWorker: { grain: 0.5 },
      efficiency: 0.85
    },
    deteriorationEffects: {
      outputPenalty: 0.18,
      maintenanceCostIncrease: 0.2
    }
  },
  lumber_camp: {
    ...SIM_BUILDINGS.lumber_camp,
    maintenance: {
      interval: 3, // Reduced from 6
      cost: { coin: 4, planks: 1 }, // Reduced costs
      deteriorationRate: 0.05 // Reduced deterioration
    },
    utilities: {
      base: {},
      perWorker: { grain: 0.3 },
      efficiency: 0.9
    },
    deteriorationEffects: {
      outputPenalty: 0.15,
      maintenanceCostIncrease: 0.25
    }
  },
  sawmill: {
    ...SIM_BUILDINGS.sawmill,
    maintenance: {
      interval: 4,
      cost: { coin: 12, planks: 3 },
      deteriorationRate: 0.18
    },
    utilities: {
      base: { coin: 1 },
      perWorker: { grain: 0.4 },
      efficiency: 0.8
    },
    deteriorationEffects: {
      outputPenalty: 0.22,
      maintenanceCostIncrease: 0.35
    }
  },
  storehouse: {
    ...SIM_BUILDINGS.storehouse,
    maintenance: {
      interval: 10,
      cost: { coin: 5, planks: 1 },
      deteriorationRate: 0.05
    },
    utilities: {
      base: {},
      perWorker: {},
      efficiency: 1.0
    },
    deteriorationEffects: {
      outputPenalty: 0.1,
      maintenanceCostIncrease: 0.15
    }
  },
  house: {
    ...SIM_BUILDINGS.house,
    maintenance: {
      interval: 8,
      cost: { coin: 6, planks: 2 },
      deteriorationRate: 0.08
    },
    utilities: {
      base: { grain: 1 },
      perWorker: {},
      efficiency: 0.95
    },
    deteriorationEffects: {
      outputPenalty: 0.12,
      maintenanceCostIncrease: 0.2
    }
  },
  shrine: {
    ...SIM_BUILDINGS.shrine,
    maintenance: {
      interval: 6,
      cost: { coin: 8, mana: 3 },
      deteriorationRate: 0.1
    },
    utilities: {
      base: { mana: 1 },
      perWorker: { mana: 0.2 },
      efficiency: 0.85
    },
    deteriorationEffects: {
      outputPenalty: 0.2,
      maintenanceCostIncrease: 0.3
    }
  }
};

// GameTime interface for building simulation
interface GameTime {
  totalMinutes: number;
  day: number;
  hour: number;
  minute: number;
  season: string;
}

// Calculate building deterioration
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

// Calculate utility efficiency based on resource availability
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

  // Check base utility requirements
  for (const [resource, amount] of Object.entries(requiredBase)) {
    const required = amount || 0;
    const available = availableResources[resource as keyof SimResources] || 0;
    if (required > 0) {
      const efficiency = Math.min(1.0, available / required);
      totalEfficiency *= efficiency;
    }
  }

  // Check per-worker utility requirements
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

// Calculate maintenance cost with condition penalties
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

// Calculate production output with condition and utility penalties
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

// Perform maintenance on a building
export function performMaintenance(
  building: SimulatedBuilding,
  gameTimeOrCycle: GameTime | number,
  availableResources: SimResources
): { success: boolean; cost: Partial<SimResources>; newCondition: BuildingCondition } {
  const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
  const maintenanceCost = calculateMaintenanceCost(building);
  
  // Check if we can afford maintenance
  let canAfford = true;
  for (const [resource, cost] of Object.entries(maintenanceCost)) {
    const available = availableResources[resource as keyof SimResources] || 0;
    if ((cost || 0) > available) {
      canAfford = false;
      break;
    }
  }

  if (!canAfford) {
    // Increase maintenance debt
    building.maintenanceDebt += 0.1;
    return {
      success: false,
      cost: maintenanceCost,
      newCondition: building.condition
    };
  }

  // Perform maintenance
  building.lastMaintenance = currentCycle;
  building.maintenanceDebt = Math.max(0, building.maintenanceDebt - 0.2);
  
  // Improve condition
  const currentLevel = CONDITION_LEVELS[building.condition];
  const newLevel = Math.min(5, currentLevel + 1);
  const newCondition = LEVEL_TO_CONDITION[newLevel];
  
  return {
    success: true,
    cost: maintenanceCost,
    newCondition
  };
}

// Get buildings requiring maintenance
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

// Calculate total utility consumption for all buildings
export function calculateTotalUtilityConsumption(
  buildings: SimulatedBuilding[]
): Partial<SimResources> {
  const totalConsumption: Partial<SimResources> = {};
  
  for (const building of buildings) {
    const def = ENHANCED_BUILDINGS[building.typeId];
    if (!def) continue;
    
    const workers = building.workers || 0;
    
    // Add base consumption
    for (const [resource, amount] of Object.entries(def.utilities.base)) {
      if (amount && (amount as number) > 0) {
        totalConsumption[resource as keyof SimResources] = 
          (totalConsumption[resource as keyof SimResources] || 0) + amount;
      }
    }
    
    // Add per-worker consumption
    for (const [resource, amount] of Object.entries(def.utilities.perWorker)) {
      if (amount && (amount as number) > 0) {
        totalConsumption[resource as keyof SimResources] = 
          (totalConsumption[resource as keyof SimResources] || 0) + ((amount as number) * workers);
      }
    }
  }
  
  return totalConsumption;
}

// Convert regular building to simulated building
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