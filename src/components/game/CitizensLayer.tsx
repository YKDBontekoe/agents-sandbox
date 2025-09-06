"use client";

import { useEffect, useMemo, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

interface BuildingRef { id: string; typeId: string; x: number; y: number; workers?: number }
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
  // Optional: length of a full in-game day in real seconds (compressed clock)
  dayLengthSeconds?: number;
}

type CitizenActivity = 'CommuteToWork' | 'Work' | 'CommuteToShop' | 'Shop' | 'CommuteHome' | 'Sleep';

type Citizen = {
  x: number; y: number; // grid coordinates
  tx: number; ty: number; // current target grid
  path: Array<{x:number;y:number}>;
  carrying: string | null; // resource name or null
  sprite: PIXI.Graphics;
  speed: number;
  name: string;
  role: 'Hauler' | 'Builder';
  // Daily-cycle routing
  homeX: number; homeY: number;
  workX: number; workY: number; workId?: string;
  shopX: number; shopY: number;
  activity: CitizenActivity;
  nextDecisionHour: number; // to avoid repeated transitions within same window
  baseWorldY: number; // stable Y for bobbing
  wanderCooldown: number; // seconds remaining before next wander selection
  // Stuck detection & smoothing helpers
  lastDist: number; // last world-space distance to next waypoint
  stuckFor: number; // seconds accumulated without progress
  repathCooldown: number; // seconds until next allowed repath
}

