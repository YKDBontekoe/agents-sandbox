export interface PathNode {
  x: number;
  y: number;
  walkable: boolean;
  roadType?: RoadType;
  trafficDensity: number; // 0-1, affects movement speed
  gCost: number; // Distance from starting node
  hCost: number; // Distance to target node
  fCost: number; // gCost + hCost
  parent?: PathNode;
}

export type RoadType = 'pedestrian' | 'residential' | 'commercial' | 'highway' | 'intersection';

export interface PathfindingRequest {
  start: { x: number; y: number };
  end: { x: number; y: number };
  entityType: 'pedestrian' | 'vehicle' | 'service' | 'public_transport';
  priority: number; // 0-100, higher = more important
  avoidTraffic: boolean;
  maxDistance?: number;
  allowedRoadTypes?: RoadType[];
}

export interface PathResult {
  path: Array<{ x: number; y: number }>;
  distance: number;
  estimatedTime: number; // in game minutes
  trafficLevel: 'low' | 'medium' | 'high';
  roadTypes: RoadType[];
  success: boolean;
}

export interface TrafficData {
  density: number; // 0-1
  speed: number; // 0-1, multiplier for movement speed
  congestionLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'gridlock';
  averageWaitTime: number; // in seconds
}

export interface RoadSegment {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  type: RoadType;
  lanes: number;
  speedLimit: number; // km/h
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  trafficLights: boolean;
  connectedSegments: string[];
}

export interface MovingEntity {
  id: string;
  type: 'pedestrian' | 'vehicle' | 'service' | 'public_transport';
  position: { x: number; y: number };
  destination: { x: number; y: number };
  currentPath: Array<{ x: number; y: number }>;
  speed: number; // current speed
  maxSpeed: number; // maximum speed
  pathIndex: number; // current position in path
  waitTime: number; // time spent waiting
}
