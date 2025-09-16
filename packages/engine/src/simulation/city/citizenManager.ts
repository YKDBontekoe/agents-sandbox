import type { AdvancedPathfinding } from '../pathfinding';
import type { PublicTransportSystem } from '../transport/transportSystem';
import type { TrafficSimulationSystem } from '../trafficSimulation';
import type { ZoningSystem } from '../zoning';
import type { CityServicesSystem } from '../cityServices';
import type { CityCitizen, CityMetrics } from './types';

export interface CitizenUpdate {
  id: string;
  changes: Partial<CityCitizen>;
}

type PathfindingLike = Pick<AdvancedPathfinding, 'findPath'>;
type TransportLike = Pick<PublicTransportSystem, 'findRoute' | 'addPassenger' | 'getSystemStats'>;
type TrafficLike = Pick<TrafficSimulationSystem, 'spawnVehicle'>;
type ZoningLike = Pick<ZoningSystem, 'getZonesByType'>;
type ServicesLike = Pick<CityServicesSystem, 'getAllServiceStats'>;

export class CitizenManager {
  constructor(
    private readonly pathfinding: PathfindingLike,
    private readonly publicTransport: TransportLike,
    private readonly trafficSimulation: TrafficLike,
    private readonly zoning: ZoningLike,
    private readonly cityServices: ServicesLike
  ) {}

  evaluateCitizens(
    citizens: ReadonlyArray<CityCitizen>,
    metrics: Pick<CityMetrics, 'traffic' | 'pollution' | 'crime'>
  ): CitizenUpdate[] {
    if (citizens.length === 0) {
      return [];
    }

    const updates: CitizenUpdate[] = [];
    const serviceStats = this.cityServices.getAllServiceStats();
    const transportStats = this.publicTransport.getSystemStats();

    for (const citizen of citizens) {
      const changes: Partial<CityCitizen> = {};

      if (citizen.needsTransport) {
        const transportUpdate = this.resolveTransport(citizen);
        if (transportUpdate) {
          Object.assign(changes, transportUpdate);
        }
      }

      if (citizen.needsWork) {
        const employmentUpdate = this.resolveEmployment(citizen);
        if (employmentUpdate) {
          Object.assign(changes, employmentUpdate);
        }
      }

      const satisfaction = this.calculateSatisfaction(serviceStats, transportStats, metrics);
      if (typeof satisfaction === 'number' && satisfaction !== citizen.satisfaction) {
        changes.satisfaction = satisfaction;
      }

      if (Object.keys(changes).length > 0) {
        updates.push({ id: citizen.id, changes });
      }
    }

    return updates;
  }

  private resolveTransport(citizen: CityCitizen): Partial<CityCitizen> | null {
    const origin = citizen.homeId;
    const destination = citizen.workId;

    if (!origin || !destination || !citizen.homePosition || !citizen.workPosition) {
      return null;
    }

    const publicRoute = this.publicTransport.findRoute(origin, destination);
    if (publicRoute) {
      this.publicTransport.addPassenger(citizen.id, origin, destination);
      return { transportMode: 'public' };
    }

    const pathResult = this.pathfinding.findPath({
      start: citizen.homePosition,
      end: citizen.workPosition,
      entityType: 'vehicle',
      priority: 50,
      avoidTraffic: true,
      allowedRoadTypes: ['residential', 'commercial', 'highway', 'intersection']
    });

    if (pathResult?.success) {
      this.trafficSimulation.spawnVehicle('car', citizen.homePosition, citizen.workPosition, 50);
      return { path: pathResult.path, transportMode: 'private' };
    }

    return null;
  }

  private resolveEmployment(citizen: CityCitizen): Partial<CityCitizen> | null {
    if (!citizen.homePosition) {
      return null;
    }

    const homePosition = citizen.homePosition;

    const commercialZones = this.zoning.getZonesByType('commercial');
    const industrialZones = this.zoning.getZonesByType('industrial');
    const zones = [...commercialZones, ...industrialZones];

    if (zones.length === 0) {
      return null;
    }

    const sortedZones = zones.sort((a, b) => {
      const distA = this.calculateDistance(homePosition, { x: a.x, y: a.y });
      const distB = this.calculateDistance(homePosition, { x: b.x, y: b.y });
      return distA - distB;
    });

    const job = sortedZones[0];
    if (!job) {
      return null;
    }

    return {
      workId: `${job.x}_${job.y}`,
      workPosition: { x: job.x, y: job.y },
      needsWork: false
    };
  }

  private calculateSatisfaction(
    serviceStats: ReturnType<ServicesLike['getAllServiceStats']>,
    transportStats: ReturnType<TransportLike['getSystemStats']>,
    metrics: Pick<CityMetrics, 'traffic' | 'pollution' | 'crime'>
  ): number {
    let satisfaction = 50;

    satisfaction += (serviceStats.police?.satisfaction ?? 0) * 0.2;
    satisfaction += (serviceStats.healthcare?.satisfaction ?? 0) * 0.3;
    satisfaction += (serviceStats.education?.satisfaction ?? 0) * 0.2;
    satisfaction += (serviceStats.parks?.satisfaction ?? 0) * 0.1;

    satisfaction += (100 - (transportStats.averageWaitTime ?? 0)) * 0.1;
    satisfaction -= (metrics.traffic ?? 0) * 0.1;
    satisfaction -= (metrics.pollution ?? 0) * 0.2;
    satisfaction -= (metrics.crime ?? 0) * 0.15;

    return Math.max(0, Math.min(100, satisfaction));
  }

  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }
}
