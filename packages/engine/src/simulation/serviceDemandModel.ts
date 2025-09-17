import { ServiceType, type Building, type ServiceDemand } from './cityServices.types';

type DemandConfig = {
  basePerCapita: Partial<Record<ServiceType, number>>;
  buildingAdjustments: Record<string, Partial<Record<ServiceType, number>>>;
};

const DEFAULT_DEMAND_CONFIG: DemandConfig = {
  basePerCapita: {
    [ServiceType.POLICE]: 0.002,
    [ServiceType.FIRE]: 0.001,
    [ServiceType.HEALTHCARE]: 0.003,
    [ServiceType.EDUCATION]: 0.005,
    [ServiceType.WATER]: 1.2,
    [ServiceType.POWER]: 1.5,
    [ServiceType.WASTE]: 0.8,
    [ServiceType.PARKS]: 0.001
  },
  buildingAdjustments: {
    commercial: {
      [ServiceType.POLICE]: 2,
      [ServiceType.WASTE]: 5
    },
    industrial: {
      [ServiceType.FIRE]: 3,
      [ServiceType.POWER]: 10,
      [ServiceType.WASTE]: 8
    }
  }
};

export class ServiceDemandModel {
  constructor(private readonly config: DemandConfig = DEFAULT_DEMAND_CONFIG) {}

  createEmptyDemand(): ServiceDemand {
    const demand = {} as ServiceDemand;
    for (const serviceType of Object.values(ServiceType)) {
      demand[serviceType as keyof ServiceDemand] = 0;
    }
    return demand;
  }

  calculate(population: number, buildings: Building[]): ServiceDemand {
    const demand = this.createEmptyDemand();

    for (const serviceType of Object.values(ServiceType)) {
      const ratio = this.config.basePerCapita[serviceType] ?? 0;
      demand[serviceType as keyof ServiceDemand] = Math.floor(population * ratio);
    }

    for (const building of buildings) {
      const adjustment = this.config.buildingAdjustments[building.typeId];
      if (!adjustment) continue;

      for (const [serviceType, delta] of Object.entries(adjustment)) {
        const key = serviceType as keyof ServiceDemand;
        demand[key] += delta ?? 0;
      }
    }

    for (const serviceType of Object.values(ServiceType)) {
      const key = serviceType as keyof ServiceDemand;
      if (demand[key] < 0) {
        demand[key] = 0;
      }
    }

    return demand;
  }
}

export { DEFAULT_DEMAND_CONFIG };
