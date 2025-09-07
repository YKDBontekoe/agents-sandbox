import * as PIXI from "pixi.js";

export interface BuildingRef {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers?: number;
}

export interface RoadTile {
  x: number;
  y: number;
}

export type CitizenActivity =
  | "CommuteToWork"
  | "Work"
  | "CommuteToShop"
  | "Shop"
  | "CommuteHome"
  | "Sleep";

export interface Citizen {
  x: number;
  y: number;
  tx: number;
  ty: number;
  path: Array<{ x: number; y: number }>;
  carrying: string | null;
  sprite: PIXI.Graphics | null;
  speed: number;
  name: string;
  role: "Hauler" | "Builder";
  homeX: number;
  homeY: number;
  workX: number;
  workY: number;
  workId?: string;
  shopX: number;
  shopY: number;
  activity: CitizenActivity;
  nextDecisionHour: number;
  baseWorldY: number;
  wanderCooldown: number;
  lastDist: number;
  stuckFor: number;
  repathCooldown: number;
  delivered?: "wood" | "planks" | "grain";
}

export interface CitizensLayerProps {
  buildings: BuildingRef[];
  roads: RoadTile[];
  tileTypes: string[][];
  onProposeRoads: (tiles: RoadTile[]) => void;
  citizensCount?: number;
  seed?: number;
  tileWidth?: number;
  tileHeight?: number;
  dayLengthSeconds?: number;
}

export interface AnimatedCitizen {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: 'worker' | 'trader' | 'citizen';
  buildingId?: string;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  lastActivity?: number;
  direction?: number;
}

export interface AnimatedVehicle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: 'cart' | 'wagon' | 'boat';
  cargo?: string;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  direction?: number;
  lastDelivery?: number;
}

export interface Building {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers: number;
  level: number;
}

export interface Road {
  x: number;
  y: number;
}
