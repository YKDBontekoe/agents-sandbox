import type { CityManagementState } from './CityManagementState';
import { ServiceType, type CityServicesSystem } from '../cityServices';
import type { RoadNetworkSystem } from '../roadNetwork';
import type { ZoningSystem, ZoneType } from '../zoning';

export interface CityActionContext {
  zoningSystem: ZoningSystem;
  roadNetwork: RoadNetworkSystem;
  cityServices: CityServicesSystem;
}

export interface ManagementAction {
  type: 'zone' | 'build_road' | 'build_service' | 'demolish' | 'upgrade';
  position: { x: number; y: number };
  data: Record<string, unknown>;
  cost: number;
}

export interface ZoneActionOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  zoneType: ZoneType;
}

export interface RoadActionOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  roadType: string;
}

export interface ServiceActionOptions {
  x: number;
  y: number;
  serviceType: ServiceType;
}

export function calculateZoneCost({ startX, startY, endX, endY }: ZoneActionOptions): number {
  const width = Math.abs(endX - startX) + 1;
  const height = Math.abs(endY - startY) + 1;
  return width * height * 100;
}

export function calculateRoadCost({ startX, startY, endX, endY, roadType }: RoadActionOptions): number {
  const distance = Math.abs(endX - startX) + Math.abs(endY - startY);
  const baseCost = roadType === 'highway' ? 500 : roadType === 'commercial' ? 300 : 200;
  return distance * baseCost;
}

export function calculateServiceCost(serviceType: ServiceType): number {
  switch (serviceType) {
    case ServiceType.POLICE:
      return 5000;
    case ServiceType.FIRE:
      return 7000;
    case ServiceType.HEALTHCARE:
      return 10000;
    case ServiceType.EDUCATION:
      return 8000;
    case ServiceType.POWER:
      return 15000;
    case ServiceType.WATER:
      return 12000;
    case ServiceType.WASTE:
      return 6000;
    default:
      return 5000;
  }
}

export function createZoneAction(options: ZoneActionOptions): ManagementAction {
  return {
    type: 'zone',
    position: { x: options.startX, y: options.startY },
    data: {
      endX: options.endX,
      endY: options.endY,
      zoneType: options.zoneType
    },
    cost: calculateZoneCost(options)
  };
}

export function createRoadAction(options: RoadActionOptions): ManagementAction {
  return {
    type: 'build_road',
    position: { x: options.startX, y: options.startY },
    data: {
      endPosition: { x: options.endX, y: options.endY },
      roadType: options.roadType
    },
    cost: calculateRoadCost(options)
  };
}

export function createServiceAction(options: ServiceActionOptions): ManagementAction {
  return {
    type: 'build_service',
    position: { x: options.x, y: options.y },
    data: { serviceType: options.serviceType },
    cost: calculateServiceCost(options.serviceType)
  };
}

export function applyCityAction(action: ManagementAction, context: CityActionContext): void {
  switch (action.type) {
    case 'zone': {
      const { endX, endY, zoneType } = action.data as {
        endX: number;
        endY: number;
        zoneType: ZoneType;
      };
      context.zoningSystem.zoneArea(action.position.x, action.position.y, endX, endY, zoneType);
      break;
    }
    case 'build_road': {
      const { endPosition, roadType } = action.data as {
        endPosition: { x: number; y: number };
        roadType: string;
      };
      context.roadNetwork.planRoad(roadType as any, action.position, endPosition);
      break;
    }
    case 'build_service': {
      const { serviceType } = action.data as { serviceType: ServiceType };
      context.cityServices.addServiceBuilding({
        id: `service_${Date.now()}`,
        typeId: serviceType,
        position: action.position,
        x: action.position.x,
        y: action.position.y,
        serviceType,
        capacity: 100,
        currentLoad: 0,
        efficiency: 1.0,
        maintenanceCost: 100,
        coverage: 10,
        staffing: 5,
        maxStaffing: 10
      });
      break;
    }
    default:
      break;
  }
}

export function processCityActions(
  actions: ManagementAction[],
  context: CityActionContext,
  state: CityManagementState
): void {
  for (const action of actions) {
    if (!state.canAfford(action.cost)) {
      continue;
    }

    applyCityAction(action, context);
    state.applyExpense(action.cost);
  }
}

export function executeCityAction(
  action: ManagementAction,
  context: CityActionContext,
  state: CityManagementState
): boolean {
  if (!state.canAfford(action.cost)) {
    return false;
  }

  applyCityAction(action, context);
  state.applyExpense(action.cost);
  return true;
}
