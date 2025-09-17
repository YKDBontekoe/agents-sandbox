import * as PIXI from "pixi.js";
import type {
  AnimatedCitizen as EngineAnimatedCitizen,
  AnimatedVehicle as EngineAnimatedVehicle,
  VisualBuilding,
} from "@engine/visuals/citizens";

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

export type AnimatedCitizen = EngineAnimatedCitizen;
export type AnimatedVehicle = EngineAnimatedVehicle;
export type Building = VisualBuilding;

export interface Road {
  x: number;
  y: number;
}