export default function CitizensLayer({ buildings, roads, tileTypes, onProposeRoads, citizensCount, seed, tileWidth = 64, tileHeight = 32, dayLengthSeconds = 60 }: CitizensLayerProps) {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const citizensRef = useRef<Citizen[]>([]);
  const carriedRef = useRef<{ wood: number; planks: number; grain: number }>({ wood: 0, planks: 0, grain: 0 });
  const roadSet = useMemo(() => new Set(roads.map(r => `${r.x},${r.y}`)), [JSON.stringify(roads)]);

  const toWorld = (gx: number, gy: number) => gridToWorld(gx, gy, tileWidth, tileHeight);

  const houses = useMemo(() => buildings.filter(b => b.typeId === 'house'), [JSON.stringify(buildings)]);
  const storehouses = useMemo(() => buildings.filter(b => b.typeId === 'storehouse'), [JSON.stringify(buildings)]);
  const producers = useMemo(() => buildings.filter(b => ['farm','lumber_camp','sawmill','trade_post','automation_workshop','shrine'].includes(b.typeId)), [JSON.stringify(buildings)]);
  const leisureSpots = useMemo(() => buildings.filter(b => ['trade_post','shrine','council_hall'].includes(b.typeId)), [JSON.stringify(buildings)]);
  const producerWeights = useMemo(() => {
    const map = new Map<string, number>();
    producers.forEach(p => {
      // Weight by assigned workers + small base so idle sites still get visits
      const w = 0.5 + Math.max(0, (p as any).workers || 0);
      map.set(p.id, w);
    });
    return map;
  }, [JSON.stringify(producers)]);

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

  // Compressed day clock (seconds accumulate and wrap at dayLengthSeconds)
  const dayClockRef = useRef<number>(0);

  useEffect(() => {
    if (!app || !viewport) return;
    const container = new PIXI.Container();
    container.name = 'citizens-layer';
    container.sortableChildren = true;
    container.zIndex = 550; // above buildings for visibility
    viewport.addChild(container);
    containerRef.current = container;

    // spawn a small citizen pool based on houses (cap at 20)
    const rngSeed = Math.abs(Number(seed ?? 1337)) % 2147483647 || 1337;
    let rng = rngSeed;
    const rand = () => (rng = (rng * 48271) % 2147483647) / 2147483647;
    const count = Math.min(20, Math.max(2, Math.floor(citizensCount ?? (houses.length * 2 || 6))));
    const globalHome = houses[0] || storehouses[0] || producers[0] || { x: 10, y: 10 } as any;
    const names = ['Ava','Bran','Caro','Dane','Eira','Finn','Gale','Hale','Iris','Joss','Kade','Lena','Milo','Nora','Oren','Pia','Quin','Rhea','Seth','Tara'];

    const chooseWeightedProducer = () => {
      if (producers.length === 0) return globalHome;
      const total = producers.reduce((s,p)=> s + (producerWeights.get(p.id) || 1), 0);
      let r = rand() * (total || 1);
      for (const p of producers) {
        r -= (producerWeights.get(p.id) || 1);
        if (r <= 0) return p;
      }
      return producers[0];
    };

    const chooseLeisure = () => leisureSpots[0] || producers.find(p=>p.typeId==='trade_post') || globalHome;

    for (let i=0;i<count;i++) {
      const home = houses[i % Math.max(1, houses.length)] || globalHome;
      const work = chooseWeightedProducer();
      const shop = chooseLeisure();
      const s = new PIXI.Graphics();
      s.zIndex = 555;
      s.beginFill(0x1d4ed8, 0.95);
      s.drawCircle(0, 0, 2.2);
      s.endFill();
      const { worldX, worldY } = toWorld(home.x, home.y);
      s.position.set(worldX + (rand()-0.5)*2, worldY - 4 + (rand()-0.5)*2);
      container.addChild(s);
      const name = names[Math.floor(rand()*names.length)] + '-' + Math.floor(10+rand()*89);
      citizensRef.current.push({
        x: home.x, y: home.y, tx: home.x, ty: home.y, path: [], carrying: null,
        sprite: s, speed: 0.014 + rand()*0.012, name, role: 'Hauler',
        homeX: home.x, homeY: home.y,
        workX: work.x, workY: work.y, workId: work.id,
        shopX: shop.x, shopY: shop.y,
        activity: 'Sleep', nextDecisionHour: -1, baseWorldY: worldY - 4, wanderCooldown: 0,
        // smoothing & stuck detection init
        lastDist: Infinity, stuckFor: 0, repathCooldown: 0,
      });
    }

    const setPathTo = (c: Citizen, tx: number, ty: number) => {
      c.tx = tx; c.ty = ty;
      c.path = pathfind(c.x, c.y, tx, ty);
    };

    const updateActivityForHour = (c: Citizen, hour: number) => {
      // Define simple schedule windows
      // 05-07 commute to work, 07-16 work, 16-18 commute to shop, 18-20 shop, 20-22 commute home, 22-05 sleep
      let desired: CitizenActivity;
      if (hour >= 5 && hour < 7) desired = 'CommuteToWork';
      else if (hour >= 7 && hour < 16) desired = 'Work';
      else if (hour >= 16 && hour < 18) desired = 'CommuteToShop';
      else if (hour >= 18 && hour < 20) desired = 'Shop';
      else if (hour >= 20 && hour < 22) desired = 'CommuteHome';
      else desired = 'Sleep';

      if (c.activity !== desired) {
        c.activity = desired;
        c.wanderCooldown = 0;
        if (desired === 'CommuteToWork' || desired === 'Work') {
          setPathTo(c, c.workX, c.workY);
        } else if (desired === 'CommuteToShop' || desired === 'Shop') {
          setPathTo(c, c.shopX, c.shopY);
        } else if (desired === 'CommuteHome' || desired === 'Sleep') {
          setPathTo(c, c.homeX, c.homeY);
          if (desired === 'Sleep') c.carrying = null; // drop carried items when day ends
        }
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
      const dx = worldX - cur.x, dy = (worldY - 4) - cur.y;
      const dist = Math.hypot(dx, dy);

      // progress tracking for stuck detection (dt is ~frames, convert to seconds)
      const dtSec = dt / 60; // since dt ~ 1 at 60fps
      if (dist < c.lastDist - 0.5) {
        c.lastDist = dist;
        c.stuckFor = 0;
      } else {
        c.stuckFor += dtSec;
      }

      // If not making progress for a while, try to repath or wander to unstick
      if (c.stuckFor > 1.2 && c.repathCooldown <= 0) {
        c.repathCooldown = 2.0; // avoid thrashing
        const prevPathLen = c.path.length;
        // Attempt to repath to current target
        c.path = pathfind(c.x, c.y, c.tx, c.ty);
        if (!c.path.length || c.path.length >= prevPathLen) {
          // fallback: pick a nearby tile to wander to
          const neigh = neighbors(c.x, c.y).map(n => ({ x: n.x, y: n.y }));
          if (neigh.length) {
            const choice = neigh[Math.floor(Math.random() * neigh.length)];
            c.tx = choice.x; c.ty = choice.y;
            c.path = pathfind(c.x, c.y, c.tx, c.ty);
          }
        }
        // reset progress tracking and skip moving this tick
        c.lastDist = Infinity;
        c.stuckFor = 0;
        return;
      }

      if (dist < 1.5) {
        // arrived at next tile
        c.x = next.x; c.y = next.y;
        c.path.shift();
        c.sprite.position.set(worldX, worldY - 4);
        c.baseWorldY = worldY - 4;
        // reset progress metrics on waypoint arrival
        c.lastDist = Infinity; c.stuckFor = 0;
        if (!c.path.length) {
          // reached destination - activity-specific behavior
          if (c.activity === 'Work') {
            // Work loop: shuttle between workplace and nearest storehouse
            const hereIsWork = (c.x===c.workX && c.y===c.workY);
            const hereIsStore = !!storehouses.find(s=>s.x===c.x && s.y===c.y);
            if (!c.carrying && hereIsWork) {
              // pick what producer provides
              const here = producers.find(p => p.x===c.x && p.y===c.y);
              if (here) {
                if (here.typeId === 'farm') c.carrying = 'grain';
                else if (here.typeId === 'lumber_camp') c.carrying = 'wood';
                else if (here.typeId === 'sawmill') c.carrying = 'planks';
              }
            }
            if (c.carrying) {
              if (hereIsStore) {
                // drop at storehouse
                const k = c.carrying as 'wood'|'planks'|'grain';
                carriedRef.current[k] = (carriedRef.current[k]||0) + 1;
                c.carrying = null;
                setPathTo(c, c.workX, c.workY);
              } else {
                const st = storehouses[0] || { x: c.workX, y: c.workY };
                setPathTo(c, st.x, st.y);
              }
            } else {
              // not carrying: ensure we are heading back to work
              setPathTo(c, c.workX, c.workY);
            }
          } else if (c.activity === 'Shop') {
            // Wander slightly around shop tile occasionally
            if (c.wanderCooldown <= 0) {
              const wx = c.shopX + (Math.random() < 0.5 ? 0 : (Math.random()<0.5?1:-1));
              const wy = c.shopY + (Math.random() < 0.5 ? 0 : (Math.random()<0.5?1:-1));
              if (inBounds(wx, wy)) setPathTo(c, wx, wy); else setPathTo(c, c.shopX, c.shopY);
              c.wanderCooldown = 2 + Math.random()*3; // seconds
            }
          } else if (c.activity === 'Sleep') {
            // Stay at home, minor reposition handled by bobbing only
          }
        }
      } else {
        // movement easing near target to smooth arrival
        const stepPixels = sp * 64;
        const arriveRadius = 10; // pixels
        const easeScale = dist < arriveRadius ? Math.max(0.25, dist / arriveRadius) : 1.0;
        const step = stepPixels * easeScale;
        const nx = cur.x + (dx/dist) * step;
        const ny = cur.y + (dy/dist) * step;
        c.sprite.position.set(nx, ny);
      }
    };

    const tick = (ticker: PIXI.Ticker) => {
      const dtMs = ticker.deltaMS;
      const dt = dtMs / 16.6667; // normalize to ~60fps steps

      // advance compressed day clock
      dayClockRef.current = (dayClockRef.current + dtMs / 1000) % Math.max(1, dayLengthSeconds);
      const hourOfDay = (dayClockRef.current / Math.max(1, dayLengthSeconds)) * 24.0;

      citizensRef.current.forEach(c => {
        // schedule transitions
        const hourBucket = Math.floor(hourOfDay * 2) / 2; // 30-minute buckets to reduce thrash
        if (c.nextDecisionHour !== hourBucket) {
          c.nextDecisionHour = hourBucket;
          updateActivityForHour(c, hourOfDay);
        }

        // state-driven tint (override with carrying colors if any)
        const g = c.sprite as any;
        let tint = 0xffffff;
        switch (c.activity) {
          case 'CommuteToWork': tint = 0x60a5fa; break; // blue
          case 'Work': tint = 0x34d399; break; // green
          case 'CommuteToShop': tint = 0xf472b6; break; // pink
          case 'Shop': tint = 0xf59e0b; break; // amber
          case 'CommuteHome': tint = 0xa78bfa; break; // purple
          case 'Sleep': tint = 0x94a3b8; break; // slate
        }
        if (c.carrying === 'grain') g.tint = 0x22c55e; else if (c.carrying === 'wood') g.tint = 0xb45309; else if (c.carrying === 'planks') g.tint = 0xf59e0b; else g.tint = tint;

        // handle wander cooldown countdown
        if (c.wanderCooldown > 0) c.wanderCooldown -= dtMs / 1000;
        if (c.repathCooldown > 0) c.repathCooldown -= dtMs / 1000;

        if (!c.path.length) {
          // If idle due to path failure, nudge towards current activity target
          if (c.activity === 'Work') setPathTo(c, c.workX, c.workY);
          else if (c.activity === 'Shop') setPathTo(c, c.shopX, c.shopY);
          else if (c.activity === 'Sleep') setPathTo(c, c.homeX, c.homeY);
        }

        // sine bobbing around baseWorldY without drift
        const off = Math.sin(performance.now()/240 + c.x*7 + c.y*11) * 0.2;
        c.sprite.y = c.baseWorldY + off;

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
  }, [app, viewport, JSON.stringify(buildings), JSON.stringify(roads), tileWidth, tileHeight, dayLengthSeconds]);

  return null;
}

export type { CitizensLayerProps };
