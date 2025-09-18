import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ICONS, COLORS, type ResourceType } from '@arcane/ui';
import type { BuildingPassiveEffects, AggregatedBuildingPassives } from '@engine';

export type { ResourceType } from '@arcane/ui';

export function getResourceIcon(resource: ResourceType): IconDefinition {
  return ICONS[resource];
}

export function getResourceColor(resource: ResourceType): string {
  return COLORS[resource];
}

// Simulation resource helpers
export type SimResourceKey = 'grain' | 'coin' | 'mana' | 'favor' | 'workers' | 'wood' | 'planks' | 'defense';

export interface SimResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  workers: number;
  wood: number;
  planks: number;
  defense: number;
}

export interface SimBuildingDef {
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
  /** Maximum number of workers that can staff this building */
  workCapacity?: number;
  passiveEffects?: BuildingPassiveEffects;
}

export interface ApplyProductionResult {
  updated: SimResources;
  shortages: Partial<SimResources>;
}

export interface ProductionModifiers {
  resourceOutputMultiplier?: Partial<Record<SimResourceKey, number>>;
  buildingOutputMultiplier?: Partial<Record<string, number>>; // by building typeId
  upkeepGrainPerWorkerDelta?: number; // adds to per-worker upkeep (can be negative)
  /** Global multiplier applied after building/resource specific multipliers. */
  globalBuildingOutputMultiplier?: number;
  /** Global multiplier applied to all non-worker resource outputs. */
  globalResourceOutputMultiplier?: number;
  /** Additional multiplier for route-generated coin. */
  routeCoinOutputMultiplier?: number;
  /** Multiplier for patrol upkeep costs on trade routes. */
  patrolCoinUpkeepMultiplier?: number;
  /** Multiplier applied to building input consumption (values < 1 reduce costs). */
  buildingInputMultiplier?: number;
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
  buildings: Array<{ id?: string; typeId: string; workers?: number; level?: number; traits?: { waterAdj?: number; mountainAdj?: number; forestAdj?: number }; recipe?: string }>,
  routes: Array<{ fromId: string; toId: string; length: number }> = [],
  catalog: Record<string, SimBuildingDef>,
  opts?: { totalWorkers?: number; edicts?: Record<string, number>; modifiers?: ProductionModifiers }
): ApplyProductionResult {
  const next: SimResources = { ...base };
  const shortages: Partial<SimResources> = {};
  const edicts = opts?.edicts || {};
  const tariffValue = Math.max(0, Math.min(100, Number(edicts['tariffs'] ?? 50)));
  const mods = opts?.modifiers || {};
  const passive: AggregatedBuildingPassives = {
    resMul: {},
    bldMul: {},
    globalBuildingMultiplier: 1,
    globalResourceMultiplier: 1,
    routeCoinMultiplier: 1,
    patrolCoinUpkeepMultiplier: 1,
    buildingInputMultiplier: 1,
    tickAdjustments: {},
    upkeepDelta: 0,
  };
  buildings.forEach((b) => {
    const def = catalog[b.typeId];
    if (!def?.passiveEffects) return;
    const pass = def.passiveEffects;
    if (pass.resourceMultipliers) {
      Object.entries(pass.resourceMultipliers).forEach(([key, value]) => {
        const factor = Number(value);
        if (!Number.isFinite(factor) || factor <= 0) return;
        passive.resMul[key] = (passive.resMul[key] ?? 1) * factor;
      });
    }
    if (pass.buildingMultipliers) {
      Object.entries(pass.buildingMultipliers).forEach(([key, value]) => {
        const factor = Number(value);
        if (!Number.isFinite(factor) || factor <= 0) return;
        passive.bldMul[key] = (passive.bldMul[key] ?? 1) * factor;
      });
    }
    if (typeof pass.globalBuildingMultiplier === 'number' && Number.isFinite(pass.globalBuildingMultiplier) && pass.globalBuildingMultiplier > 0) {
      passive.globalBuildingMultiplier *= pass.globalBuildingMultiplier;
    }
    if (typeof pass.globalResourceMultiplier === 'number' && Number.isFinite(pass.globalResourceMultiplier) && pass.globalResourceMultiplier > 0) {
      passive.globalResourceMultiplier *= pass.globalResourceMultiplier;
    }
    if (typeof pass.routeCoinMultiplier === 'number' && Number.isFinite(pass.routeCoinMultiplier) && pass.routeCoinMultiplier > 0) {
      passive.routeCoinMultiplier *= pass.routeCoinMultiplier;
    }
    if (typeof pass.patrolCoinUpkeepMultiplier === 'number' && Number.isFinite(pass.patrolCoinUpkeepMultiplier) && pass.patrolCoinUpkeepMultiplier > 0) {
      passive.patrolCoinUpkeepMultiplier *= pass.patrolCoinUpkeepMultiplier;
    }
    if (typeof pass.buildingInputMultiplier === 'number' && Number.isFinite(pass.buildingInputMultiplier) && pass.buildingInputMultiplier > 0) {
      passive.buildingInputMultiplier *= pass.buildingInputMultiplier;
    }
    if (typeof pass.upkeepDelta === 'number' && Number.isFinite(pass.upkeepDelta)) {
      passive.upkeepDelta += pass.upkeepDelta;
    }
    if (pass.tickResourceAdjustments) {
      Object.entries(pass.tickResourceAdjustments).forEach(([key, delta]) => {
        const amount = Number(delta);
        if (!Number.isFinite(amount) || amount === 0) return;
        passive.tickAdjustments[key] = (passive.tickAdjustments[key] ?? 0) + amount;
      });
    }
  });
  const resMul = { ...(mods.resourceOutputMultiplier || {}) } as Record<string, number>;
  const bldMul = { ...(mods.buildingOutputMultiplier || {}) } as Record<string, number>;
  Object.entries(passive.resMul).forEach(([key, value]) => {
    resMul[key] = (resMul[key] ?? 1) * value;
  });
  Object.entries(passive.bldMul).forEach(([key, value]) => {
    bldMul[key] = (bldMul[key] ?? 1) * value;
  });
  const globalBuildingMultiplier = Math.max(0, mods.globalBuildingOutputMultiplier ?? 1) * passive.globalBuildingMultiplier;
  const globalResourceMultiplier = Math.max(0, mods.globalResourceOutputMultiplier ?? 1) * passive.globalResourceMultiplier;
  const routeCoinMultiplier = (0.8 + (tariffValue * 0.006)) * Math.max(0, mods.routeCoinOutputMultiplier ?? 1) * passive.routeCoinMultiplier;
  const patrolCoinUpkeepMultiplier = Math.max(0, mods.patrolCoinUpkeepMultiplier ?? 1) * passive.patrolCoinUpkeepMultiplier;
  const inputMultiplier = Math.max(0, mods.buildingInputMultiplier ?? 1) * passive.buildingInputMultiplier;
  const patrolsEnabled = Number(edicts['patrols'] ?? 0) === 1;

  // Build quick lookup by id for route effects
  const byId: Record<string, typeof buildings[0]> = {};
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
    // Allow per-building recipe overrides (e.g., sawmill 'fine')
    let inputs = def.inputs as Partial<SimResources>;
    let outputs = def.outputs as Partial<SimResources>;
    if (b.typeId === 'sawmill' && b.recipe === 'fine') {
      inputs = { ...inputs, wood: 4, coin: 1 };
      outputs = { ...outputs, planks: 9 };
    }
    if (b.typeId === 'trade_post' && b.recipe === 'premium') {
      inputs = { ...inputs, grain: 3 };
      outputs = { ...outputs, coin: 12 };
    }

      for (const key of Object.keys(inputs) as Array<keyof SimResources>) {
        const amount = inputs[key];
        const requiredRaw = Math.max(0, (amount ?? 0) * ratio * inputMultiplier);
        const required = Math.max(0, Math.round(requiredRaw * 100) / 100);
        const current = next[key] ?? 0;
        if (current < required) {
          canProduce = false;
          shortages[key] = (shortages[key] ?? 0) + (required - current);
        }
      }
    if (!canProduce) return;

      for (const key of Object.keys(inputs) as Array<keyof SimResources>) {
        const amount = inputs[key];
        const requiredRaw = Math.max(0, (amount ?? 0) * ratio * inputMultiplier);
        const required = Math.max(0, Math.round(requiredRaw * 100) / 100);
        next[key] = Math.max(0, (next[key] ?? 0) - required);
      }
      for (const key of Object.keys(outputs) as Array<keyof SimResources>) {
        const amount = outputs[key];
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
      const forestAdj = Math.min(3, Number(b.traits?.forestAdj ?? 0));
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
      const resGlobal = key === 'workers' ? 1 : globalResourceMultiplier;
      out *= bm * rm * globalBuildingMultiplier * resGlobal;
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
    const penalty = Math.max(0, Math.round(2 * patrolCoinUpkeepMultiplier));
    next.coin = Math.max(0, (next.coin ?? 0) - penalty);
  }
  // Worker upkeep on total workers, not just idle
  const totalWorkers = Math.max(0, Number(opts?.totalWorkers ?? 0));
  const perWorker = 0.2 + (mods.upkeepGrainPerWorkerDelta ?? 0) + passive.upkeepDelta;
  const upkeep = Math.round(totalWorkers * Math.max(0, perWorker));
  if (upkeep > 0) next.grain = Math.max(0, (next.grain ?? 0) - upkeep);

  if (Object.keys(passive.tickAdjustments).length > 0) {
    Object.entries(passive.tickAdjustments).forEach(([key, delta]) => {
      const amount = Number(delta ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return;
      const current = Number((next as unknown as Record<string, number>)[key] ?? 0);
      const updated = current + amount;
      (next as unknown as Record<string, number>)[key] = Math.max(0, Math.round(updated));
    });
  }

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
