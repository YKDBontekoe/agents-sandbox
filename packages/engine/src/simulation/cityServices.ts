import type { EmergencyDispatcherConfig } from './emergencyDispatcher';
import { EmergencyDispatcher } from './emergencyDispatcher';
import { ServiceCoverageMap } from './serviceCoverageMap';
import { ServiceDemandModel, DEFAULT_DEMAND_CONFIG } from './serviceDemandModel';
import {
  Building,
  EmergencyEvent,
  Position,
  ServiceBuilding,
  ServiceDemand,
  ServiceStats,
  ServiceType
} from './cityServices.types';

export type {
  Building,
  EmergencyEvent,
  Position,
  ServiceBuilding,
  ServiceDemand,
  ServiceStats
};
export { ServiceType, ServiceCoverageMap, ServiceDemandModel, DEFAULT_DEMAND_CONFIG, EmergencyDispatcher };
export type { EmergencyDispatcherConfig };

export class CityServicesSystem {
  private readonly serviceBuildings: Map<string, ServiceBuilding> = new Map();
  private serviceDemand: ServiceDemand;
  private readonly coverageMap: ServiceCoverageMap;
  private readonly demandModel: ServiceDemandModel;
  private readonly emergencyDispatcher: EmergencyDispatcher;

  constructor(
    gridWidth: number,
    gridHeight: number,
    options?: {
      demandModel?: ServiceDemandModel;
      emergencyDispatcher?: EmergencyDispatcher;
      coverageMap?: ServiceCoverageMap;
      emergencyConfig?: Omit<EmergencyDispatcherConfig, 'gridWidth' | 'gridHeight'>;
    }
  ) {
    this.coverageMap = options?.coverageMap ?? new ServiceCoverageMap(gridWidth, gridHeight);
    this.demandModel = options?.demandModel ?? new ServiceDemandModel();
    this.serviceDemand = this.demandModel.createEmptyDemand();
    this.emergencyDispatcher =
      options?.emergencyDispatcher ??
      new EmergencyDispatcher(
        (position, serviceType) => this.coverageMap.getCoverageAt(position, serviceType),
        {
          gridWidth,
          gridHeight,
          ...options?.emergencyConfig
        }
      );
  }

  addServiceBuilding(building: ServiceBuilding): void {
    this.serviceBuildings.set(building.id, building);
    this.coverageMap.updateForBuilding(building);
  }

  removeServiceBuilding(buildingId: string): void {
    if (this.serviceBuildings.delete(buildingId)) {
      this.coverageMap.rebuild(this.serviceBuildings.values());
    }
  }

  getCoverageAt(position: Position, serviceType: ServiceType): number {
    return this.coverageMap.getCoverageAt(position, serviceType);
  }

  updateDemand(buildings: Building[], population: number): void {
    this.serviceDemand = this.demandModel.calculate(population, buildings);
  }

  spawnEmergencyEvent(type: EmergencyEvent['type'], position: Position, severity: number): void {
    this.emergencyDispatcher.spawnEmergencyEvent(type, position, severity);
  }

  update(deltaTime: number): void {
    this.serviceBuildings.forEach(building => {
      const demandAtLocation = this.getDemandAtLocation(building.position, building.serviceType);
      building.currentLoad = Math.min(building.capacity, demandAtLocation);

      if (building.currentLoad > building.capacity * 0.8) {
        building.efficiency = Math.max(0.5, building.efficiency - 0.001);
      } else {
        building.efficiency = Math.min(1, building.efficiency + 0.0005);
      }
    });

    this.emergencyDispatcher.update(deltaTime);
  }

  private getDemandAtLocation(position: Position, serviceType: ServiceType): number {
    const baseDemand = this.serviceDemand[serviceType as keyof ServiceDemand] ?? 0;
    return Math.floor(baseDemand / Math.max(1, this.serviceBuildings.size));
  }

  getServiceStats(serviceType: ServiceType): ServiceStats {
    const buildings = Array.from(this.serviceBuildings.values()).filter(b => b.serviceType === serviceType);

    if (buildings.length === 0) {
      return { coverage: 0, satisfaction: 0, efficiency: 0, cost: 0 };
    }

    const totalCapacity = buildings.reduce((sum, b) => sum + b.capacity, 0);
    const totalDemand = this.serviceDemand[serviceType as keyof ServiceDemand] ?? 0;
    const totalCost = buildings.reduce((sum, b) => sum + b.maintenanceCost, 0);
    const avgEfficiency = buildings.reduce((sum, b) => sum + b.efficiency, 0) / buildings.length;

    const coverage = Math.min(1, totalCapacity / Math.max(1, totalDemand));
    const satisfaction = coverage * avgEfficiency;

    return {
      coverage,
      satisfaction,
      efficiency: avgEfficiency,
      cost: totalCost
    };
  }

  getAllServiceStats(): Record<ServiceType, ServiceStats> {
    const stats: Record<ServiceType, ServiceStats> = {} as Record<ServiceType, ServiceStats>;

    for (const serviceType of Object.values(ServiceType)) {
      stats[serviceType] = this.getServiceStats(serviceType);
    }

    return stats;
  }

  getActiveEmergencies(): EmergencyEvent[] {
    return this.emergencyDispatcher.getActiveEmergencies();
  }

  getServiceBuildings(serviceType?: ServiceType): ServiceBuilding[] {
    const buildings = Array.from(this.serviceBuildings.values());
    return serviceType ? buildings.filter(b => b.serviceType === serviceType) : buildings;
  }
}
