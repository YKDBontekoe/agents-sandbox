import type { BuildTypeId } from '../panels/TileInfoPanel';
import type { SimResources } from '../resourceUtils';
import type { SimpleBuilding } from '../types';
import type { RouteDef, RouteBuildingRef } from '../../../../apps/web/features/routes';

export interface TileSelection {
  x: number;
  y: number;
  tileType?: string;
}

export interface StoredBuilding {
  id: string;
  typeId: BuildTypeId;
  x: number;
  y: number;
  level: number;
  workers: number;
}

export interface TradeRoute {
  id: string;
  fromId: string;
  toId: string;
}

export interface Marker {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export type BuildPlacementHint =
  | { valid: true }
  | { valid: false; reason: string };

export interface BuildPlacementHintsResult {
  buildHint?: BuildPlacementHint;
  highlightAllPlaceable: boolean;
  hasCouncil: boolean;
  isFreeBuild: boolean;
  affordable: boolean;
}

export interface BuildPlacementInput {
  previewTypeId: BuildTypeId | null;
  hoverTile: TileSelection | null;
  selectedTile: TileSelection | null;
  placedBuildings: StoredBuilding[];
  tutorialFree: Partial<Record<BuildTypeId, number>>;
  simResources: SimResources | null;
}

export interface LayerBuilding extends SimpleBuilding {
  workers: number;
  level: number;
}

export interface WorkingCitizenVisualization {
  id: string;
  x: number;
  y: number;
  activity: 'working';
  speed: number;
}

export interface LayerDatasets {
  buildings: LayerBuilding[];
  storeConnectedIds: string[];
  routeDefs: RouteDef[];
  routeBuildings: RouteBuildingRef[];
  workingCitizens: WorkingCitizenVisualization[];
}
