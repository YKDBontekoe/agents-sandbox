import { describe, it, expect } from 'vitest';
import {
  getResourceIcon,
  getResourceColor,
  applyProduction,
  canAfford,
  applyCost,
  projectCycleDeltas,
  type SimResources,
  type SimBuildingDef
} from './resourceUtils';
import { ICONS, COLORS, type ResourceType } from '@arcane/ui';
import { SIM_BUILDINGS } from '../../lib/buildingCatalog';

describe('resourceUtils', () => {
  const types = Object.keys(ICONS) as ResourceType[];

  types.forEach((type) => {
    it(`returns correct icon for ${type}`, () => {
      expect(getResourceIcon(type)).toBe(ICONS[type]);
    });

    it(`returns correct color for ${type}`, () => {
      expect(getResourceColor(type)).toBe(COLORS[type]);
    });
  });
});

describe('applyProduction', () => {
  const catalog: Record<string, SimBuildingDef> = {
    mill: { inputs: { grain: 2 }, outputs: { coin: 1 }, workCapacity: 1 }
  };

  it('produces outputs when inputs are available', () => {
    const res: SimResources = { grain: 5, coin: 0, mana: 0, favor: 0, workers: 0, wood: 0, planks: 0, defense: 0 };
    const { updated, shortages } = applyProduction(res, [{ typeId: 'mill', workers: 1 }], catalog);
    expect(updated.grain).toBe(3);
    expect(updated.coin).toBe(1);
    expect(shortages).toEqual({});
  });

  it('records shortages when inputs are missing', () => {
    const res: SimResources = { grain: 1, coin: 0, mana: 0, favor: 0, workers: 0, wood: 0, planks: 0, defense: 0 };
    const { updated, shortages } = applyProduction(res, [{ typeId: 'mill', workers: 1 }], catalog);
    expect(updated.grain).toBe(1);
    expect(updated.coin).toBe(0);
    expect(shortages).toEqual({ grain: 1 });
  });
});

describe('canAfford and applyCost', () => {
  const base: SimResources = { grain: 5, coin: 5, mana: 5, favor: 5, workers: 0, wood: 0, planks: 0, defense: 0 };

  it('determines affordability correctly', () => {
    expect(canAfford({ grain: 3, coin: 2 }, base)).toBe(true);
    expect(canAfford({ mana: 6 }, base)).toBe(false);
  });

  it('applies costs and clamps at zero', () => {
    const next = applyCost(base, { grain: 3, coin: 10 });
    expect(next.grain).toBe(2);
    expect(next.coin).toBe(0);
  });
});

function serverSim(
  base: SimResources,
  buildings: Array<{ id?: string; typeId: string; workers?: number; level?: number; traits?: any; recipe?: string }>,
  routes: Array<{ fromId: string; toId: string; length: number }>,
  opts: { edicts?: Record<string, number> } = {}
): SimResources {
  const resources: SimResources = { ...base };
  let workers = base.workers;
  const edicts = opts.edicts || {};
  const tariffValue = Math.max(0, Math.min(100, Number(edicts['tariffs'] ?? 50)));
  const routeCoinMultiplier = 0.8 + tariffValue * 0.006;
  const patrolsEnabled = Number(edicts['patrols'] ?? 0) === 1;

  const byId = new Map(buildings.map((b) => [String(b.id), b]));
  const connectedToStorehouse = new Set<string>();
  routes.forEach((r) => {
    const a = byId.get(String(r.fromId));
    const b = byId.get(String(r.toId));
    if (!a || !b) return;
    if (String(a.typeId) === 'storehouse' && b?.id) connectedToStorehouse.add(String(b.id));
    if (String(b.typeId) === 'storehouse' && a?.id) connectedToStorehouse.add(String(a.id));
  });

  for (const b of buildings) {
    const typeId = String(b.typeId || '');
    const def = SIM_BUILDINGS[typeId];
    if (!def) continue;
    const level = Math.max(1, Number(b.level ?? 1));
    const levelOutScale = 1 + 0.5 * (level - 1);
    const levelCapScale = 1 + 0.25 * (level - 1);
    const capacity = Math.round((def.workCapacity ?? 0) * levelCapScale);
    const assigned = Math.min(b.workers ?? 0, capacity);
    const ratio = capacity > 0 ? assigned / capacity : 1;
    const traits = (b as any).traits || {};

    let canProduce = true;
    for (const [k, v] of Object.entries(def.inputs)) {
      const need = (Number(v ?? 0)) * ratio;
      if (k === 'workers') {
        if (workers < need) { canProduce = false; break; }
      } else {
        const cur = (resources as any)[k] ?? 0;
        if (cur < need) { canProduce = false; break; }
      }
    }
    if (!canProduce) continue;

    for (const [k, v] of Object.entries(def.inputs)) {
      let mult = 1;
      if (typeId === 'sawmill' && k === 'wood' && (b as any).recipe === 'fine') mult = 4 / 3;
      if (typeId === 'trade_post' && k === 'grain' && (b as any).recipe === 'premium') mult = 3 / 2;
      const need = Math.max(0, Math.round((Number(v ?? 0)) * ratio * mult));
      if (k === 'workers') {
        workers = Math.max(0, workers - need);
      } else {
        (resources as any)[k] = Math.max(0, ((resources as any)[k] ?? 0) - need);
      }
    }

    for (const [k, v] of Object.entries(def.outputs)) {
      let out = (Number(v ?? 0)) * ratio * levelOutScale;
      if (typeId === 'trade_post' && k === 'coin') {
        const waterAdj = Math.min(2, Number(traits.waterAdj ?? 0));
        out += 2 * waterAdj;
      }
      if (typeId === 'farm' && k === 'grain') {
        const waterAdj = Math.min(2, Number(traits.waterAdj ?? 0));
        out += 3 * waterAdj;
      }
      if (typeId === 'lumber_camp' && k === 'wood') {
        const forestAdj = Math.min(3, Number(traits.forestAdj ?? 0));
        out += 2 * forestAdj;
      }
      if (typeId === 'sawmill' && k === 'planks' && (b as any).recipe === 'fine') {
        out = 9 * ratio * levelOutScale;
      }
      if ((b as any).id && connectedToStorehouse.has(String((b as any).id)) && (k === 'grain' || k === 'wood' || k === 'planks')) {
        out *= 1.15;
      }
      if (typeId === 'shrine' && k === 'favor') {
        const mountainAdj = Math.min(2, Number(traits.mountainAdj ?? 0));
        out += 1 * mountainAdj;
      }
      out = Math.max(0, Math.round(out));
      if (k === 'workers') {
        workers = Math.max(0, workers + out);
      } else {
        (resources as any)[k] = Math.max(0, ((resources as any)[k] ?? 0) + out);
      }
    }
  }

  routes.forEach((r) => {
    const coinGain = Math.max(1, Math.round(r.length * 0.5 * routeCoinMultiplier));
    resources.coin = Math.max(0, resources.coin + coinGain);
  });
  if (routes.length > 0 && patrolsEnabled) {
    resources.coin = Math.max(0, resources.coin - 2);
  }

  const upkeep = Math.max(0, Math.round(workers * 0.2));
  if (upkeep > 0) {
    resources.grain = Math.max(0, resources.grain - upkeep);
  }

  resources.workers = workers;
  return resources;
}

