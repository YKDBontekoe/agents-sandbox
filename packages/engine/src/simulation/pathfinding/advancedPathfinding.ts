import type {
  PathNode,
  PathfindingRequest,
  PathResult,
  RoadType,
  TrafficData,
  RoadSegment,
  MovingEntity
} from './types';
import { aStar } from './algorithms';

export class AdvancedPathfinding {
  private grid: PathNode[][];
  private gridWidth: number;
  private gridHeight: number;
  private trafficData: Map<string, TrafficData>;
  private roadNetwork: Map<string, RoadSegment>;
  private pathCache: Map<string, { path: PathResult; timestamp: number }>;
  private activeEntities: Map<string, MovingEntity>;

  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    this.grid = [];
    this.trafficData = new Map();
    this.roadNetwork = new Map();
    this.pathCache = new Map();
    this.activeEntities = new Map();
    this.initializeGrid();
  }

  private initializeGrid(): void {
    for (let x = 0; x < this.gridWidth; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.grid[x][y] = {
          x,
          y,
          walkable: true,
          trafficDensity: 0,
          gCost: 0,
          hCost: 0,
          fCost: 0
        };
      }
    }
  }

  findPath(request: PathfindingRequest): PathResult {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.pathCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.path;
    }

    const startNode = this.getNode(request.start.x, request.start.y);
    const endNode = this.getNode(request.end.x, request.end.y);

    if (!startNode || !endNode || !endNode.walkable) {
      return {
        path: [],
        distance: 0,
        estimatedTime: 0,
        trafficLevel: 'low',
        roadTypes: [],
        success: false
      };
    }

    const result = aStar(
      this.grid,
      this.gridWidth,
      this.gridHeight,
      startNode,
      endNode,
      request
    );

    this.pathCache.set(cacheKey, { path: result, timestamp: Date.now() });
    return result;
  }

  private getNode(x: number, y: number): PathNode | null {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return null;
    }
    return this.grid[x][y];
  }

  private generateCacheKey(request: PathfindingRequest): string {
    return `${request.start.x},${request.start.y}-${request.end.x},${request.end.y}-${request.entityType}-${request.avoidTraffic}`;
  }

  updateTrafficData(x: number, y: number, density: number): void {
    const node = this.getNode(x, y);
    if (node) {
      node.trafficDensity = Math.max(0, Math.min(1, density));
    }
  }

  setRoadType(x: number, y: number, roadType: RoadType): void {
    const node = this.getNode(x, y);
    if (node) {
      node.roadType = roadType;
      node.walkable = true;
    }
  }

  setWalkable(x: number, y: number, walkable: boolean): void {
    const node = this.getNode(x, y);
    if (node) {
      node.walkable = walkable;
    }
  }

  clearCache(): void {
    this.pathCache.clear();
  }

  getAreaTrafficStats(x1: number, y1: number, x2: number, y2: number): TrafficData {
    let totalDensity = 0;
    let nodeCount = 0;
    let maxDensity = 0;

    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        const node = this.getNode(x, y);
        if (node && node.walkable) {
          totalDensity += node.trafficDensity;
          maxDensity = Math.max(maxDensity, node.trafficDensity);
          nodeCount++;
        }
      }
    }

    const avgDensity = nodeCount > 0 ? totalDensity / nodeCount : 0;
    const speed = Math.max(0.1, 1 - avgDensity * 0.8);

    let congestionLevel: TrafficData['congestionLevel'] = 'none';
    if (avgDensity > 0.8) congestionLevel = 'gridlock';
    else if (avgDensity > 0.6) congestionLevel = 'heavy';
    else if (avgDensity > 0.4) congestionLevel = 'moderate';
    else if (avgDensity > 0.2) congestionLevel = 'light';

    return {
      density: avgDensity,
      speed,
      congestionLevel,
      averageWaitTime: avgDensity * 30
    };
  }
}

export const pathfindingSystem = new AdvancedPathfinding(200, 200); // Adjust size as needed
