import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ICONS, COLORS, type ResourceType } from '../../lib/resources';

export type { ResourceType } from '../../lib/resources';

export function getResourceIcon(resource: ResourceType): IconDefinition {
  return ICONS[resource];
}

export function getResourceColor(resource: ResourceType): string {
  return COLORS[resource];
}

// Simulation resource helpers
export type SimResourceKey = 'grain' | 'coin' | 'mana' | 'favor' | 'workers' | 'wood' | 'planks';

export interface SimResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  workers: number;
  wood: number;
  planks: number;
}

export interface SimBuildingDef {
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
  /** Maximum number of workers that can staff this building */
  workCapacity?: number;
}

export interface ApplyProductionResult {
  updated: SimResources;
  shortages: Partial<SimResources>;
}

export interface ProductionModifiers {
  resourceOutputMultiplier?: Partial<Record<SimResourceKey, number>>;
  buildingOutputMultiplier?: Partial<Record<string, number>>; // by building typeId
  upkeepGrainPerWorkerDelta?: number; // adds to per-worker upkeep (can be negative)
}

export function applyProduction(
  resources: SimResources,
  buildings: Array<{ typeId: string; workers?: number }>,
  catalog: Record<string, SimBuildingDef>
): ApplyProductionResult {
  const next: SimResources = { ...resources };
  const shortages: Partial<SimResources> = {};

  buildings.forEach((b) => {
    const def = catalog[b.typeId];
    if (!def) return;

    const capacity = def.workCapacity ?? 0;
    const assigned = Math.min(b.workers ?? 0, capacity);
    const ratio = capacity > 0 ? assigned / capacity : 1;

    let canProduce = true;
    for (const [key, amount] of Object.entries(def.inputs) as [SimResourceKey, number | undefined][]) {
      const required = (amount ?? 0) * ratio;
      const current = next[key] ?? 0;
      if (current < required) {
        canProduce = false;
        const deficit = required - current;
        shortages[key] = (shortages[key] ?? 0) + deficit;
      }
    }

    if (!canProduce) return;

    for (const [key, amount] of Object.entries(def.inputs) as [SimResourceKey, number | undefined][]) {
      next[key] = next[key] - (amount ?? 0) * ratio;
    }
    for (const [key, amount] of Object.entries(def.outputs) as [SimResourceKey, number | undefined][]) {
      next[key] = (next[key] ?? 0) + (amount ?? 0) * ratio;
    }
  });

  return { updated: next, shortages };
}

