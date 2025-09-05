"use client";

import { useEffect, useMemo, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

interface BuildingRef { id: string; typeId: string; x: number; y: number }
interface RoadTile { x: number; y: number }

interface CitizensLayerProps {
  buildings: BuildingRef[];
  roads: RoadTile[];
  tileTypes: string[][];
  onProposeRoads: (tiles: RoadTile[]) => void;
  citizensCount?: number;
  seed?: number;
  tileWidth?: number;
  tileHeight?: number;
}

type Citizen = {
  x: number; y: number; // grid coordinates
  tx: number; ty: number; // current target grid
  path: Array<{x:number;y:number}>;
  carrying: string | null; // resource name or null
  sprite: PIXI.Graphics;
  speed: number;
  name: string;
  role: 'Hauler' | 'Builder';
}

export default function CitizensLayer({ buildings, roads, tileTypes, onProposeRoads, citizensCount, seed, tileWidth = 64, tileHeight = 32 }: CitizensLayerProps) {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const citizensRef = useRef<Citizen[]>([]);
  const carriedRef = useRef<{ wood: number; planks: number; grain: number }>({ wood: 0, planks: 0, grain: 0 });
  const roadSet = useMemo(() => new Set(roads.map(r => `${r.x},${r.y}`)), [JSON.stringify(roads)]);

  const toWorld = (gx: number, gy: number) => gridToWorld(gx, gy, tileWidth, tileHeight);

  const houses = useMemo(() => buildings.filter(b => b.typeId === 'house'), [JSON.stringify(buildings)]);
  const storehouses = useMemo(() => buildings.filter(b => b.typeId === 'storehouse'), [JSON.stringify(buildings)]);
  const producers = useMemo(() => buildings.filter(b => ['farm','lumber_camp','sawmill','trade_post','automation_workshop','shrine'].includes(b.typeId)), [JSON.stringify(buildings)]);

  const inBounds = (x:number,y:number) => y>=0 && y<tileTypes.length && x>=0 && x<(tileTypes[y]?.length||0);

  const neighbors = (x:number, y:number) => {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const out: Array<{x:number;y:number;cost:number}> = [];
    for (const [dx,dy] of dirs) {
      const nx = x+dx, ny=y+dy;
      if (!inBounds(nx,ny)) continue;
      const onRoad = roadSet.has(`${nx},${ny}`);
      const cost = onRoad ? 0.6 : 1.0; // roads are faster
      out.push({x:nx,y:ny,cost});
    }
    return out;
  };

  const pathfind = (sx:number, sy:number, tx:number, ty:number) => {
    // simple Dijkstra/greedy hybrid; OK for short paths on 20x20 grid
    const key = (x:number,y:number)=>`${x},${y}`;
    const dist = new Map<string,number>();
    const prev = new Map<string,{x:number;y:number}>();
    const pq: Array<{x:number;y:number;d:number}> = [{x:sx,y:sy,d:0}];
    dist.set(key(sx,sy),0);
    while (pq.length) {
      pq.sort((a,b)=>a.d-b.d);
      const cur = pq.shift()!;
      if (cur.x===tx && cur.y===ty) break;
      for (const n of neighbors(cur.x, cur.y)) {
        const nd = cur.d + n.cost;
        const k = key(n.x,n.y);
        if (nd < (dist.get(k) ?? Infinity)) {
          dist.set(k, nd);
          prev.set(k, {x:cur.x,y:cur.y});
          pq.push({x:n.x,y:n.y,d:nd});
        }
      }
    }
    const out: Array<{x:number;y:number}> = [];
    let cx = tx, cy = ty;
    let k = key(cx,cy);
    if (!prev.has(k) && !(sx===tx&&sy===ty)) return out;
    out.push({x:cx,y:cy});
    while (prev.has(k)) {
      const p = prev.get(k)!;
      out.push({x:p.x,y:p.y});
      cx=p.x; cy=p.y; k=key(cx,cy);
      if (cx===sx && cy===sy) break;
    }
    out.reverse();
    return out;
  };

  useEffect(() => {
    if (!app || !viewport) return;
    const container = new PIXI.Container();
    container.name = 'citizens-layer';
    container.sortableChildren = true;
    container.zIndex = 550; // above buildings for visibility
    viewport.addChild(container);
    containerRef.current = container;

    // spawn a small citizen pool based on houses (cap at 12)
    const rngSeed = Math.abs(Number(seed ?? 1337)) % 2147483647 || 1337;
    let rng = rngSeed;
    const rand = () => (rng = (rng * 48271) % 2147483647) / 2147483647;
    const count = Math.min(20, Math.max(2, Math.floor(citizensCount ?? (houses.length * 2 || 6))));
    const home = houses[0] || storehouses[0] || producers[0];
    const names = ['Ava','Bran','Caro','Dane','Eira','Finn','Gale','Hale','Iris','Joss','Kade','Lena','Milo','Nora','Oren','Pia','Quin','Rhea','Seth','Tara'];
    for (let i=0;i<count;i++) {
      const start = home || { x: 10, y: 10 } as any;
      const s = new PIXI.Graphics();
      s.zIndex = 555;
      s.beginFill(0x1d4ed8, 0.95);
      s.drawCircle(0, 0, 2.2);
      s.endFill();
      const { worldX, worldY } = toWorld(start.x, start.y);
      s.position.set(worldX + (rand()-0.5)*2, worldY - 4 + (rand()-0.5)*2);
      container.addChild(s);
      const name = names[Math.floor(rand()*names.length)] + '-' + Math.floor(10+rand()*89);
      citizensRef.current.push({ x: start.x, y: start.y, tx: start.x, ty: start.y, path: [], carrying: null, sprite: s, speed: 0.014 + rand()*0.012, name, role: 'Hauler' });
    }

    const chooseTask = (c: Citizen) => {
      // target a producer then a storehouse, alternate
      if (!c.carrying) {
        const target = producers[Math.floor(Math.random() * Math.max(1, producers.length))] || home;
        c.tx = target.x; c.ty = target.y;
        c.path = pathfind(c.x, c.y, c.tx, c.ty);
      } else {
        const st = storehouses[0] || home;
        c.tx = st.x; c.ty = st.y;
        c.path = pathfind(c.x, c.y, c.tx, c.ty);
      }
    };

    const stepAlong = (c: Citizen, dt: number) => {
      if (!c.path.length) return;
      const next = c.path[0];
      const { worldX, worldY } = toWorld(next.x, next.y);
      const cur = c.sprite.position;
      // compute movement in world space, speed bonus on road
      const onRoad = roadSet.has(`${next.x},${next.y}`);
      const sp = (onRoad ? 1.8 : 1.0) * (c.speed * dt);
      const dx = worldX - cur.x, dy = worldY - (cur.y+4);
      const dist = Math.hypot(dx, dy);
      if (dist < 1.5) {
        // arrived at next tile
        c.x = next.x; c.y = next.y;
        c.path.shift();
        c.sprite.position.set(worldX, worldY - 4);
        if (!c.path.length) {
          // reached destination
          if (!c.carrying) {
            // pick what producer provides
            const here = producers.find(p => p.x===c.x && p.y===c.y);
            if (here) {
              if (here.typeId === 'farm') c.carrying = 'grain';
              else if (here.typeId === 'lumber_camp') c.carrying = 'wood';
              else if (here.typeId === 'sawmill') c.carrying = 'planks';
            }
          } else {
            // drop at storehouse
            const st = storehouses.find(s=>s.x===c.x&&s.y===c.y);
            if (st) {
              carriedRef.current[c.carrying as 'wood'|'planks'|'grain'] = (carriedRef.current[c.carrying as 'wood'|'planks'|'grain']||0) + 1;
              c.carrying = null;
            }
          }
          chooseTask(c);
        }
      } else {
        const nx = cur.x + (dx/dist) * sp * 64; // scale to tile size
        const ny = cur.y + (dy/dist) * sp * 64;
        c.sprite.position.set(nx, ny);
      }
    };

    const tick = (ticker: PIXI.Ticker) => {
      const dt = ticker.deltaMS / 16.6667; // normalize to ~60fps steps
      citizensRef.current.forEach(c => {
        // visual hint when carrying
        const g = c.sprite as any;
        if (c.carrying === 'grain') g.tint = 0x22c55e; else if (c.carrying === 'wood') g.tint = 0xb45309; else if (c.carrying === 'planks') g.tint = 0xf59e0b; else g.tint = 0xffffff;
        if (!c.path.length) {
          // assign task if idle
          const st = storehouses[0] || home;
          if (!st || producers.length===0) return;
          const firstTarget = c.carrying ? st : producers[Math.floor(Math.random()*producers.length)];
          c.tx = firstTarget.x; c.ty = firstTarget.y;
          c.path = pathfind(c.x, c.y, c.tx, c.ty);
        }
        // slight bobbing for life-like motion
        const off = Math.sin(performance.now()/240 + c.x*7 + c.y*11) * 0.2;
        c.sprite.y += off;
        stepAlong(c, dt);
      });

      // simple dynamic road trigger: when enough wood/planks carried, pave a path
      const carried = carriedRef.current;
      if ((carried.wood >= 10 && carried.planks >= 10) || (carried.planks >= 20)) {
        const st = storehouses[0];
        const target = producers.find(p=>p.typeId==='farm') || producers[0];
        if (st && target) {
          const tiles = pathfind(st.x, st.y, target.x, target.y);
          if (tiles.length) {
            // choose a thinned set to avoid overdraw: every other tile
            const newRoads = tiles.filter((_,i)=> i%2===0).map(t=>({x:t.x,y:t.y}));
            onProposeRoads(newRoads);
            carriedRef.current = { wood: 0, planks: 0, grain: 0 };
          }
        }
      }
    };

    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
      citizensRef.current.forEach(c=>{ if (c.sprite.parent) c.sprite.parent.removeChild(c.sprite); c.sprite.destroy(); });
      citizensRef.current = [];
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
    };
  }, [app, viewport, JSON.stringify(buildings), JSON.stringify(roads), tileWidth, tileHeight]);

  return null;
}

export type { CitizensLayerProps };
