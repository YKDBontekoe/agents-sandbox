import { deriveSkillEffects, type AccumulatedSkillEffects } from './skills/modifiers';
import { evaluateEra, type EraStatus, type EraProgressMetrics } from './progression/eraSystem';

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

export type MilestoneSnapshot = EraProgressMetrics;
export interface CharterMapReveal {
  center: { x: number; y: number };
  radius: number;
}

export interface CharterPerks {
  /** Instant resource bonuses granted when the charter is sworn. */
  startingResources?: Partial<Record<string, number>>;
  /** Unique structures granted at game start. */
  startingBuildings?: BuildingData[];
  /** Multipliers applied to resource outputs produced by buildings. */
  resourceOutputMultipliers?: Record<string, number>;
  /** Multipliers applied to specific building types. */
  buildingOutputMultipliers?: Record<string, number>;
  /** Global multiplier applied to all building outputs. */
  globalBuildingOutputMultiplier?: number;
  /** Global multiplier applied to all non-worker resources. */
  globalResourceOutputMultiplier?: number;
  /** Multiplier applied to trade-route generated coin. */
  routeCoinOutputMultiplier?: number;
  /** Multiplier applied to patrol upkeep costs. */
  patrolCoinUpkeepMultiplier?: number;
  /** Multiplier applied to all building input consumption. */
  buildingInputMultiplier?: number;
  /** Per-cycle adjustments applied after production/upkeep. */
  tickResourceAdjustments?: Record<string, number>;
  /** Additional delta applied to the per-worker grain upkeep. */
  upkeepGrainPerWorkerDelta?: number;
  /** Reveals part of the world map when the charter is chosen. */
  mapReveal?: CharterMapReveal;
}

export interface FoundingCharter {
  id: string;
  name: string;
  description: string;
  perks: CharterPerks;
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
  founding_charter?: FoundingCharter | null;
  // Real-time clock
  auto_ticking?: boolean;
  last_tick_at?: string; // ISO timestamp
  tick_interval_ms?: number;
  quests_completed?: number;
  milestones?: MilestoneSnapshot;
  era?: EraStatus;
}

export interface CharterEffects {
  resMul: Record<string, number>;
  bldMul: Record<string, number>;
  globalBuildingMultiplier: number;
  globalResourceMultiplier: number;
  routeCoinMultiplier: number;
  patrolCoinUpkeepMultiplier: number;
  buildingInputMultiplier: number;
  upkeepDelta: number;
  tickAdjustments: Record<string, number>;
}

export const FOUNDING_CHARTERS: FoundingCharter[] = [
  {
    id: 'verdant_accord',
    name: 'Verdant Accord',
    description: 'Ancient irrigation rights swell the granaries and calm the farmers.',
    perks: {
      startingResources: { grain: 180, wood: 40 },
      resourceOutputMultipliers: { grain: 1.1 },
      buildingOutputMultipliers: { farm: 1.25 },
      globalResourceOutputMultiplier: 1.02,
      upkeepGrainPerWorkerDelta: -0.02,
      mapReveal: { center: { x: 16, y: 16 }, radius: 6 },
    },
  },
  {
    id: 'arcane_sanctum',
    name: 'Arcane Sanctum',
    description: 'Leyline wards empower rituals and unveil the surrounding wilds.',
    perks: {
      startingResources: { mana: 120, favor: 25 },
      globalResourceOutputMultiplier: 1.05,
      tickResourceAdjustments: { mana: 3 },
      routeCoinOutputMultiplier: 1.1,
      mapReveal: { center: { x: 20, y: 12 }, radius: 8 },
    },
  },
  {
    id: 'architects_legacy',
    name: "Architect's Legacy",
    description: 'Blueprint vaults grant sturdy workshops and efficient logistics.',
    perks: {
      startingResources: { planks: 40, coin: 80 },
      buildingOutputMultipliers: { sawmill: 1.2, storehouse: 1.05 },
      buildingInputMultiplier: 0.9,
      patrolCoinUpkeepMultiplier: 0.85,
      startingBuildings: [
        { typeId: 'storehouse', x: 14, y: 14, level: 1, workers: 0 },
        { typeId: 'sawmill', x: 17, y: 15, level: 1, workers: 0 },
      ],
    },
  },
];

