export interface EraPressureValues {
  unrest: number;
  threat: number;
  manaUpkeep: number;
}

export type EraGoalMetric = 'citySize' | 'questsCompleted' | 'stability' | 'manaReserve' | 'favor';

export interface EraRequirements {
  minCitySize: number;
  minQuestsCompleted: number;
}

export interface EraScalingConfig {
  citySize?: {
    start: number;
    perBuilding: Partial<EraPressureValues>;
  };
  questsCompleted?: {
    start: number;
    perQuest: Partial<EraPressureValues>;
  };
}

export interface EraMitigationRequirement {
  citySize?: number;
  questsCompleted?: number;
  stability?: number;
  manaReserve?: number;
  favor?: number;
}

export interface EraMitigationDefinition {
  id: string;
  name: string;
  description: string;
  requirement: EraMitigationRequirement;
  effects: Partial<EraPressureValues>;
}

export interface EraGoalDefinition {
  id: string;
  description: string;
  metric: EraGoalMetric;
  target: number;
  optional?: boolean;
}

export interface EraDefinition {
  id: string;
  name: string;
  description: string;
  requirements: EraRequirements;
  basePressures: EraPressureValues;
  scaling?: EraScalingConfig;
  mitigations: EraMitigationDefinition[];
  goals: EraGoalDefinition[];
  upcomingCrises: string[];
  victoryCondition?: string;
  ascensionCondition?: string;
}

export interface EraMitigationState extends EraMitigationDefinition {
  unlocked: boolean;
  progress: number;
}

export interface EraGoalState extends EraGoalDefinition {
  current: number;
  progress: number;
  completed: boolean;
}

export interface EraProgressMetrics {
  citySize: number;
  questsCompleted: number;
  stability: number;
  manaReserve: number;
  favor: number;
}

export interface EraPressuresSummary {
  base: EraPressureValues;
  mitigation: EraPressureValues;
  effective: EraPressureValues;
}

export interface EraPreview {
  id: string;
  name: string;
  description: string;
  requirements: EraRequirements;
  basePressures: EraPressureValues;
}

export interface EraStatus {
  id: string;
  name: string;
  stageIndex: number;
  description: string;
  pressures: EraPressuresSummary;
  mitigations: EraMitigationState[];
  goals: EraGoalState[];
  progress: EraProgressMetrics;
  overallGoalProgress: number;
  progressToNextEra: number;
  nextEra?: EraPreview;
  upcomingCrises: string[];
  victoryCondition?: string;
  ascensionCondition?: string;
}

