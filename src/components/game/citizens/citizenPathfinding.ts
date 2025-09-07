import { Road } from './types';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

export function gridToIso(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2)
  };
}

export function generatePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  roads: Road[],
  tileTypes: string[][]
): { x: number; y: number }[] {
  const roadSet = new Set(roads.map(r => `${r.x},${r.y}`));
  const maxX = tileTypes[0]?.length || 20;
  const maxY = tileTypes.length || 20;

  interface PathNode {
    x: number;
    y: number;
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost
    parent?: PathNode;
  }

  const heuristic = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  const getMoveCost = (x: number, y: number) => {
    if (roadSet.has(`${x},${y}`)) return 1;
    if (x >= 0 && x < maxX && y >= 0 && y < maxY) {
      const tileType = tileTypes[y]?.[x];
      if (tileType === 'water') return 10;
      if (tileType === 'mountain') return 8;
      return 3;
    }
    return 5;
  };

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: Math.round(startX),
    y: Math.round(startY),
    g: 0,
    h: heuristic(Math.round(startX), Math.round(startY), Math.round(endX), Math.round(endY)),
    f: 0
  };
  startNode.f = startNode.g + startNode.h;

  openSet.push(startNode);

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

  while (openSet.length > 0) {
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIndex].f) {
        currentIndex = i;
      }
    }

    const current = openSet.splice(currentIndex, 1)[0];
    closedSet.add(`${current.x},${current.y}`);

    if (current.x === Math.round(endX) && current.y === Math.round(endY)) {
      const path: { x: number; y: number }[] = [];
      let node: PathNode | undefined = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    for (const [dx, dy] of directions) {
      const newX = current.x + dx;
      const newY = current.y + dy;
      const key = `${newX},${newY}`;

      if (closedSet.has(key)) continue;

      const moveCost = getMoveCost(newX, newY);
      const g = current.g + moveCost;

      let neighbor = openSet.find(n => n.x === newX && n.y === newY);

      if (!neighbor) {
        neighbor = {
          x: newX,
          y: newY,
          g: g,
          h: heuristic(newX, newY, Math.round(endX), Math.round(endY)),
          f: 0,
          parent: current
        };
        neighbor.f = neighbor.g + neighbor.h;
        openSet.push(neighbor);
      } else if (g < neighbor.g) {
        neighbor.g = g;
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
      }
    }
  }

  const path: { x: number; y: number }[] = [];
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));

  for (let i = 0; i <= steps; i++) {
    const progress = steps > 0 ? i / steps : 0;
    const x = Math.round(startX + (endX - startX) * progress);
    const y = Math.round(startY + (endY - startY) * progress);
    path.push({ x, y });
  }

  return path;
}
