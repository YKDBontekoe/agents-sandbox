import { ServiceType, type CityServicesSystem } from '../cityServices';
import type { ZoningSystem } from '../zoning';
import type { CityBuilding, CityMetrics } from './types';

export interface BuildingDelta {
  id: string;
  changes: Partial<CityBuilding>;
}

export interface BuildingEvaluationResult {
  updates: BuildingDelta[];
  budgetDelta: number;
}

type CityServicesReadModel = Pick<CityServicesSystem, 'getAllServiceStats'>;
type ZoningReadModel = Pick<ZoningSystem, 'getZoneAt'>;

export class BuildingManager {
  constructor(
    private readonly cityServices: CityServicesReadModel,
    private readonly zoning: ZoningReadModel
  ) {}

  evaluateBuildings(
    buildings: ReadonlyArray<CityBuilding>,
    metrics: Pick<CityMetrics, 'traffic' | 'crime'>,
    gameTime: number,
    currentBudget: number
  ): BuildingEvaluationResult {
    if (buildings.length === 0) {
      return { updates: [], budgetDelta: 0 };
    }

    const updates: BuildingDelta[] = [];
    let budgetDelta = 0;
    const serviceStats = this.cityServices.getAllServiceStats();

    for (const building of buildings) {
      const changes: Partial<CityBuilding> = {};

      const efficiency = this.calculateEfficiency(building, serviceStats, metrics);
      if (typeof efficiency === 'number' && efficiency !== building.efficiency) {
        changes.efficiency = efficiency;
      }

      const zone = this.zoning.getZoneAt?.(building.x, building.y);
      if (zone && zone.type && zone.type !== building.zoneType) {
        const upgrade = this.prepareUpgrade(building, zone.type, gameTime, currentBudget + budgetDelta);
        if (upgrade) {
          budgetDelta += upgrade.budgetDelta;
          Object.assign(changes, upgrade.changes);
        }
      }

      if (Object.keys(changes).length > 0) {
        updates.push({ id: building.id, changes });
      }
    }

    return { updates, budgetDelta };
  }

  private calculateEfficiency(
    building: CityBuilding,
    serviceStats: ReturnType<CityServicesReadModel['getAllServiceStats']>,
    metrics: Pick<CityMetrics, 'traffic' | 'crime'>
  ): number | undefined {
    let efficiency = building.baseEfficiency ?? building.efficiency ?? 80;

    if (building.type === 'commercial') {
      efficiency *= (serviceStats[ServiceType.POLICE]?.coverage ?? 0.5);
      efficiency *= 1 - (metrics.crime ?? 0) / 200;
    } else if (building.type === 'industrial') {
      efficiency *= (serviceStats[ServiceType.POWER]?.coverage ?? 0.5);
      efficiency *= (serviceStats[ServiceType.WATER]?.coverage ?? 0.5);
    } else if (building.type === 'residential') {
      efficiency *= (serviceStats[ServiceType.HEALTHCARE]?.coverage ?? 0.5);
      efficiency *= (serviceStats[ServiceType.EDUCATION]?.coverage ?? 0.5);
    }

    const trafficImpact = Math.max(0.5, 1 - (metrics.traffic ?? 0) / 200);
    efficiency *= trafficImpact;

    return Math.max(10, Math.min(100, efficiency));
  }

  private prepareUpgrade(
    building: CityBuilding,
    targetZone: string,
    gameTime: number,
    availableBudget: number
  ): { changes: Partial<CityBuilding>; budgetDelta: number } | null {
    const upgradeCost = this.calculateUpgradeCost(targetZone);
    const changes: Partial<CityBuilding> = {
      zoneType: targetZone,
      needsUpgrade: true
    };

    if (availableBudget >= upgradeCost) {
      Object.assign(changes, {
        upgrading: true,
        upgradeTarget: targetZone,
        upgradeTime: gameTime + 30000
      });
      return { changes, budgetDelta: -upgradeCost };
    }

    return { changes, budgetDelta: 0 };
  }

  private calculateUpgradeCost(targetType: string): number {
    const baseCost = 1000;
    const typeCostMultiplier: Record<string, number> = {
      residential: 1,
      commercial: 1.5,
      industrial: 2,
      office: 1.8
    };

    return baseCost * (typeCostMultiplier[targetType] ?? 1);
  }
}
