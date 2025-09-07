import { AdvancedPathfinding } from '../pathfinding';
import { RoadNetworkSystem } from '../roadNetwork';
import { TrafficSimulationSystem } from '../trafficSimulation';
import { ZoningSystem } from '../zoningSystem';
import { CityServicesSystem } from '../cityServices';
import { PublicTransportSystem } from '../publicTransport';
import { CityConfig } from './types';

export interface CitySystems {
  pathfinding: AdvancedPathfinding;
  roadNetwork: RoadNetworkSystem;
  trafficSimulation: TrafficSimulationSystem;
  zoningSystem: ZoningSystem;
  cityServices: CityServicesSystem;
  publicTransport: PublicTransportSystem;
}

export function initSystems(config: CityConfig): CitySystems {
  const { gridWidth, gridHeight } = config;

  return {
    pathfinding: new AdvancedPathfinding(gridWidth, gridHeight),
    roadNetwork: new RoadNetworkSystem(gridWidth, gridHeight),
    trafficSimulation: new TrafficSimulationSystem(gridWidth, gridHeight),
    zoningSystem: new ZoningSystem(gridWidth, gridHeight),
    cityServices: new CityServicesSystem(gridWidth, gridHeight),
    publicTransport: new PublicTransportSystem(gridWidth, gridHeight)
  };
}