describe('server tick production parity', () => {
  it('matches projectCycleDeltas for sample scenario', () => {
    const base: SimResources = { grain: 20, coin: 20, mana: 10, favor: 0, workers: 9, wood: 20, planks: 0, defense: 0 };
    const buildings = [
      { id: 's1', typeId: 'storehouse' },
      { id: 'f1', typeId: 'farm', workers: 5, traits: { waterAdj: 2 } },
      { id: 'l1', typeId: 'lumber_camp', workers: 4, traits: { forestAdj: 2 } },
      { id: 'sm1', typeId: 'sawmill', workers: 4, recipe: 'fine' },
    ];
    const routes = [
      { fromId: 's1', toId: 'f1', length: 5 },
      { fromId: 's1', toId: 'sm1', length: 5 },
      { fromId: 'f1', toId: 'sm1', length: 5 },
    ];
    const edicts = { tariffs: 50 };
    const { updated } = projectCycleDeltas(base, buildings as any, routes, SIM_BUILDINGS, { totalWorkers: base.workers, edicts });
    const server = serverSim(base, buildings, routes, { edicts });
    expect(server).toEqual(updated);
  });
});

describe('projectCycleDeltas modifiers', () => {
  it('scales route coin output by multiplier', () => {
    const base: SimResources = { grain: 0, coin: 0, mana: 0, favor: 0, workers: 0, wood: 0, planks: 0, defense: 0 };
    const buildings = [
      { id: 'hub', typeId: 'storehouse' },
      { id: 'farm', typeId: 'farm', workers: 0 },
    ];
    const routes = [{ fromId: 'hub', toId: 'farm', length: 8 }];
    const normal = projectCycleDeltas(base, buildings as any, routes, SIM_BUILDINGS, { totalWorkers: 0 });
    const boosted = projectCycleDeltas(base, buildings as any, routes, SIM_BUILDINGS, {
      totalWorkers: 0,
      modifiers: { routeCoinOutputMultiplier: 1.5 },
    });
    expect(normal.updated.coin).toBe(Math.max(1, Math.round(8 * 0.5 * (0.8 + 50 * 0.006))));
    expect(boosted.updated.coin).toBe(Math.max(1, Math.round(8 * 0.5 * (0.8 + 50 * 0.006) * 1.5)));
  });

  it('reduces building input consumption when multiplier is below 1', () => {
    const base: SimResources = { grain: 0, coin: 10, mana: 0, favor: 0, workers: 5, wood: 0, planks: 0, defense: 0 };
    const buildings = [{ typeId: 'farm', workers: 5 }];
    const normal = projectCycleDeltas(base, buildings as any, [], SIM_BUILDINGS, { totalWorkers: 5 });
    const reduced = projectCycleDeltas(base, buildings as any, [], SIM_BUILDINGS, {
      totalWorkers: 5,
      modifiers: { buildingInputMultiplier: 0.5 },
    });
    expect(normal.updated.coin).toBe(9);
    expect(reduced.updated.coin).toBeCloseTo(9.5, 5);
  });

  it('applies global building and resource multipliers to outputs', () => {
    const base: SimResources = { grain: 0, coin: 10, mana: 0, favor: 0, workers: 5, wood: 0, planks: 0, defense: 0 };
    const buildings = [{ typeId: 'farm', workers: 5 }];
    const normal = projectCycleDeltas(base, buildings as any, [], SIM_BUILDINGS, { totalWorkers: 5 });
    const boosted = projectCycleDeltas(base, buildings as any, [], SIM_BUILDINGS, {
      totalWorkers: 5,
      modifiers: {
        globalBuildingOutputMultiplier: 1.2,
        globalResourceOutputMultiplier: 1.1,
      },
    });
    expect(boosted.updated.grain).toBeGreaterThan(normal.updated.grain);
  });
});
