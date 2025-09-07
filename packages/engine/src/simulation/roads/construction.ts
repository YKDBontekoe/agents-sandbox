import type { RoadType } from '../pathfinding';
import type { RoadBlueprint, RoadConstructionCost } from './types';

export function calculateRoadPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];

  // Bresenham's line algorithm
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;

  let x = start.x;
  let y = start.y;

  while (true) {
    path.push({ x, y });

    if (x === end.x && y === end.y) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return path;
}

export function calculateConstructionCost(
  type: RoadType,
  start: { x: number; y: number },
  end: { x: number; y: number }
): RoadConstructionCost {
  const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

  const baseCosts = {
    pedestrian: { money: 100, time: 0.5, maintenance: 5 },
    residential: { money: 500, time: 2, maintenance: 20 },
    commercial: { money: 800, time: 3, maintenance: 35 },
    highway: { money: 2000, time: 8, maintenance: 100 },
    intersection: { money: 1500, time: 4, maintenance: 50 }
  } as const;

  const base = baseCosts[type];

  return {
    money: Math.round(base.money * distance),
    time: Math.round(base.time * distance),
    maintenance: Math.round(base.maintenance * distance)
  };
}

export function validateRoadPlacement(
  blueprint: RoadBlueprint,
  roadGrid: (string | null)[][],
  gridWidth: number,
  gridHeight: number
): void {
  const { start, end, type, path } = blueprint;

  // Check if coordinates are within bounds
  if (
    start.x < 0 ||
    start.x >= gridWidth ||
    start.y < 0 ||
    start.y >= gridHeight ||
    end.x < 0 ||
    end.x >= gridWidth ||
    end.y < 0 ||
    end.y >= gridHeight
  ) {
    blueprint.valid = false;
    blueprint.conflicts.push('Road extends outside city boundaries');
    return;
  }

  // Check for existing roads along the path
  for (const point of path) {
    const existingRoad = roadGrid[point.x][point.y];
    if (existingRoad && type !== 'intersection') {
      blueprint.conflicts.push(`Conflicts with existing road at (${point.x}, ${point.y})`);
    }
  }

  // Check minimum road length
  const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  if (distance < 2) {
    blueprint.valid = false;
    blueprint.conflicts.push('Road too short (minimum 2 tiles)');
  }

  // Check maximum road length for certain types
  if (type === 'residential' && distance > 20) {
    blueprint.conflicts.push('Residential road too long (maximum 20 tiles)');
  }

  blueprint.valid = blueprint.conflicts.length === 0;
}
