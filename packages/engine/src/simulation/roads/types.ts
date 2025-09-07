import type { RoadType } from '../pathfinding';

export interface RoadConnection {
  segmentId: string;
  connectionPoint: { x: number; y: number };
  direction: 'in' | 'out' | 'bidirectional';
}

export interface Intersection {
  id: string;
  position: { x: number; y: number };
  connectedRoads: RoadConnection[];
  trafficLights: boolean;
  lightCycle: number; // seconds
  currentPhase: 'north-south' | 'east-west' | 'all-stop';
  phaseTimer: number;
}

export interface RoadConstructionCost {
  money: number;
  time: number; // construction time in game hours
  maintenance: number; // ongoing maintenance cost per game day
}

export interface RoadBlueprint {
  type: RoadType;
  start: { x: number; y: number };
  end: { x: number; y: number };
  path: Array<{ x: number; y: number }>;
  cost: RoadConstructionCost;
  valid: boolean;
  conflicts: string[]; // List of issues preventing construction
}
