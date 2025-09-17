import type { SimResources } from '../../index';
import { SIM_BUILDINGS, type SimBuildingType } from '../buildingCatalog';

export type BuildingCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface MaintenanceRequirements {
  interval: number;
  cost: Partial<SimResources>;
  deteriorationRate: number;
}

export interface UtilityConsumption {
  base: Partial<SimResources>;
  perWorker: Partial<SimResources>;
  efficiency: number;
}

export interface EnhancedBuildingDef extends SimBuildingType {
  maintenance: MaintenanceRequirements;
  utilities: UtilityConsumption;
  deteriorationEffects: {
    outputPenalty: number;
    maintenanceCostIncrease: number;
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
  lastMaintenance: number;
  maintenanceDebt: number;
  utilityEfficiency: number;
  traits?: Record<string, number>;
}

export const ENHANCED_BUILDINGS: Record<string, EnhancedBuildingDef> = {
  council_hall: {
    ...SIM_BUILDINGS.council_hall,
    maintenance: {
      interval: 4,
      cost: { coin: 10, mana: 1 },
      deteriorationRate: 0.05
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
      interval: 3,
      cost: { coin: 6, planks: 1 },
      deteriorationRate: 0.08
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
      interval: 2,
      cost: { coin: 12, mana: 3 },
      deteriorationRate: 0.1
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
      interval: 3,
      cost: { coin: 5, planks: 1 },
      deteriorationRate: 0.06
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
      interval: 3,
      cost: { coin: 4, planks: 1 },
      deteriorationRate: 0.05
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

export type EnhancedBuildingCatalog = typeof ENHANCED_BUILDINGS;
export type EnhancedBuildingId = keyof EnhancedBuildingCatalog;
