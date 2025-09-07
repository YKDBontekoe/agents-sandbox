import type { RoadSegment, RoadType } from './pathfinding';
import { pathfindingSystem } from './pathfinding';
import type { Intersection, RoadBlueprint } from './roads/types';
import {
  calculateRoadPath,
  calculateConstructionCost,
  validateRoadPlacement
} from './roads/construction';

export class RoadNetworkSystem {
  private roads: Map<string, RoadSegment>;
  private intersections: Map<string, Intersection>;
  private constructionQueue: RoadBlueprint[];
  private roadGrid: (string | null)[][] = []; // Grid showing which road occupies each cell
  private gridWidth: number;
  private gridHeight: number;
  private nextRoadId: number;
  private nextIntersectionId: number;

  constructor(width: number, height: number) {
    this.roads = new Map();
    this.intersections = new Map();
    this.constructionQueue = [];
    this.gridWidth = width;
    this.gridHeight = height;
    this.nextRoadId = 1;
    this.nextIntersectionId = 1;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.roadGrid = [];
    for (let x = 0; x < this.gridWidth; x++) {
      this.roadGrid[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.roadGrid[x][y] = null;
      }
    }
  }

  // Plan road construction
  planRoad(type: RoadType, start: { x: number; y: number }, end: { x: number; y: number }): RoadBlueprint {
    const path = calculateRoadPath(start, end);

    const blueprint: RoadBlueprint = {
      type,
      start,
      end,
      path,
      cost: calculateConstructionCost(type, start, end),
      valid: true,
      conflicts: []
    };

    // Validate road placement
    validateRoadPlacement(blueprint, this.roadGrid, this.gridWidth, this.gridHeight);

    return blueprint;
  }

  

  // Construct road from blueprint
  constructRoad(blueprint: RoadBlueprint): string | null {
    if (!blueprint.valid) {
      return null;
    }

    const roadId = `road_${this.nextRoadId++}`;

    // Create road segment
    const road: RoadSegment = {
      id: roadId,
      start: blueprint.start,
      end: blueprint.end,
      type: blueprint.type,
      lanes: this.getLanesForRoadType(blueprint.type),
      speedLimit: this.getSpeedLimitForRoadType(blueprint.type),
      condition: 'excellent',
      trafficLights: blueprint.type === 'intersection',
      connectedSegments: []
    };

    // Update road grid
    for (const point of blueprint.path) {
      this.roadGrid[point.x][point.y] = roadId;
      
      // Update pathfinding system
      pathfindingSystem.setRoadType(point.x, point.y, blueprint.type);
      pathfindingSystem.setWalkable(point.x, point.y, true);
    }

    // Store road
    this.roads.set(roadId, road);

    // Create intersections at endpoints if needed
    this.createIntersectionIfNeeded(blueprint.start, roadId);
    this.createIntersectionIfNeeded(blueprint.end, roadId);

    // Connect to nearby roads
    this.connectToNearbyRoads(road);

    // Clear pathfinding cache since road network changed
    pathfindingSystem.clearCache();

    return roadId;
  }

  private getLanesForRoadType(type: RoadType): number {
    switch (type) {
      case 'pedestrian': return 0;
      case 'residential': return 2;
      case 'commercial': return 4;
      case 'highway': return 6;
      case 'intersection': return 4;
      default: return 2;
    }
  }

  private getSpeedLimitForRoadType(type: RoadType): number {
    switch (type) {
      case 'pedestrian': return 5;
      case 'residential': return 30;
      case 'commercial': return 50;
      case 'highway': return 100;
      case 'intersection': return 20;
      default: return 30;
    }
  }

  private createIntersectionIfNeeded(position: { x: number; y: number }, roadId: string): void {
    // Check if there's already an intersection here
    const existingIntersection = Array.from(this.intersections.values())
      .find(i => i.position.x === position.x && i.position.y === position.y);

    if (existingIntersection) {
      // Add road to existing intersection
      existingIntersection.connectedRoads.push({
        segmentId: roadId,
        connectionPoint: position,
        direction: 'bidirectional'
      });
      return;
    }

    // Count nearby roads to determine if intersection is needed
    const nearbyRoads = this.getNearbyRoads(position, 1);
    if (nearbyRoads.length >= 2) {
      const intersectionId = `intersection_${this.nextIntersectionId++}`;
      
      const intersection: Intersection = {
        id: intersectionId,
        position,
        connectedRoads: [{
          segmentId: roadId,
          connectionPoint: position,
          direction: 'bidirectional'
        }],
        trafficLights: nearbyRoads.length >= 3,
        lightCycle: 30, // 30 second cycle
        currentPhase: 'north-south',
        phaseTimer: 0
      };

      // Add other nearby roads to intersection
      for (const nearbyRoad of nearbyRoads) {
        if (nearbyRoad.id !== roadId) {
          intersection.connectedRoads.push({
            segmentId: nearbyRoad.id,
            connectionPoint: position,
            direction: 'bidirectional'
          });
        }
      }

      this.intersections.set(intersectionId, intersection);
      
      // Mark intersection in pathfinding system
      pathfindingSystem.setRoadType(position.x, position.y, 'intersection');
    }
  }

