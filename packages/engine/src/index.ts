export interface SimResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  workers: number;
  wood: number;
  planks: number;
}

export interface SimBuildingType {
  id: string;
  name: string;
  cost: Partial<SimResources>;
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
  workCapacity?: number;
  maxLevel?: number;
}

export interface Proposal {
  id: string;
  state_id: string;
  guild?: string;
  title?: string;
  description?: string;
  predicted_delta: Record<string, number>;
  status?: string;
}

export interface BuildingData {
  id?: string;
  typeId?: string;
  workers?: number;
  level?: number;
  traits?: Record<string, unknown>;
  recipe?: string;
  x?: number;
  y?: number;
}

export interface RouteData {
  id: string;
  fromId: string;
  toId: string;
  length?: number;
}

export interface GameState {
  id: string;
  cycle: number;
  resources: Record<string, number>;
  workers?: number;
  buildings?: BuildingData[];
  routes?: RouteData[];
  roads?: Array<{ x: number; y: number }>;
  citizens_seed?: number;
  citizens_count?: number;
  skills?: string[];
  pinned_skill_targets?: string[];
  skill_tree_seed?: number;
  edicts?: Record<string, number>;
  max_cycle?: number;
  updated_at?: string;
  map_size?: number;
  // Real-time clock
  auto_ticking?: boolean;
  last_tick_at?: string; // ISO timestamp
  tick_interval_ms?: number;
}

export interface TickCrisis {
  type: 'unrest' | 'threat';
  message: string;
  penalty: Record<string, number>;
}

export interface TickResult {
  state: GameState;
  crisis: TickCrisis | null;
}

export function applyProposals(state: GameState, proposals: Proposal[]): GameState {
  const next: GameState = { ...state, resources: { ...state.resources } };
  for (const p of proposals) {
    const delta = p.predicted_delta || {};
    for (const key of Object.keys(delta)) {
      const value = Number(delta[key] ?? 0);
      next.resources[key] = Math.max(0, Number(next.resources[key] ?? 0) + value);
    }
  }
  return next;
}

export function produceBuildings(state: GameState, catalog: Record<string, SimBuildingType>): { resources: Record<string, number>; workers: number } {
  const resources: Record<string, number> = { ...state.resources };
  let workers = Number(state.workers ?? 0);
  const buildings: BuildingData[] = Array.isArray(state.buildings) ? state.buildings : [];
  const edicts: Record<string, number> = state.edicts ?? {};
  const routes: RouteData[] = Array.isArray(state.routes) ? state.routes : [];
  const tariffValue = Math.max(0, Math.min(100, Number(edicts['tariffs'] ?? 50)));
  const routeCoinMultiplier = 0.8 + (tariffValue * 0.006);
  const patrolsEnabled = Number(edicts['patrols'] ?? 0) === 1;
  const byId = new Map<string, BuildingData>(buildings.map(b => [String(b.id), b]));
  const connectedToStorehouse = new Set<string>();
  if (routes.length > 0) {
    for (const r of routes) {
      const a = byId.get(String(r.fromId));
      const b = byId.get(String(r.toId));
      if (!a || !b) continue;
      if (String(a.typeId) === 'storehouse' && b.id) connectedToStorehouse.add(String(b.id));
      if (String(b.typeId) === 'storehouse' && a.id) connectedToStorehouse.add(String(a.id));
    }
  }
  for (const b of buildings) {
    const typeId = String(b.typeId || '');
    const def = catalog[typeId];
    if (!def) continue;
    const level = Math.max(1, Number(b.level ?? 1));
    const levelOutScale = 1 + 0.5 * (level - 1);
    const levelCapScale = 1 + 0.25 * (level - 1);
    const capacity = Math.round((def.workCapacity ?? 0) * levelCapScale);
    const assigned = Math.min(typeof b.workers === 'number' ? b.workers : 0, capacity);
    const ratio = capacity > 0 ? assigned / capacity : 1;
    const traits = b.traits || {};
    let canProduce = true;
    for (const [k, v] of Object.entries(def.inputs)) {
      if (k === 'workers') continue;
      const need = (Number(v ?? 0)) * ratio;
      const cur = Number(resources[k as keyof typeof resources] ?? 0);
      if (cur < need) { canProduce = false; break; }
    }
    if (!canProduce) continue;
    for (const [k, v] of Object.entries(def.inputs)) {
      let mult = 1;
      if (typeId === 'sawmill' && k === 'wood' && b.recipe === 'fine') mult = (4/3);
      if (typeId === 'trade_post' && k === 'grain' && b.recipe === 'premium') mult = (3/2);
      const need = Math.max(0, Math.round((Number(v ?? 0)) * ratio * mult));
      if (k === 'workers') {
        workers = Math.max(0, workers - need);
      } else {
        const key = k as keyof typeof resources;
        resources[key] = Math.max(0, Number(resources[key] ?? 0) - need);
      }
    }
    for (const [k, v] of Object.entries(def.outputs)) {
      let out = (Number(v ?? 0)) * ratio * levelOutScale;
      if (typeId === 'trade_post' && k === 'coin') {
        const waterAdj = Math.min(2, Number((traits as any).waterAdj ?? 0));
        out += 2 * waterAdj;
      }
      if (typeId === 'farm' && k === 'grain') {
        const waterAdj = Math.min(2, Number((traits as any).waterAdj ?? 0));
        out += 3 * waterAdj;
      }
      if (typeId === 'lumber_camp' && k === 'wood') {
        const forestAdj = Math.min(3, Number((traits as any).forestAdj ?? 0));
        out += 2 * forestAdj;
      }
      if (typeId === 'sawmill' && k === 'planks' && b.recipe === 'fine') {
        out = 9 * ratio * levelOutScale;
      }
      if (b.id && connectedToStorehouse.has(String(b.id)) && (k === 'grain' || k === 'wood' || k === 'planks')) {
        out *= 1.15;
      }
      if (typeId === 'shrine' && k === 'favor') {
        const mountainAdj = Math.min(2, Number((traits as any).mountainAdj ?? 0));
        out += 1 * mountainAdj;
      }
      out = Math.max(0, Math.round(out));
      if (k === 'workers') {
        workers = Math.max(0, workers + out);
      } else {
        const key = k as keyof typeof resources;
        resources[key] = Math.max(0, Number(resources[key] ?? 0) + out);
      }
    }
  }
  if (routes.length > 0) {
    const MAX_ROUTE_LEN = 20;
    for (const r of routes) {
      const a = byId.get(String(r.fromId));
      const b = byId.get(String(r.toId));
      if (!a || !b) continue;
      const dist = Math.abs(Number(a.x ?? 0) - Number(b.x ?? 0)) + Math.abs(Number(a.y ?? 0) - Number(b.y ?? 0));
      const length = Math.min(MAX_ROUTE_LEN, Number(r.length ?? dist));
      const coinGain = Math.max(1, Math.round(length * 0.5 * routeCoinMultiplier));
      resources.coin = Math.max(0, Number(resources.coin ?? 0) + coinGain);
    }
    let unrestBump = Math.floor(routes.length / 2);
    if (tariffValue >= 60) unrestBump += 1;
    if (patrolsEnabled) unrestBump = Math.max(0, unrestBump - 1);
    resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + unrestBump);
    if (patrolsEnabled) {
      resources.coin = Math.max(0, Number(resources.coin ?? 0) - 2);
    }
  }
  return { resources, workers };
}

