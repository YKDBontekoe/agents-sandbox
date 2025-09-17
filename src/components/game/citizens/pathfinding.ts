import { MinHeap } from "./minHeap";
import { BuildingRef, Citizen, CitizenActivity } from "./types";

const inBounds = (x: number, y: number, tileTypes: string[][]) =>
  y >= 0 && y < tileTypes.length && x >= 0 && x < (tileTypes[y]?.length || 0);

const neighbors = (
  x: number,
  y: number,
  roadSet: Set<string>,
  tileTypes: string[][]
) => {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const out: Array<{ x: number; y: number; cost: number }> = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx,
      ny = y + dy;
    if (!inBounds(nx, ny, tileTypes)) continue;
    const onRoad = roadSet.has(`${nx},${ny}`);
    const cost = onRoad ? 0.6 : 1.0;
    out.push({ x: nx, y: ny, cost });
  }
  return out;
};

export const pathfind = (
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  roadSet: Set<string>,
  tileTypes: string[][]
) => {
  const key = (x: number, y: number) => `${x},${y}`;
  const dist = new Map<string, number>();
  const prev = new Map<string, { x: number; y: number }>();
  const heap = new MinHeap<{
    x: number;
    y: number;
    g: number;
    f: number;
  }>((a, b) => a.f - b.f);
  const startKey = key(sx, sy);
  dist.set(startKey, 0);
  heap.push({ x: sx, y: sy, g: 0, f: Math.abs(tx - sx) + Math.abs(ty - sy) });

  const h = (x: number, y: number) => Math.abs(tx - x) + Math.abs(ty - y);

  while (!heap.isEmpty()) {
    const cur = heap.pop()!;
    const curKey = key(cur.x, cur.y);
    if (cur.g > (dist.get(curKey) ?? Infinity)) continue;
    if (cur.x === tx && cur.y === ty) break;
    for (const n of neighbors(cur.x, cur.y, roadSet, tileTypes)) {
      const tentativeG = cur.g + n.cost;
      const neighborKey = key(n.x, n.y);
      if (tentativeG < (dist.get(neighborKey) ?? Infinity)) {
        dist.set(neighborKey, tentativeG);
        prev.set(neighborKey, { x: cur.x, y: cur.y });
        heap.push({
          x: n.x,
          y: n.y,
          g: tentativeG,
          f: tentativeG + h(n.x, n.y),
        });
      }
    }
  }

  const out: Array<{ x: number; y: number }> = [];
  let cx = tx,
    cy = ty;
  let k = key(cx, cy);
  if (!prev.has(k) && !(sx === tx && sy === ty)) return out;
  out.push({ x: cx, y: cy });
  while (prev.has(k)) {
    const p = prev.get(k)!;
    out.push({ x: p.x, y: p.y });
    cx = p.x;
    cy = p.y;
    k = key(cx, cy);
    if (cx === sx && cy === sy) break;
  }
  out.reverse();
  return out;
};

export const setPathTo = (
  c: Citizen,
  tx: number,
  ty: number,
  roadSet: Set<string>,
  tileTypes: string[][]
) => {
  c.tx = tx;
  c.ty = ty;
  c.path = pathfind(c.x, c.y, tx, ty, roadSet, tileTypes);
};

export const updateActivityForHour = (
  c: Citizen,
  hour: number,
  setPath: (c: Citizen, tx: number, ty: number) => void
) => {
  let desired: CitizenActivity;
  if (hour >= 5 && hour < 7) desired = "CommuteToWork";
  else if (hour >= 7 && hour < 16) desired = "Work";
  else if (hour >= 16 && hour < 18) desired = "CommuteToShop";
  else if (hour >= 18 && hour < 20) desired = "Shop";
  else if (hour >= 20 && hour < 22) desired = "CommuteHome";
  else desired = "Sleep";

  if (c.activity !== desired) {
    c.activity = desired;
    c.wanderCooldown = 0;
    if (desired === "CommuteToWork" || desired === "Work") {
      setPath(c, c.workX, c.workY);
    } else if (desired === "CommuteToShop" || desired === "Shop") {
      setPath(c, c.shopX, c.shopY);
    } else if (desired === "CommuteHome" || desired === "Sleep") {
      setPath(c, c.homeX, c.homeY);
      if (desired === "Sleep") c.carrying = null;
    }
  }
};