export interface EraEvaluationInput {
  cycle: number;
  citySize: number;
  questsCompleted: number;
  unrest: number;
  threat: number;
  manaReserve: number;
  favor: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const clampPressures = (values: EraPressureValues): EraPressureValues => ({
  unrest: Math.max(0, Number.isFinite(values.unrest) ? values.unrest : 0),
  threat: Math.max(0, Number.isFinite(values.threat) ? values.threat : 0),
  manaUpkeep: Math.max(0, Number.isFinite(values.manaUpkeep) ? values.manaUpkeep : 0)
});

const addPressures = (a: EraPressureValues, b: Partial<EraPressureValues>): EraPressureValues => ({
  unrest: a.unrest + (b.unrest ?? 0),
  threat: a.threat + (b.threat ?? 0),
  manaUpkeep: a.manaUpkeep + (b.manaUpkeep ?? 0)
});

const multiplyPressures = (
  perUnit: Partial<EraPressureValues>,
  units: number
): Partial<EraPressureValues> => ({
  unrest: (perUnit.unrest ?? 0) * units,
  threat: (perUnit.threat ?? 0) * units,
  manaUpkeep: (perUnit.manaUpkeep ?? 0) * units
});

const computeStabilityScore = (unrest: number, threat: number): number => {
  const unrestPenalty = clamp(unrest, 0, 100);
  const threatPenalty = clamp(threat, 0, 100);
  const raw = 100 - unrestPenalty * 0.6 - threatPenalty * 0.4;
  return clamp(raw, 0, 100);
};

const computeRequirementProgress = (
  requirement: EraMitigationRequirement,
  metrics: EraProgressMetrics
): number => {
  const values: number[] = [];
  if (requirement.citySize !== undefined) {
    const target = Math.max(1, requirement.citySize);
    values.push(metrics.citySize / target);
  }
  if (requirement.questsCompleted !== undefined) {
    const target = Math.max(1, requirement.questsCompleted);
    values.push(metrics.questsCompleted / target);
  }
  if (requirement.stability !== undefined) {
    const target = Math.max(1, requirement.stability);
    values.push(metrics.stability / target);
  }
  if (requirement.manaReserve !== undefined) {
    const target = Math.max(1, requirement.manaReserve);
    values.push(metrics.manaReserve / target);
  }
  if (requirement.favor !== undefined) {
    const target = Math.max(1, requirement.favor);
    values.push(metrics.favor / target);
  }
  if (values.length === 0) return 1;
  return clamp(Math.min(...values), 0, 2);
};

const getMetricValue = (metric: EraGoalMetric, metrics: EraProgressMetrics): number => {
  switch (metric) {
    case 'citySize':
      return metrics.citySize;
    case 'questsCompleted':
      return metrics.questsCompleted;
    case 'stability':
      return metrics.stability;
    case 'manaReserve':
      return metrics.manaReserve;
    case 'favor':
      return metrics.favor;
    default:
      return 0;
  }
};

const createGoalState = (
  goal: EraGoalDefinition,
  metrics: EraProgressMetrics
): EraGoalState => {
  const current = getMetricValue(goal.metric, metrics);
  const target = Math.max(1, goal.target);
  const progress = clamp(current / target, 0, 2);
  return {
    ...goal,
    current,
    progress,
    completed: progress >= 1
  };
};

const evaluateMitigations = (
  definition: EraDefinition,
  metrics: EraProgressMetrics
): { mitigations: EraMitigationState[]; mitigationTotals: EraPressureValues } => {
  const mitigationTotals: EraPressureValues = { unrest: 0, threat: 0, manaUpkeep: 0 };
  const mitigations = definition.mitigations.map(mitigation => {
    const progress = computeRequirementProgress(mitigation.requirement, metrics);
    const unlocked = progress >= 1;
    if (unlocked) {
      mitigationTotals.unrest += mitigation.effects.unrest ?? 0;
      mitigationTotals.threat += mitigation.effects.threat ?? 0;
      mitigationTotals.manaUpkeep += mitigation.effects.manaUpkeep ?? 0;
    }
    return {
      ...mitigation,
      progress: clamp(progress, 0, 1),
      unlocked
    };
  });

  return {
    mitigations,
    mitigationTotals
  };
};

const applyScaling = (
  definition: EraDefinition,
  metrics: EraProgressMetrics
): EraPressureValues => {
  let pressures = { ...definition.basePressures };
  if (definition.scaling?.citySize) {
    const extra = Math.max(0, metrics.citySize - definition.scaling.citySize.start);
    if (extra > 0) {
      pressures = addPressures(pressures, multiplyPressures(definition.scaling.citySize.perBuilding, extra));
    }
  }
  if (definition.scaling?.questsCompleted) {
    const extra = Math.max(0, metrics.questsCompleted - definition.scaling.questsCompleted.start);
    if (extra > 0) {
      pressures = addPressures(pressures, multiplyPressures(definition.scaling.questsCompleted.perQuest, extra));
    }
  }
  return pressures;
};

export const ERA_DEFINITIONS: EraDefinition[] = [
  {
    id: 'founding_age',
    name: 'Founding Age',
    description: 'The first wards flare to life. Secure the perimeter and earn the trust of the fledgling populace.',
    requirements: { minCitySize: 0, minQuestsCompleted: 0 },
    basePressures: { unrest: 1, threat: 1, manaUpkeep: 5 },
    scaling: {
      citySize: { start: 6, perBuilding: { unrest: 0.2, threat: 0.15, manaUpkeep: 0.1 } },
      questsCompleted: { start: 1, perQuest: { unrest: -0.3, threat: -0.2, manaUpkeep: -0.1 } }
    },
    mitigations: [
      {
        id: 'militia_watch',
        name: 'Wardens on Patrol',
        description: 'Assign neighborhood watches to quell rumors and break up unrest before it spreads.',
        requirement: { citySize: 8 },
        effects: { unrest: -1 }
      },
      {
        id: 'ritual_anchor',
        name: 'Ritual Anchorstones',
        description: 'Complete civic rites to anchor mana conduits and steady upkeep.',
        requirement: { questsCompleted: 2 },
        effects: { manaUpkeep: -1 }
      }
    ],
    goals: [
      { id: 'founding_city', description: 'Raise eight functional structures to house and feed your people.', metric: 'citySize', target: 8 },
      { id: 'founding_quests', description: 'Complete two civic quests to earn public trust.', metric: 'questsCompleted', target: 2 },
      { id: 'founding_stability', description: 'Keep stability above 55 to reassure the council.', metric: 'stability', target: 55, optional: true }
    ],
    upcomingCrises: [
      'Border skirmishes intensify if threat rises above 40.',
      'Food riots begin if unrest breaches 35 without mitigation.'
    ],
    victoryCondition: 'Expand and stabilize to usher in the Age of Expansion.'
  },
  {
    id: 'expansion_age',
    name: 'Age of Expansion',
    description: 'Trade routes bloom and the outer districts swell. Balance prosperity against brewing rivalries.',
    requirements: { minCitySize: 12, minQuestsCompleted: 3 },
    basePressures: { unrest: 2, threat: 2, manaUpkeep: 7 },
    scaling: {
      citySize: { start: 16, perBuilding: { unrest: 0.25, threat: 0.2, manaUpkeep: 0.15 } },
      questsCompleted: { start: 3, perQuest: { unrest: -0.25, threat: -0.15, manaUpkeep: -0.1 } }
    },
    mitigations: [
      {
        id: 'district_councils',
        name: 'District Councils',
        description: 'Empower district elders to arbitrate disputes before they erupt.',
        requirement: { citySize: 16 },
        effects: { unrest: -1 }
      },
      {
        id: 'arcane_customs',
        name: 'Arcane Customs Brokers',
        description: 'Quell contraband smuggling that feeds border warbands.',
        requirement: { questsCompleted: 5 },
        effects: { threat: -1 }
      },
      {
        id: 'leyline_capacitors',
        name: 'Leyline Capacitors',
        description: 'Install lattice capacitors that recycle ambient mana.',
        requirement: { stability: 60 },
        effects: { manaUpkeep: -1.5 }
      }
    ],
    goals: [
      { id: 'expansion_city', description: 'Grow to eighteen core structures with efficient logistics.', metric: 'citySize', target: 18 },
      { id: 'expansion_quests', description: 'Broker five major trade or civic agreements.', metric: 'questsCompleted', target: 5 },
      { id: 'expansion_stability', description: 'Hold stability near 65 to keep factions aligned.', metric: 'stability', target: 65 }
    ],
    upcomingCrises: [
      'Merchant guild feuds erupt if unrest passes 55.',
      'Foreign envoys test your defenses if threat exceeds 50.'
    ],
    victoryCondition: 'Fortify trade and resolve rivalries to weather the coming unrest.'
  },
  {
    id: 'unrest_age',
    name: 'Age of Unrest',
    description: 'Old grievances flare and void cults test the wards. Only decisive governance can keep collapse at bay.',
    requirements: { minCitySize: 24, minQuestsCompleted: 7 },
    basePressures: { unrest: 3, threat: 3, manaUpkeep: 9 },
    scaling: {
      citySize: { start: 28, perBuilding: { unrest: 0.35, threat: 0.35, manaUpkeep: 0.2 } },
      questsCompleted: { start: 7, perQuest: { unrest: -0.3, threat: -0.3, manaUpkeep: -0.15 } }
    },
    mitigations: [
      {
        id: 'shadow_network',
        name: 'Shadow Network',
        description: 'Deploy informants to intercept cult plots before they manifest.',
        requirement: { questsCompleted: 8 },
        effects: { threat: -1.5 }
      },
      {
        id: 'warded_districts',
        name: 'Warded Districts',
        description: 'Raise reinforced wards around high-risk boroughs.',
        requirement: { citySize: 28 },
        effects: { unrest: -1.5 }
      },
      {
        id: 'astral_circuit',
        name: 'Astral Circuit',
        description: 'Channel surplus mana through an astral circuit to relieve upkeep.',
        requirement: { stability: 70 },
        effects: { manaUpkeep: -2 }
      }
    ],
    goals: [
      { id: 'unrest_city', description: 'Consolidate thirty vital structures under fortified wards.', metric: 'citySize', target: 30 },
      { id: 'unrest_quests', description: 'Resolve nine major crises to reassure the populace.', metric: 'questsCompleted', target: 9 },
      { id: 'unrest_stability', description: 'Sustain stability above 70 to keep tempers in check.', metric: 'stability', target: 70 }
    ],
    upcomingCrises: [
      'Void rifts manifest if threat soars past 60.',
      'Council schisms threaten governance when unrest breaches 65.'
    ],
    victoryCondition: 'Close the rifts and unify the council to prepare for ascension.'
  },
  {
    id: 'ascension_age',
    name: 'Age of Ascension',
    description: 'The Dominion stands on the brink of legend. Harness the ley network and uplift the people or fall to cataclysm.',
    requirements: { minCitySize: 36, minQuestsCompleted: 10 },
    basePressures: { unrest: 4, threat: 4, manaUpkeep: 11 },
    scaling: {
      citySize: { start: 40, perBuilding: { unrest: 0.4, threat: 0.4, manaUpkeep: 0.25 } },
      questsCompleted: { start: 10, perQuest: { unrest: -0.4, threat: -0.35, manaUpkeep: -0.2 } }
    },
    mitigations: [
      {
        id: 'crown_conclave',
        name: 'Crown Conclave',
        description: 'Seat a conclave of guild champions to pacify factional strife.',
        requirement: { questsCompleted: 12 },
        effects: { unrest: -2 }
      },
      {
        id: 'astral_bastion',
        name: 'Astral Bastion',
        description: 'Erect a permanent bastion that nullifies external threats.',
        requirement: { citySize: 42 },
        effects: { threat: -2 }
      },
      {
        id: 'soul_forge',
        name: 'Soul Forge',
        description: 'Stabilize the Soul Forge to recycle ley surges into mana reserves.',
        requirement: { manaReserve: 350 },
        effects: { manaUpkeep: -3 }
      }
    ],
    goals: [
      { id: 'ascension_quests', description: 'Complete twelve grand quests to inspire the populace.', metric: 'questsCompleted', target: 12 },
      { id: 'ascension_stability', description: 'Maintain stability above 80 to avert schism.', metric: 'stability', target: 80 },
      { id: 'ascension_mana', description: 'Bank 300 mana to empower the ascension ritual.', metric: 'manaReserve', target: 300 }
    ],
    upcomingCrises: [
      'Void storms cascade if threat spikes beyond 70.',
      'Ascension backlash strikes if mana reserves plunge under 100.'
    ],
    victoryCondition: 'Complete the ascension rite to secure the Dominion’s legacy.',
    ascensionCondition: 'Complete twelve grand quests and sustain stability above 80 for three consecutive cycles while holding 300 mana.'
  }
];

const determineEraIndex = (input: EraEvaluationInput): number => {
  for (let index = ERA_DEFINITIONS.length - 1; index >= 0; index -= 1) {
    const def = ERA_DEFINITIONS[index];
    if (
      input.citySize >= def.requirements.minCitySize &&
      input.questsCompleted >= def.requirements.minQuestsCompleted
    ) {
      return index;
    }
  }
  return 0;
};

export function evaluateEra(input: EraEvaluationInput): EraStatus {
  const eraIndex = determineEraIndex(input);
  const definition = ERA_DEFINITIONS[eraIndex];
  const metrics: EraProgressMetrics = {
    citySize: input.citySize,
    questsCompleted: input.questsCompleted,
    stability: computeStabilityScore(input.unrest, input.threat),
    manaReserve: Math.max(0, input.manaReserve),
    favor: Math.max(0, input.favor)
  };

  const scaledBase = applyScaling(definition, metrics);
  const { mitigations, mitigationTotals } = evaluateMitigations(definition, metrics);
  const effective = clampPressures(addPressures(scaledBase, mitigationTotals));

  const goals = definition.goals.map(goal => createGoalState(goal, metrics));
  const overallGoalProgress = goals.length > 0
    ? goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length
    : 1;

  const nextDefinition = ERA_DEFINITIONS[eraIndex + 1];
  let progressToNextEra = 1;
  let nextEra: EraPreview | undefined;
  if (nextDefinition) {
    const cityRatio = metrics.citySize / Math.max(1, nextDefinition.requirements.minCitySize);
    const questRatio = metrics.questsCompleted / Math.max(1, nextDefinition.requirements.minQuestsCompleted);
    progressToNextEra = clamp((cityRatio + questRatio) / 2, 0, 1);
    nextEra = {
      id: nextDefinition.id,
      name: nextDefinition.name,
      description: nextDefinition.description,
      requirements: nextDefinition.requirements,
      basePressures: nextDefinition.basePressures
    };
  }

  return {
    id: definition.id,
    name: definition.name,
    stageIndex: eraIndex,
    description: definition.description,
    pressures: {
      base: clampPressures(scaledBase),
      mitigation: mitigationTotals,
      effective
    },
    mitigations,
    goals,
    progress: metrics,
    overallGoalProgress,
    progressToNextEra,
    nextEra,
    upcomingCrises: definition.upcomingCrises,
    victoryCondition: definition.victoryCondition,
    ascensionCondition: definition.ascensionCondition
  };
}