export function processTick(state: GameState, proposals: Proposal[], catalog: Record<string, SimBuildingType>): TickResult {
  const afterProps = applyProposals(state, proposals);
  const prod = produceBuildings(afterProps, catalog);
  const resources = prod.resources;
  const workers = prod.workers;
  const unrestThreatDecay = 1 + Math.floor(afterProps.cycle / 10);
  resources.mana = Math.max(0, Number(resources.mana ?? 0) - 5);
  resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + unrestThreatDecay);
  resources.threat = Math.max(0, Number(resources.threat ?? 0) + unrestThreatDecay);
  const upkeep = Math.max(0, Math.round(workers * 0.2));
  if (upkeep > 0) {
    resources.grain = Math.max(0, Number(resources.grain ?? 0) - upkeep);
  }
  let crisis: TickCrisis | null = null;
  if (Number(resources.unrest ?? 0) >= 80) {
    crisis = {
      type: 'unrest',
      message: 'Riots erupt across the dominion, draining supplies and goodwill.',
      penalty: { grain: -10, coin: -10, favor: -5 }
    };
  } else if (Number(resources.threat ?? 0) >= 70) {
    crisis = {
      type: 'threat',
      message: 'Roving warbands harry the borders, sapping mana and favor.',
      penalty: { mana: -10, favor: -5 }
    };
  }
  if (crisis) {
    for (const [key, value] of Object.entries(crisis.penalty)) {
      resources[key] = Math.max(0, Number(resources[key] ?? 0) + value);
    }
  }
  const newCycle = Number(state.cycle) + 1;
  const newMax = Math.max(Number(state.max_cycle ?? 0), newCycle);
  const nextState: GameState = { ...afterProps, resources, workers, cycle: newCycle, max_cycle: newMax };
  return { state: nextState, crisis };
}

// Export shared types
export * from './types/gameTime';

// Export simulation systems
export * from './simulation/buildingCatalog';
export * from './simulation/buildingSimulation';
export * from './simulation/citizenBehavior';
export * from './simulation/workerSimulation';
export * from './simulation/simulationIntegration';
export * from './simulation/events';

// Export time system
export * from './systems/time';

// Export world generation helpers
export * from './world/noise';
export * from './world/biome';
export * from './world/features';
export * from './world/generator';
