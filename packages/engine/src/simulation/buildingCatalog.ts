import { ERA_DEFINITIONS } from '../progression/eraSystem';

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

export interface SimBuildingType {
  id: string;
  name: string;
  cost: Partial<SimResources>;
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
  /** Maximum number of workers this building can employ */
  workCapacity?: number;
  /** Maximum upgrade level (>=1). Default 3. */
  maxLevel?: number;
  /** Optional thematic category (economic, mystical, etc.). */
  category?: 'economic' | 'military' | 'mystical' | 'infrastructure' | 'diplomatic' | 'social';
  /** Optional prerequisite metadata that controls when the building unlocks. */
  prerequisites?: BuildingPrerequisites;
  /** Passive effects applied while the structure exists. */
  passiveEffects?: BuildingPassiveEffects;
  /** Marks a structure as unique – only one copy may exist. */
  unique?: boolean;
}

export interface BuildingPrerequisites {
  /** Required skill or mitigation identifiers. */
  skills?: string[];
  /** Quest chapter identifiers that must be completed. */
  quests?: string[];
  /** Minimum era identifier required to unlock construction. */
  era?: string;
}

export interface BuildingPassiveEffects {
  /** Per-cycle adjustments applied after building production. */
  tickResourceAdjustments?: Partial<Record<string, number>>;
  /** Multipliers applied to resource outputs. */
  resourceMultipliers?: Partial<Record<string, number>>;
  /** Multipliers applied to building outputs by type. */
  buildingMultipliers?: Record<string, number>;
  /** Adjusts the global building output multiplier. */
  globalBuildingMultiplier?: number;
  /** Adjusts the global resource output multiplier. */
  globalResourceMultiplier?: number;
  /** Additional multiplier for route coin yield. */
  routeCoinMultiplier?: number;
  /** Multiplier applied to patrol upkeep. */
  patrolCoinUpkeepMultiplier?: number;
  /** Multiplier applied to building input consumption. */
  buildingInputMultiplier?: number;
  /** Adds to the per-worker upkeep delta (can be negative). */
  upkeepDelta?: number;
}

export interface AggregatedBuildingPassives {
  resMul: Record<string, number>;
  bldMul: Record<string, number>;
  globalBuildingMultiplier: number;
  globalResourceMultiplier: number;
  routeCoinMultiplier: number;
  patrolCoinUpkeepMultiplier: number;
  buildingInputMultiplier: number;
  tickAdjustments: Record<string, number>;
  upkeepDelta: number;
}

export interface BuildingPrerequisiteContext {
  unlockedSkills: string[];
  completedQuests: string[];
  currentEraId?: string | null;
}

export interface BuildingPrerequisiteStatus {
  meetsRequirements: boolean;
  missingSkills: string[];
  missingQuests: string[];
  missingEra?: string;
}

const ERA_INDEX_LOOKUP: Record<string, number> = ERA_DEFINITIONS.reduce<Record<string, number>>((acc, era, index) => {
  acc[era.id] = index;
  return acc;
}, {});

export function evaluateBuildingPrerequisites(
  prerequisites: BuildingPrerequisites | undefined,
  context: BuildingPrerequisiteContext,
): BuildingPrerequisiteStatus {
  if (!prerequisites) {
    return { meetsRequirements: true, missingSkills: [], missingQuests: [] };
  }

  const unlocked = new Set(context.unlockedSkills);
  const completed = new Set(context.completedQuests);
  const missingSkills = (prerequisites.skills || []).filter(id => !unlocked.has(id));
  const missingQuests = (prerequisites.quests || []).filter(id => !completed.has(id));

  let missingEra: string | undefined;
  if (prerequisites.era) {
    const current = context.currentEraId ?? null;
    const requiredIndex = ERA_INDEX_LOOKUP[prerequisites.era];
    const currentIndex = current ? ERA_INDEX_LOOKUP[current] ?? -1 : -1;
    if (requiredIndex !== undefined && (currentIndex < requiredIndex)) {
      missingEra = prerequisites.era;
    }
  }

  const meetsRequirements = missingSkills.length === 0 && missingQuests.length === 0 && !missingEra;
  return { meetsRequirements, missingSkills, missingQuests, missingEra };
}

type ExtractString<T> = T extends string ? T : never;

export type SimBuildingDefinition<TKey extends string = string> = SimBuildingType & { id: TKey };

export function defineSimBuildings<TCatalog extends Record<string, SimBuildingDefinition>>(catalog: {
  [K in keyof TCatalog]: SimBuildingDefinition<ExtractString<K>>;
}) {
  return catalog;
}

