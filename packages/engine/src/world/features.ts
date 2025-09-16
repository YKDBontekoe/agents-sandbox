export interface RiverPoint {
  x: number;
  y: number;
  height: number;
}

export interface RiverPath {
  id: string;
  source: RiverPoint;
  mouth: RiverPoint;
  length: number;
  path: RiverPoint[];
}

export interface CoastPoint {
  x: number;
  y: number;
  type: "land" | "water";
}

export function deriveCoastPoints(isWater: boolean[][], startX: number, startY: number): CoastPoint[] {
  const results: CoastPoint[] = [];
  const height = isWater.length;
  const width = isWater[0]?.length ?? 0;
  const seen = new Set<string>();

  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isWater[y]?.[x]) continue;
      let touchesWater = false;
      for (const [dx, dy] of deltas) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (isWater[ny]?.[nx]) {
          touchesWater = true;
          break;
        }
      }
      if (!touchesWater) continue;
      const worldX = startX + x;
      const worldY = startY + y;
      const key = `${worldX},${worldY}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ x: worldX, y: worldY, type: "land" });
    }
  }

  return results;
}

export function orderRiverComponent(
  component: RiverPoint[],
  heightMap: number[][],
  width: number,
  height: number,
): RiverPoint[] {
  if (component.length <= 2) return component;

  const remaining = new Map<string, RiverPoint>();
  component.forEach((point) => {
    remaining.set(`${point.x},${point.y}`, point);
  });

  let current = component.reduce((highest, point) => (point.height > highest.height ? point : highest));
  const ordered: RiverPoint[] = [current];
  remaining.delete(`${current.x},${current.y}`);

  const neighborOffsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  while (remaining.size > 0) {
    let next: RiverPoint | null = null;
    let lowestHeight = Infinity;
    for (const [dx, dy] of neighborOffsets) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const candidate = remaining.get(`${nx},${ny}`);
      if (candidate && candidate.height < lowestHeight) {
        next = candidate;
        lowestHeight = candidate.height;
      }
    }

    if (!next) {
      let fallback: RiverPoint | null = null;
      remaining.forEach((point) => {
        if (!fallback || point.height < fallback.height) {
          fallback = point;
        }
      });
      if (!fallback) break;
      next = fallback;
    }

    ordered.push(next);
    remaining.delete(`${next.x},${next.y}`);
    current = next;
  }

  return ordered;
}

export function deriveRiverPaths(
  isRiver: boolean[][],
  heightMap: number[][],
  startX: number,
  startY: number,
): RiverPath[] {
  const height = isRiver.length;
  const width = isRiver[0]?.length ?? 0;
  const visited = new Set<string>();
  const rivers: RiverPath[] = [];
  let riverIndex = 0;

  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isRiver[y]?.[x]) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const stack: Array<{ x: number; y: number }> = [{ x, y }];
      const component: RiverPoint[] = [];
      visited.add(key);

      while (stack.length > 0) {
        const { x: cx, y: cy } = stack.pop()!;
        component.push({ x: cx + startX, y: cy + startY, height: heightMap[cy]?.[cx] ?? 0 });

        for (const [dx, dy] of offsets) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (!isRiver[ny]?.[nx]) continue;
          const neighborKey = `${nx},${ny}`;
          if (visited.has(neighborKey)) continue;
          visited.add(neighborKey);
          stack.push({ x: nx, y: ny });
        }
      }

      if (component.length === 0) continue;

      const ordered = orderRiverComponent(
        component.map((point) => ({
          x: point.x - startX,
          y: point.y - startY,
          height: point.height,
        })),
        heightMap,
        width,
        height,
      ).map((point) => ({
        x: point.x + startX,
        y: point.y + startY,
        height: point.height,
      }));

      const source = ordered[0];
      const mouth = ordered[ordered.length - 1];
      rivers.push({
        id: `river-${startX}-${startY}-${riverIndex++}`,
        source,
        mouth,
        length: ordered.length,
        path: ordered,
      });
    }
  }

  return rivers;
}