  private getNearbyRoads(position: { x: number; y: number }, radius: number): RoadSegment[] {
    const nearbyRoads: RoadSegment[] = [];
    
    for (let x = position.x - radius; x <= position.x + radius; x++) {
      for (let y = position.y - radius; y <= position.y + radius; y++) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          const roadId = this.roadGrid[x][y];
          if (roadId) {
            const road = this.roads.get(roadId);
            if (road && !nearbyRoads.find(r => r.id === road.id)) {
              nearbyRoads.push(road);
            }
          }
        }
      }
    }
    
    return nearbyRoads;
  }

  private connectToNearbyRoads(road: RoadSegment): void {
    const nearbyRoads = [
      ...this.getNearbyRoads(road.start, 1),
      ...this.getNearbyRoads(road.end, 1)
    ];

    for (const nearbyRoad of nearbyRoads) {
      if (nearbyRoad.id !== road.id) {
        // Add bidirectional connection
        if (!road.connectedSegments.includes(nearbyRoad.id)) {
          road.connectedSegments.push(nearbyRoad.id);
        }
        if (!nearbyRoad.connectedSegments.includes(road.id)) {
          nearbyRoad.connectedSegments.push(road.id);
        }
      }
    }
  }

  // Remove road
  removeRoad(roadId: string): boolean {
    const road = this.roads.get(roadId);
    if (!road) return false;

    // Remove from grid
    const roadPath = calculateRoadPath(road.start, road.end);
    for (const point of roadPath) {
      this.roadGrid[point.x][point.y] = null;
      pathfindingSystem.setWalkable(point.x, point.y, false);
    }

    // Remove connections
    for (const connectedId of road.connectedSegments) {
      const connectedRoad = this.roads.get(connectedId);
      if (connectedRoad) {
        const index = connectedRoad.connectedSegments.indexOf(roadId);
        if (index > -1) {
          connectedRoad.connectedSegments.splice(index, 1);
        }
      }
    }

    // Remove from intersections
    for (const intersection of this.intersections.values()) {
      intersection.connectedRoads = intersection.connectedRoads.filter(
        conn => conn.segmentId !== roadId
      );
      
      // Remove intersection if no roads left
      if (intersection.connectedRoads.length < 2) {
        this.intersections.delete(intersection.id);
      }
    }

    this.roads.delete(roadId);
    pathfindingSystem.clearCache();
    return true;
  }

  // Update traffic lights
  updateTrafficLights(deltaTime: number): void {
    for (const intersection of this.intersections.values()) {
      if (!intersection.trafficLights) continue;

      intersection.phaseTimer += deltaTime;
      
      if (intersection.phaseTimer >= intersection.lightCycle) {
        intersection.phaseTimer = 0;
        
        // Cycle through phases
        switch (intersection.currentPhase) {
          case 'north-south':
            intersection.currentPhase = 'east-west';
            break;
          case 'east-west':
            intersection.currentPhase = 'all-stop';
            break;
          case 'all-stop':
            intersection.currentPhase = 'north-south';
            break;
        }
      }
    }
  }

  // Get road network statistics
  getNetworkStats(): {
    totalRoads: number;
    totalLength: number;
    intersections: number;
    averageCondition: number;
    maintenanceCost: number;
  } {
    let totalLength = 0;
    let totalCondition = 0;
    let maintenanceCost = 0;

    for (const road of this.roads.values()) {
      const length = Math.sqrt(
        Math.pow(road.end.x - road.start.x, 2) + 
        Math.pow(road.end.y - road.start.y, 2)
      );
      totalLength += length;
      
      const conditionValue = {
        excellent: 1.0,
        good: 0.8,
        fair: 0.6,
        poor: 0.4
      }[road.condition];
      
      totalCondition += conditionValue;
      maintenanceCost += calculateConstructionCost(road.type, road.start, road.end).maintenance;
    }

    return {
      totalRoads: this.roads.size,
      totalLength,
      intersections: this.intersections.size,
      averageCondition: this.roads.size > 0 ? totalCondition / this.roads.size : 0,
      maintenanceCost
    };
  }

  // Get all roads
  getAllRoads(): RoadSegment[] {
    return Array.from(this.roads.values());
  }

  // Get all intersections
  getAllIntersections(): Intersection[] {
    return Array.from(this.intersections.values());
  }

  // Get road at position
  getRoadAt(x: number, y: number): RoadSegment | null {
    const roadId = this.roadGrid[x]?.[y];
    return roadId ? this.roads.get(roadId) || null : null;
  }
}

// Export singleton instance
export const roadNetworkSystem = new RoadNetworkSystem(200, 200);