export const SIM_BUILDINGS = defineSimBuildings({
  council_hall: {
    id: 'council_hall',
    name: 'Council Hall',
    cost: { coin: 100, mana: 10 },
    // Base provides small favor each cycle; operates without workers
    inputs: {},
    outputs: { favor: 1 },
    workCapacity: 0,
    maxLevel: 3,
    category: 'infrastructure',
  },
  trade_post: {
    id: 'trade_post',
    name: 'Trade Post',
    cost: { coin: 60, grain: 10 },
    // Converts grain into coin passively to represent a basic trade route
    inputs: { grain: 2 },
    outputs: { coin: 8 },
    workCapacity: 0,
    maxLevel: 3,
    category: 'economic',
  },
  automation_workshop: {
    id: 'automation_workshop',
    name: 'Automation Workshop',
    cost: { coin: 80, mana: 15 },
    // Spends a bit of mana to steadily generate coin (arcane mechanization)
    inputs: { mana: 1 },
    outputs: { coin: 6 },
    workCapacity: 0,
    maxLevel: 3,
    category: 'economic',
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    cost: { coin: 20, grain: 0 },
    inputs: { coin: 1 },
    outputs: { grain: 10 },
    workCapacity: 5,
    maxLevel: 3,
    category: 'economic',
  },
  lumber_camp: {
    id: 'lumber_camp',
    name: 'Lumber Camp',
    cost: { coin: 15 },
    inputs: {},
    outputs: { wood: 8 },
    workCapacity: 4,
    maxLevel: 3,
    category: 'infrastructure',
  },
  sawmill: {
    id: 'sawmill',
    name: 'Sawmill',
    cost: { coin: 25, wood: 10 },
    inputs: { wood: 3, coin: 1 },
    outputs: { planks: 6 },
    workCapacity: 4,
    maxLevel: 3,
    category: 'infrastructure',
  },
  storehouse: {
    id: 'storehouse',
    name: 'Storehouse',
    cost: { coin: 30, planks: 10 },
    inputs: {},
    outputs: {},
    workCapacity: 0,
    maxLevel: 1,
    category: 'infrastructure',
  },
  house: {
    id: 'house',
    name: 'House',
    cost: { coin: 30, grain: 10 },
    inputs: { grain: 1 },
    outputs: { workers: 5 },
    workCapacity: 0,
    maxLevel: 3,
    category: 'social',
  },
  shrine: {
    id: 'shrine',
    name: 'Shrine',
    cost: { coin: 25, mana: 5 },
    inputs: { mana: 1 },
    outputs: { favor: 2 },
    workCapacity: 2,
    maxLevel: 3,
    category: 'mystical',
  },
  arcane_conduit: {
    id: 'arcane_conduit',
    name: 'Arcane Conduit',
    cost: { coin: 120, mana: 25, planks: 20 },
    inputs: { mana: 2 },
    outputs: { mana: 10, favor: 1 },
    workCapacity: 3,
    maxLevel: 3,
    category: 'mystical',
    prerequisites: { skills: ['leyline_capacitors'], quests: ['master-the-leylines'] },
    passiveEffects: {
      resourceMultipliers: { mana: 1.1 },
      buildingMultipliers: { shrine: 1.1 },
      tickResourceAdjustments: { mana: 2 },
    },
  },
  warden_barracks: {
    id: 'warden_barracks',
    name: "Warden's Barracks",
    cost: { coin: 140, grain: 30, planks: 20 },
    inputs: { grain: 3 },
    outputs: { defense: 6 },
    workCapacity: 4,
    maxLevel: 3,
    category: 'military',
    prerequisites: { skills: ['militia_watch'], quests: ['secure-trade'] },
    passiveEffects: {
      tickResourceAdjustments: { threat: -1 },
      upkeepDelta: -0.05,
      resourceMultipliers: { defense: 1.1 },
    },
  },
  prismatic_workshop: {
    id: 'prismatic_workshop',
    name: 'Prismatic Workshop',
    cost: { coin: 160, mana: 20, planks: 30 },
    inputs: { wood: 3, mana: 1 },
    outputs: { coin: 14, mana: 4 },
    workCapacity: 4,
    maxLevel: 3,
    category: 'infrastructure',
    prerequisites: { skills: ['leyline_capacitors'], quests: ['command-trade-empire'] },
    passiveEffects: {
      buildingMultipliers: { automation_workshop: 1.15 },
      resourceMultipliers: { coin: 1.05 },
    },
  },
  sky_dock: {
    id: 'sky_dock',
    name: 'Sky Dock',
    cost: { coin: 220, mana: 40, planks: 40 },
    inputs: { grain: 2, coin: 4 },
    outputs: { coin: 20, favor: 3 },
    workCapacity: 5,
    maxLevel: 3,
    category: 'economic',
    prerequisites: { quests: ['command-trade-empire'], era: 'expansion_age' },
    passiveEffects: {
      routeCoinMultiplier: 1.2,
    },
  },
  astral_bastion: {
    id: 'astral_bastion',
    name: 'Astral Bastion',
    cost: { coin: 300, mana: 80, favor: 40, planks: 60 },
    inputs: { mana: 3 },
    outputs: { defense: 12, mana: 6 },
    workCapacity: 0,
    maxLevel: 1,
    category: 'military',
    prerequisites: { era: 'ascension_age', skills: ['astral_bastion'], quests: ['ascension-prelude'] },
    passiveEffects: {
      tickResourceAdjustments: { threat: -2, unrest: -1 },
      resourceMultipliers: { defense: 1.2 },
      globalResourceMultiplier: 1.05,
    },
    unique: true,
  },
  eternal_archive: {
    id: 'eternal_archive',
    name: 'Eternal Archive',
    cost: { coin: 260, mana: 90, favor: 60, planks: 50 },
    inputs: { mana: 2 },
    outputs: { favor: 6, mana: 4 },
    workCapacity: 0,
    maxLevel: 1,
    category: 'mystical',
    prerequisites: { era: 'ascension_age', skills: ['crown_conclave'], quests: ['ascension-prelude'] },
    passiveEffects: {
      buildingMultipliers: { shrine: 1.25, council_hall: 1.1 },
      tickResourceAdjustments: { mana: 3 },
      globalBuildingMultiplier: 1.03,
    },
    unique: true,
  },
});

export type SimBuildingCatalog = typeof SIM_BUILDINGS;
export type SimBuildingId = keyof SimBuildingCatalog;
