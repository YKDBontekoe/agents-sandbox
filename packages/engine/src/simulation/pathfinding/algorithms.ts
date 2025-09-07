import type { PathNode, PathfindingRequest, PathResult, RoadType } from './types';

export function aStar(
  grid: PathNode[][],
  gridWidth: number,
  gridHeight: number,
  startNode: PathNode,
  endNode: PathNode,
  request: PathfindingRequest
): PathResult {
  const openSet: PathNode[] = [startNode];
  const closedSet: Set<PathNode> = new Set();

  startNode.gCost = 0;
  startNode.hCost = calculateHeuristic(startNode, endNode);
  startNode.fCost = startNode.gCost + startNode.hCost;

  while (openSet.length > 0) {
    let currentNode = openSet[0];
    for (let i = 1; i < openSet.length; i++) {
      if (
        openSet[i].fCost < currentNode.fCost ||
        (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)
      ) {
        currentNode = openSet[i];
      }
    }

    openSet.splice(openSet.indexOf(currentNode), 1);
    closedSet.add(currentNode);

    if (currentNode === endNode) {
      return reconstructPath(startNode, endNode, request.entityType);
    }

    const neighbors = getNeighbors(grid, gridWidth, gridHeight, currentNode);
    for (const neighbor of neighbors) {
      if (!neighbor.walkable || closedSet.has(neighbor)) {
        continue;
      }

      if (
        request.allowedRoadTypes &&
        neighbor.roadType &&
        !request.allowedRoadTypes.includes(neighbor.roadType)
      ) {
        continue;
      }

      const movementCost = calculateMovementCost(currentNode, neighbor, request);
      const tentativeGCost = currentNode.gCost + movementCost;

      if (!openSet.includes(neighbor)) {
        openSet.push(neighbor);
      } else if (tentativeGCost >= neighbor.gCost) {
        continue;
      }

      neighbor.parent = currentNode;
      neighbor.gCost = tentativeGCost;
      neighbor.hCost = calculateHeuristic(neighbor, endNode);
      neighbor.fCost = neighbor.gCost + neighbor.hCost;
    }
  }

  return {
    path: [],
    distance: 0,
    estimatedTime: 0,
    trafficLevel: 'low',
    roadTypes: [],
    success: false
  };
}

function calculateHeuristic(nodeA: PathNode, nodeB: PathNode): number {
  const dx = Math.abs(nodeA.x - nodeB.x);
  const dy = Math.abs(nodeA.y - nodeB.y);
  return Math.sqrt(dx * dx + dy * dy) * 10; // Scale for better precision
}

function calculateMovementCost(
  from: PathNode,
  to: PathNode,
  request: PathfindingRequest
): number {
  let baseCost = 10; // Base movement cost

  if (from.x !== to.x && from.y !== to.y) {
    baseCost = 14;
  }

  if (request.avoidTraffic) {
    baseCost += to.trafficDensity * 20;
  }

  if (to.roadType) {
    switch (to.roadType) {
      case 'highway':
        baseCost *= request.entityType === 'vehicle' ? 0.5 : 2.0;
        break;
      case 'pedestrian':
        baseCost *= request.entityType === 'pedestrian' ? 0.8 : 3.0;
        break;
      case 'residential':
        baseCost *= 1.0;
        break;
      case 'commercial':
        baseCost *= 1.2;
        break;
      case 'intersection':
        baseCost *= 1.5;
        break;
    }
  }

  return Math.round(baseCost);
}

function getNeighbors(
  grid: PathNode[][],
  gridWidth: number,
  gridHeight: number,
  node: PathNode
): PathNode[] {
  const neighbors: PathNode[] = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      if (x === 0 && y === 0) continue;

      const checkX = node.x + x;
      const checkY = node.y + y;

      if (checkX >= 0 && checkX < gridWidth && checkY >= 0 && checkY < gridHeight) {
        neighbors.push(grid[checkX][checkY]);
      }
    }
  }

  return neighbors;
}

function reconstructPath(
  startNode: PathNode,
  endNode: PathNode,
  entityType: string
): PathResult {
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
    avgTrafficDensity < 0.3 ? 'low' : avgTrafficDensity < 0.7 ? 'medium' : 'high';

  const baseSpeed = entityType === 'vehicle' ? 30 : 5;
  const trafficMultiplier = 1 - avgTrafficDensity * 0.5;
  const estimatedTime = (totalDistance / baseSpeed) * trafficMultiplier * 60;

  return {
    path,
    distance: totalDistance,
    estimatedTime,
    trafficLevel,
    roadTypes: [...new Set(roadTypes)],
    success: true
  };
}
