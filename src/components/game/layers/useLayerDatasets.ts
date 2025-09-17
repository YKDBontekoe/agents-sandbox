import { useMemo } from 'react';
import type { RouteBuildingRef, RouteDef } from '../../../../apps/web/features/routes';
import type { LayerBuilding, LayerDatasets, StoredBuilding, TradeRoute, WorkingCitizenVisualization } from './types';

const DEFAULT_SPEED = 1.0;

function mapBuildings(placedBuildings: StoredBuilding[]): LayerBuilding[] {
  return placedBuildings.map(building => ({
    id: building.id,
    typeId: building.typeId,
    x: building.x,
    y: building.y,
    workers: building.workers,
    level: building.level,
  }));
}

function deriveStoreConnections(placedBuildings: StoredBuilding[], routes: TradeRoute[] | undefined): string[] {
  if (!routes?.length) return [];
  const connected = new Set<string>();

  routes.forEach(route => {
    const origin = placedBuildings.find(b => b.id === route.fromId);
    const destination = placedBuildings.find(b => b.id === route.toId);
    if (!origin || !destination) return;

    if (origin.typeId === 'storehouse') {
      connected.add(destination.id);
    }
    if (destination.typeId === 'storehouse') {
      connected.add(origin.id);
    }
  });

  return Array.from(connected);
}

function mapRoutes(routes: TradeRoute[] | undefined): RouteDef[] {
  if (!routes?.length) return [];
  return routes.map(route => ({ id: route.id, fromId: route.fromId, toId: route.toId }));
}

function mapRouteBuildings(placedBuildings: StoredBuilding[]): RouteBuildingRef[] {
  return placedBuildings.map(building => ({ id: building.id, x: building.x, y: building.y }));
}

function mapWorkingCitizens(placedBuildings: StoredBuilding[]): WorkingCitizenVisualization[] {
  return placedBuildings
    .filter(building => building.workers > 0)
    .map(building => ({
      id: building.id,
      x: building.x,
      y: building.y,
      activity: 'working' as const,
      speed: DEFAULT_SPEED,
    }));
}

interface UseLayerDatasetsParams {
  placedBuildings: StoredBuilding[];
  routes: TradeRoute[] | undefined;
}

export function useLayerDatasets({ placedBuildings, routes }: UseLayerDatasetsParams): LayerDatasets {
  const buildings = useMemo(() => mapBuildings(placedBuildings), [placedBuildings]);
  const storeConnectedIds = useMemo(() => deriveStoreConnections(placedBuildings, routes), [placedBuildings, routes]);
  const routeDefs = useMemo(() => mapRoutes(routes), [routes]);
  const routeBuildings = useMemo(() => mapRouteBuildings(placedBuildings), [placedBuildings]);
  const workingCitizens = useMemo(() => mapWorkingCitizens(placedBuildings), [placedBuildings]);

  return {
    buildings,
    storeConnectedIds,
    routeDefs,
    routeBuildings,
    workingCitizens,
  };
}

export type { LayerDatasets } from './types';