export function findCharterById(id: string): FoundingCharter | undefined {
  return FOUNDING_CHARTERS.find(charter => charter.id === id);
}

export function deriveCharterEffects(charter?: FoundingCharter | null): CharterEffects {
  const base: CharterEffects = {
    resMul: {},
    bldMul: {},
    globalBuildingMultiplier: 1,
    globalResourceMultiplier: 1,
    routeCoinMultiplier: 1,
    patrolCoinUpkeepMultiplier: 1,
    buildingInputMultiplier: 1,
    upkeepDelta: 0,
    tickAdjustments: {},
  };
  if (!charter || !charter.perks) {
    return base;
  }
  const { perks } = charter;
  if (perks.resourceOutputMultipliers) {
    for (const [key, value] of Object.entries(perks.resourceOutputMultipliers)) {
      const multiplier = Number(value);
      if (Number.isFinite(multiplier) && multiplier > 0) {
        base.resMul[key] = multiplier;
      }
    }
  }
  if (perks.buildingOutputMultipliers) {
    for (const [key, value] of Object.entries(perks.buildingOutputMultipliers)) {
      const multiplier = Number(value);
      if (Number.isFinite(multiplier) && multiplier > 0) {
        base.bldMul[key] = multiplier;
      }
    }
  }
  if (typeof perks.globalBuildingOutputMultiplier === 'number' && perks.globalBuildingOutputMultiplier > 0) {
    base.globalBuildingMultiplier = perks.globalBuildingOutputMultiplier;
  }
  if (typeof perks.globalResourceOutputMultiplier === 'number' && perks.globalResourceOutputMultiplier > 0) {
    base.globalResourceMultiplier = perks.globalResourceOutputMultiplier;
  }
  if (typeof perks.routeCoinOutputMultiplier === 'number' && perks.routeCoinOutputMultiplier > 0) {
    base.routeCoinMultiplier = perks.routeCoinOutputMultiplier;
  }
  if (typeof perks.patrolCoinUpkeepMultiplier === 'number' && perks.patrolCoinUpkeepMultiplier > 0) {
    base.patrolCoinUpkeepMultiplier = perks.patrolCoinUpkeepMultiplier;
  }
  if (typeof perks.buildingInputMultiplier === 'number' && perks.buildingInputMultiplier > 0) {
    base.buildingInputMultiplier = perks.buildingInputMultiplier;
  }
  if (typeof perks.upkeepGrainPerWorkerDelta === 'number') {
    base.upkeepDelta = perks.upkeepGrainPerWorkerDelta;
  }
  if (perks.tickResourceAdjustments) {
    for (const [key, value] of Object.entries(perks.tickResourceAdjustments)) {
      const adjustment = Number(value);
      if (Number.isFinite(adjustment) && adjustment !== 0) {
        base.tickAdjustments[key] = adjustment;
      }
    }
  }
  return base;
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

export function produceBuildings(
  state: GameState,
  catalog: Record<string, SimBuildingType>,
): { resources: Record<string, number>; workers: number; skillEffects: AccumulatedSkillEffects } {
  const resources: Record<string, number> = { ...state.resources };
  let workers = Number(state.workers ?? 0);
  const buildings: BuildingData[] = Array.isArray(state.buildings) ? state.buildings : [];
  const edicts: Record<string, number> = state.edicts ?? {};
  const routes: RouteData[] = Array.isArray(state.routes) ? state.routes : [];
  const tariffValue = Math.max(0, Math.min(100, Number(edicts['tariffs'] ?? 50)));
  const patrolsEnabled = Number(edicts['patrols'] ?? 0) === 1;
  const skillEffects = deriveSkillEffects(state.skills, {
    seed: typeof state.skill_tree_seed === 'number' ? state.skill_tree_seed : undefined,
  });
  const charterEffects = deriveCharterEffects(state.founding_charter);
  const {
    resMul,
    bldMul,
    globalBuildingMultiplier: skillGlobalBuildingMultiplier,
    globalResourceMultiplier: skillGlobalResourceMultiplier,
    routeCoinMultiplier: skillRouteCoinMultiplier,
    patrolCoinUpkeepMultiplier: skillPatrolCoinUpkeepMultiplier,
    buildingInputMultiplier: skillBuildingInputMultiplier,
  } = skillEffects;
  const combinedResMul: Record<string, number> = { ...resMul };
  for (const [key, value] of Object.entries(charterEffects.resMul)) {
    combinedResMul[key] = (combinedResMul[key] ?? 1) * value;
  }
  const combinedBldMul: Record<string, number> = { ...bldMul };
  for (const [key, value] of Object.entries(charterEffects.bldMul)) {
    combinedBldMul[key] = (combinedBldMul[key] ?? 1) * value;
  }
  const globalBuildingMultiplier = skillGlobalBuildingMultiplier * charterEffects.globalBuildingMultiplier;
  const globalResourceMultiplier = skillGlobalResourceMultiplier * charterEffects.globalResourceMultiplier;
  const routeCoinMultiplier = (0.8 + (tariffValue * 0.006)) * skillRouteCoinMultiplier * charterEffects.routeCoinMultiplier;
  const patrolCoinUpkeepMultiplier = skillPatrolCoinUpkeepMultiplier * charterEffects.patrolCoinUpkeepMultiplier;
  const buildingInputMultiplier = skillBuildingInputMultiplier * charterEffects.buildingInputMultiplier;
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
    const resourceNeeds: Array<{ key: keyof typeof resources; amount: number }> = [];
    let workerNeed = 0;
    let canProduce = true;
    for (const [k, v] of Object.entries(def.inputs)) {
      let recipeMult = 1;
      if (typeId === 'sawmill' && k === 'wood' && b.recipe === 'fine') recipeMult = (4 / 3);
      if (typeId === 'trade_post' && k === 'grain' && b.recipe === 'premium') recipeMult = (3 / 2);
      const baseNeed = Number(v ?? 0) * ratio * recipeMult;
      if (k === 'workers') {
        workerNeed = Math.max(0, Math.round(baseNeed));
        continue;
      }
      const adjustedNeed = baseNeed * buildingInputMultiplier;
      const finalNeed = Math.max(0, Math.round(adjustedNeed));
      if (finalNeed > 0) {
        const key = k as keyof typeof resources;
        const current = Number(resources[key] ?? 0);
        if (current < finalNeed) {
          canProduce = false;
          break;
        }
        resourceNeeds.push({ key, amount: finalNeed });
      }
    }
    if (!canProduce) continue;
    for (const req of resourceNeeds) {
      resources[req.key] = Math.max(0, Number(resources[req.key] ?? 0) - req.amount);
    }
    if (workerNeed > 0) {
      workers = Math.max(0, workers - workerNeed);
    }
    const buildingOutputMultiplier = globalBuildingMultiplier * (combinedBldMul[typeId] ?? 1);
    for (const [k, v] of Object.entries(def.outputs)) {
      let out = Number(v ?? 0) * ratio * levelOutScale;
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
      out *= buildingOutputMultiplier;
      if (k !== 'workers') {
        out *= globalResourceMultiplier;
        out *= combinedResMul[k] ?? 1;
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
      let coinGain = length * 0.5 * routeCoinMultiplier * skillRouteCoinMultiplier;
      coinGain *= globalResourceMultiplier;
      coinGain *= combinedResMul.coin ?? 1;
      const finalGain = Math.max(1, Math.round(coinGain));
      resources.coin = Math.max(0, Number(resources.coin ?? 0) + finalGain);
    }
    let unrestBump = Math.floor(routes.length / 2);
    if (tariffValue >= 60) unrestBump += 1;
    if (patrolsEnabled) unrestBump = Math.max(0, unrestBump - 1);
    resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + unrestBump);
    if (patrolsEnabled) {
      const patrolCost = Math.max(0, Math.round(2 * patrolCoinUpkeepMultiplier));
      resources.coin = Math.max(0, Number(resources.coin ?? 0) - patrolCost);
    }
  }
  return { resources, workers, skillEffects };
}

