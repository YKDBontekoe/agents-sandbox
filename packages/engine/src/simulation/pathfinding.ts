import type { GameTime } from '../types/gameTime';
import type { SimulatedBuilding } from './buildingSimulation';

// Grid-based pathfinding system
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

// Traffic and congestion management
export interface TrafficData {
  density: number; // 0-1
  speed: number; // 0-1, multiplier for movement speed
  congestionLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'gridlock';
  averageWaitTime: number; // in seconds
}

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

  // A* pathfinding implementation
  findPath(request: PathfindingRequest): PathResult {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.pathCache.get(cacheKey);
    
    // Use cached path if recent and traffic hasn't changed significantly
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

    const openSet: PathNode[] = [startNode];
    const closedSet: Set<PathNode> = new Set();

    startNode.gCost = 0;
    startNode.hCost = this.calculateHeuristic(startNode, endNode);
    startNode.fCost = startNode.gCost + startNode.hCost;

    while (openSet.length > 0) {
      // Find node with lowest fCost
      let currentNode = openSet[0];
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].fCost < currentNode.fCost || 
           (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)) {
          currentNode = openSet[i];
        }
      }

      openSet.splice(openSet.indexOf(currentNode), 1);
      closedSet.add(currentNode);

      // Path found
      if (currentNode === endNode) {
        return this.reconstructPath(startNode, endNode, request.entityType);
      }

      // Check neighbors
      const neighbors = this.getNeighbors(currentNode);
      for (const neighbor of neighbors) {
        if (!neighbor.walkable || closedSet.has(neighbor)) {
          continue;
        }

        // Skip if road type not allowed
        if (request.allowedRoadTypes && neighbor.roadType && 
            !request.allowedRoadTypes.includes(neighbor.roadType)) {
          continue;
        }

        const movementCost = this.calculateMovementCost(currentNode, neighbor, request);
        const tentativeGCost = currentNode.gCost + movementCost;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeGCost >= neighbor.gCost) {
          continue;
        }

        neighbor.parent = currentNode;
        neighbor.gCost = tentativeGCost;
        neighbor.hCost = this.calculateHeuristic(neighbor, endNode);
        neighbor.fCost = neighbor.gCost + neighbor.hCost;
      }
    }

    // No path found
    return {
      path: [],
      distance: 0,
      estimatedTime: 0,
      trafficLevel: 'low',
      roadTypes: [],
      success: false
    };
  }

  private calculateHeuristic(nodeA: PathNode, nodeB: PathNode): number {
    // Manhattan distance with diagonal movement consideration
    const dx = Math.abs(nodeA.x - nodeB.x);
    const dy = Math.abs(nodeA.y - nodeB.y);
    return Math.sqrt(dx * dx + dy * dy) * 10; // Scale for better precision
  }

  private calculateMovementCost(from: PathNode, to: PathNode, request: PathfindingRequest): number {
    let baseCost = 10; // Base movement cost
    
    // Diagonal movement costs more
    if (from.x !== to.x && from.y !== to.y) {
      baseCost = 14;
    }

    // Traffic penalty
    if (request.avoidTraffic) {
      baseCost += to.trafficDensity * 20;
    }

    // Road type modifiers
    if (to.roadType) {
      switch (to.roadType) {
        case 'highway':
          baseCost *= request.entityType === 'vehicle' ? 0.5 : 2.0; // Fast for vehicles, slow for pedestrians
          break;
        case 'pedestrian':
          baseCost *= request.entityType === 'pedestrian' ? 0.8 : 3.0; // Good for pedestrians, bad for vehicles
          break;
        case 'residential':
          baseCost *= 1.0; // Neutral
          break;
        case 'commercial':
          baseCost *= 1.2; // Slightly slower due to activity
          break;
        case 'intersection':
          baseCost *= 1.5; // Intersections are slower
          break;
      }
    }

    return Math.round(baseCost);
  }

  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = [];
    
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x === 0 && y === 0) continue;
        
        const checkX = node.x + x;
        const checkY = node.y + y;
        
        if (checkX >= 0 && checkX < this.gridWidth && 
            checkY >= 0 && checkY < this.gridHeight) {
          neighbors.push(this.grid[checkX][checkY]);
        }
      }
    }
    
    return neighbors;
  }

  private reconstructPath(startNode: PathNode, endNode: PathNode, entityType: string): PathResult {
    const path: Array<{ x: number; y: number }> = [];
    const roadTypes: RoadType[] = [];
    let currentNode: PathNode | undefined = endNode;
    let totalDistance = 0;
    let totalTrafficDensity = 0;
    let nodeCount = 0;

    while (currentNode) {
      path.unshift({ x: currentNode.x, y: currentNode.y });
      if (currentNode.roadType) {
        roadTypes.push(currentNode.roadType);
      }
      totalTrafficDensity += currentNode.trafficDensity;
      nodeCount++;
      
      if (currentNode.parent) {
        const dx = currentNode.x - currentNode.parent.x;
        const dy = currentNode.y - currentNode.parent.y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
      
      currentNode = currentNode.parent;
    }

    const avgTrafficDensity = totalTrafficDensity / nodeCount;
    const trafficLevel: 'low' | 'medium' | 'high' = 
      avgTrafficDensity < 0.3 ? 'low' : 
      avgTrafficDensity < 0.7 ? 'medium' : 'high';

    // Estimate time based on distance, traffic, and entity type
    let baseSpeed = entityType === 'vehicle' ? 30 : 5; // km/h equivalent
    const trafficMultiplier = 1 - (avgTrafficDensity * 0.5);
    const estimatedTime = (totalDistance / baseSpeed) * trafficMultiplier * 60; // Convert to minutes

    return {
      path,
      distance: totalDistance,
      estimatedTime,
      trafficLevel,
      roadTypes: [...new Set(roadTypes)], // Remove duplicates
      success: true
    };
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

  // Update traffic data for dynamic pathfinding
  updateTrafficData(x: number, y: number, density: number): void {
    const node = this.getNode(x, y);
    if (node) {
      node.trafficDensity = Math.max(0, Math.min(1, density));
    }
  }

  // Set road type for a node
  setRoadType(x: number, y: number, roadType: RoadType): void {
    const node = this.getNode(x, y);
    if (node) {
      node.roadType = roadType;
      node.walkable = true; // Roads are walkable
    }
  }

  // Set walkability of a node
  setWalkable(x: number, y: number, walkable: boolean): void {
    const node = this.getNode(x, y);
    if (node) {
      node.walkable = walkable;
    }
  }

  // Clear path cache (call when roads change)
  clearCache(): void {
    this.pathCache.clear();
  }

  // Get traffic statistics for an area
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
      averageWaitTime: avgDensity * 30 // Rough estimate in seconds
    };
  }
}

// Road segment for advanced road network
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

// Moving entity for traffic simulation
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

// Export singleton instance
export const pathfindingSystem = new AdvancedPathfinding(200, 200); // Adjust size as needed