import * as PIXI from "pixi.js";
import type {
  AnimatedCitizen as EngineAnimatedCitizen,
  AnimatedVehicle as EngineAnimatedVehicle,
  VisualBuilding,
} from "@engine/visuals/citizens";
import type {
  CitizenActivity as EngineCitizenActivity,
  CitizenBuildingRef,
  SimulationCitizen as EngineSimulationCitizen,
} from "@engine/simulation/citizens/citizenSimulation";

export type BuildingRef = CitizenBuildingRef;

export interface RoadTile {
  x: number;
  y: number;
}

export type CitizenActivity = EngineCitizenActivity;
export type SimulationCitizen = EngineSimulationCitizen;

export interface Citizen extends SimulationCitizen {
  sprite: PIXI.Graphics | null;
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