export function processTick(state: GameState, proposals: Proposal[], catalog: Record<string, SimBuildingType>): TickResult {
  const afterProps = applyProposals(state, proposals);
  const { resources, workers, skillEffects } = produceBuildings(afterProps, catalog);
  const toTwoDecimals = (value: number): number => Math.round(value * 100) / 100;
  const citySize = Array.isArray(afterProps.buildings) ? afterProps.buildings.length : 0;
  const questsCompleted = Math.max(0, Math.round(Number(afterProps.quests_completed ?? 0)));
  const currentUnrest = Number(resources.unrest ?? afterProps.resources?.unrest ?? 0);
  const currentThreat = Number(resources.threat ?? afterProps.resources?.threat ?? 0);
  const currentMana = Number(resources.mana ?? afterProps.resources?.mana ?? 0);
  const currentFavor = Number(resources.favor ?? afterProps.resources?.favor ?? 0);
  const eraStatus = evaluateEra({
    cycle: Number(afterProps.cycle ?? 0),
    citySize,
    questsCompleted,
    unrest: currentUnrest,
    threat: currentThreat,
    manaReserve: currentMana,
    favor: currentFavor,
  });
  const effectivePressures = eraStatus.pressures.effective;
  const manaDelta = toTwoDecimals(effectivePressures.manaUpkeep);
  const unrestDelta = toTwoDecimals(effectivePressures.unrest);
  const threatDelta = toTwoDecimals(effectivePressures.threat);
  resources.mana = Math.max(0, currentMana - manaDelta);
  resources.unrest = Math.max(0, currentUnrest + unrestDelta);
  resources.threat = Math.max(0, currentThreat + threatDelta);
  const charterEffects = deriveCharterEffects(afterProps.founding_charter ?? state.founding_charter);
  const upkeepRate = Math.max(0, 0.2 + skillEffects.upkeepDelta + charterEffects.upkeepDelta);
  const upkeep = Math.max(0, Math.round(workers * upkeepRate));
  if (upkeep > 0) {
    resources.grain = Math.max(0, Number(resources.grain ?? 0) - upkeep);
  }
  if (Object.keys(charterEffects.tickAdjustments).length > 0) {
    for (const [key, delta] of Object.entries(charterEffects.tickAdjustments)) {
      const current = Number(resources[key] ?? 0);
      const next = current + Number(delta ?? 0);
      resources[key] = Math.max(0, Math.round(next));
    }
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
  const milestones: MilestoneSnapshot = {
    citySize: eraStatus.progress.citySize,
    questsCompleted: eraStatus.progress.questsCompleted,
    stability: eraStatus.progress.stability,
    manaReserve: eraStatus.progress.manaReserve,
    favor: eraStatus.progress.favor,
  };
  const nextState: GameState = {
    ...afterProps,
    resources,
    workers,
    cycle: newCycle,
    max_cycle: newMax,
    quests_completed: questsCompleted,
    milestones,
    era: eraStatus,
  };
  return { state: nextState, crisis };
}

export { evaluateEra, ERA_DEFINITIONS } from './progression/eraSystem';
export type {
  EraStatus,
  EraDefinition,
  EraGoalState,
  EraMitigationState,
  EraPressuresSummary,
  EraPressureValues,
  EraPreview,
  EraProgressMetrics,
} from './progression/eraSystem';

// Export shared types
export * from './types/gameTime';

// Export simulation systems
export * from './simulation/buildingCatalog';
export * from './simulation/buildings';
export * from './simulation/citizenBehavior';
export * from './simulation/citizens/citizenFactory';
export * from './simulation/citizens/citizenWellbeing';
export * from './simulation/citizens/lifeEvents';
export * from './simulation/citizens/socialInteractions';
export type { Citizen } from './simulation/citizens/citizen';
export * from './simulation/workerSimulation';
export * from './simulation/simulationIntegration';
export * from './simulation/events';
export { CityManagementInterface } from './simulation/cityManagementInterface';
export type {
  CityManagementConfig,
  CityStats,
  ManagementAction
} from './simulation/cityManagementInterface';

// Export time system
export * from './systems/time';

// Export world generation helpers
export * from './world/noise';
export * from './world/biome';
export * from './world/features';
export * from './world/generator';
export * from './visuals/constellation/particleSystem';