// Project per-cycle deltas including level/adjacency and routes; mirrors server tick logic approximately.
export function projectCycleDeltas(
  base: SimResources,
  buildings: Array<{ id?: string; typeId: string; workers?: number; level?: number; traits?: { waterAdj?: number; mountainAdj?: number; forestAdj?: number } }>,
  routes: Array<{ fromId: string; toId: string; length: number }> = [],
  catalog: Record<string, SimBuildingDef>,
  opts?: { totalWorkers?: number; edicts?: Record<string, number>; modifiers?: ProductionModifiers }
): ApplyProductionResult {
  const next: SimResources = { ...base };
  const shortages: Partial<SimResources> = {};
  const edicts = opts?.edicts || {};
  const tariffValue = Math.max(0, Math.min(100, Number(edicts['tariffs'] ?? 50)));
  const routeCoinMultiplier = 0.8 + (tariffValue * 0.006);
  const patrolsEnabled = Number(edicts['patrols'] ?? 0) === 1;
  const mods = opts?.modifiers || {};
  const resMul = mods.resourceOutputMultiplier || {};
  const bldMul = mods.buildingOutputMultiplier || {};

  // Build quick lookup by id for route effects
  const byId: Record<string, typeof buildings[0]> = {} as any;
  buildings.forEach((b) => { if (b.id) byId[b.id] = b; });

  // Precompute buildings connected to a storehouse
  const connectedToStorehouse = new Set<string>();
  routes.forEach(r => {
    const a = byId[r.fromId];
    const b = byId[r.toId];
    if (!a || !b) return;
    if (a.typeId === 'storehouse' && b.id) connectedToStorehouse.add(b.id);
    if (b.typeId === 'storehouse' && a.id) connectedToStorehouse.add(a.id);
  });

  buildings.forEach((b) => {
    const def = catalog[b.typeId];
    if (!def) return;
    const level = Math.max(1, Number(b.level ?? 1));
    const levelOutScale = 1 + 0.5 * (level - 1);
    const levelCapScale = 1 + 0.25 * (level - 1);
    const capacity = Math.round((def.workCapacity ?? 0) * levelCapScale);
    const assigned = Math.min(b.workers ?? 0, capacity);
    const ratio = capacity > 0 ? (assigned / Math.max(1, capacity)) : 1;

    let canProduce = true;
    for (const [key, amount] of Object.entries(def.inputs) as [keyof SimResources, number | undefined][]) {
      const need = (amount ?? 0) * ratio;
      if ((next as any)[key] < need) {
        canProduce = false;
        shortages[key] = ((shortages as any)[key] ?? 0) + (need - (next as any)[key]);
      }
    }
    if (!canProduce) return;

    for (const [key, amount] of Object.entries(def.inputs) as [keyof SimResources, number | undefined][]) {
      const need = Math.max(0, Math.round((amount ?? 0) * ratio));
      next[key] = Math.max(0, (next[key] ?? 0) - need);
    }
    for (const [key, amount] of Object.entries(def.outputs) as [keyof SimResources, number | undefined][]) {
      let out = (amount ?? 0) * ratio * levelOutScale;
      if (b.typeId === 'trade_post' && key === 'coin') {
        const waterAdj = Math.min(2, Number(b.traits?.waterAdj ?? 0));
        out += 2 * waterAdj;
      }
      if (b.typeId === 'farm' && key === 'grain') {
        const waterAdj = Math.min(2, Number(b.traits?.waterAdj ?? 0));
        out += 3 * waterAdj; // farms near water yield more
      }
      if (b.typeId === 'lumber_camp' && key === 'wood') {
        const forestAdj = Math.min(3, Number((b as any).traits?.forestAdj ?? 0));
        out += 2 * forestAdj; // dense forest boosts logs
      }
      // Logistics: storehouse boosts connected producers
      if ((b.id && connectedToStorehouse.has(b.id)) && (key === 'grain' || key === 'wood' || key === 'planks')) {
        out *= 1.15; // efficient handling
      }
      if (b.typeId === 'shrine' && key === 'favor') {
        const mountainAdj = Math.min(2, Number(b.traits?.mountainAdj ?? 0));
        out += 1 * mountainAdj;
      }
      // Apply skill modifiers
      const bm = bldMul[b.typeId] ?? 1;
      const rm = resMul[key as SimResourceKey] ?? 1;
      out *= bm * rm;
      out = Math.max(0, Math.round(out));
      next[key] = (next[key] ?? 0) + out;
    }
  });

  // Routes
  routes.forEach((r) => {
    const coinGain = Math.max(1, Math.round(r.length * 0.5 * routeCoinMultiplier));
    next.coin = (next.coin ?? 0) + coinGain;
  });
  // Patrol upkeep (coin)
  if (routes.length > 0 && patrolsEnabled) {
    next.coin = Math.max(0, (next.coin ?? 0) - 2);
  }
  // Worker upkeep on total workers, not just idle
  const totalWorkers = Math.max(0, Number(opts?.totalWorkers ?? 0));
  const perWorker = 0.2 + (mods.upkeepGrainPerWorkerDelta ?? 0);
  const upkeep = Math.round(totalWorkers * Math.max(0, perWorker));
  if (upkeep > 0) next.grain = Math.max(0, (next.grain ?? 0) - upkeep);

  return { updated: next, shortages };
}

export function canAfford(cost: Partial<SimResources>, resources: SimResources): boolean {
  return (['grain', 'coin', 'mana', 'favor', 'wood', 'planks'] as SimResourceKey[]).every((key) => {
    const need = cost[key] ?? 0;
    return resources[key] >= need;
  });
}

export function applyCost(resources: SimResources, cost: Partial<SimResources>): SimResources {
  const next: SimResources = { ...resources };
  (['grain', 'coin', 'mana', 'favor', 'wood', 'planks'] as SimResourceKey[]).forEach((key) => {
    const need = cost[key] ?? 0;
    next[key] = Math.max(0, next[key] - need);
  });
  return next;
}