export const stepAlong = (
  c: Citizen,
  dt: number,
  roadSet: Set<string>,
  tileTypes: string[][],
  toWorld: (gx: number, gy: number) => { worldX: number; worldY: number },
  storehouses: BuildingRef[],
  producers: BuildingRef[],
  rand: () => number
) => {
  if (!c.path.length) return;
  const next = c.path[0];
  const { worldX, worldY } = toWorld(next.x, next.y);
  const curX = c.x;
  const curY = c.y;
  const onRoad = roadSet.has(`${next.x},${next.y}`);
  const sp = (onRoad ? 1.8 : 1.0) * (c.speed * dt);
  const dx = next.x - curX;
  const dy = next.y - curY;
  const dist = Math.hypot(dx, dy);

  const dtSec = dt / 60;
  const nextWorldDist = Math.hypot(worldX - toWorld(curX, curY).worldX, worldY - toWorld(curX, curY).worldY);
  if (nextWorldDist < c.lastDist - 0.5) {
    c.lastDist = nextWorldDist;
    c.stuckFor = 0;
  } else {
    c.stuckFor += dtSec;
  }

  if (c.stuckFor > 1.2 && c.repathCooldown <= 0) {
    c.repathCooldown = 2.0;
    const prevPathLen = c.path.length;
    c.path = pathfind(c.x, c.y, c.tx, c.ty, roadSet, tileTypes);
    if (!c.path.length || c.path.length >= prevPathLen) {
      const neigh = neighbors(c.x, c.y, roadSet, tileTypes).map((n) => ({ x: n.x, y: n.y }));
      if (neigh.length) {
        const choice = neigh[Math.floor(rand() * neigh.length)];
        c.tx = choice.x;
        c.ty = choice.y;
        c.path = pathfind(c.x, c.y, c.tx, c.ty, roadSet, tileTypes);
      }
    }
    c.lastDist = Infinity;
    c.stuckFor = 0;
    return;
  }

  if (dist < sp) {
    c.x = next.x;
    c.y = next.y;
    c.path.shift();
    c.baseWorldY = worldY - 4;
    c.lastDist = Infinity;
    c.stuckFor = 0;
    if (!c.path.length) {
      if (c.activity === "Work") {
        const hereIsWork = c.x === c.workX && c.y === c.workY;
        const hereIsStore = !!storehouses.find((s) => s.x === c.x && s.y === c.y);
        if (!c.carrying && hereIsWork) {
          const here = producers.find((p) => p.x === c.x && p.y === c.y);
          if (here) {
            if (here.typeId === "farm") c.carrying = "grain";
            else if (here.typeId === "lumber_camp") c.carrying = "wood";
            else if (here.typeId === "sawmill") c.carrying = "planks";
          }
        }
        if (c.carrying) {
          if (hereIsStore) {
            const k = c.carrying as "wood" | "planks" | "grain";
            c.delivered = k;
            c.carrying = null;
            setPathTo(c, c.workX, c.workY, roadSet, tileTypes);
          } else {
            const st = storehouses[0] || { x: c.workX, y: c.workY };
            setPathTo(c, st.x, st.y, roadSet, tileTypes);
          }
        } else {
          setPathTo(c, c.workX, c.workY, roadSet, tileTypes);
        }
      } else if (c.activity === "Shop") {
        if (c.wanderCooldown <= 0) {
          const wx =
            c.shopX + (rand() < 0.5 ? 0 : rand() < 0.5 ? 1 : -1);
          const wy =
            c.shopY + (rand() < 0.5 ? 0 : rand() < 0.5 ? 1 : -1);
          if (inBounds(wx, wy, tileTypes)) setPathTo(c, wx, wy, roadSet, tileTypes);
          else setPathTo(c, c.shopX, c.shopY, roadSet, tileTypes);
          c.wanderCooldown = 2 + rand() * 3;
        }
      }
    }
  } else {
    c.x += (dx / dist) * sp;
    c.y += (dy / dist) * sp;
  }
};

