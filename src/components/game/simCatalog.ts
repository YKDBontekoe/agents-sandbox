import {
  SIM_BUILDINGS,
  evaluateBuildingPrerequisites,
  type BuildingPrerequisiteContext,
  type BuildingPrerequisiteStatus,
  type SimBuildingType,
} from '@engine';

export { SIM_BUILDINGS };
export type { SimBuildingType };

export type BuildTypeId = keyof typeof SIM_BUILDINGS;

export const BUILDABLE_TILES: Record<BuildTypeId, string[]> = {
  council_hall: ['grass', 'mountain'],
  trade_post: ['grass'],
  automation_workshop: ['grass'],
  farm: ['grass'],
  house: ['grass'],
  shrine: ['grass'],
  lumber_camp: ['forest'],
  sawmill: ['grass'],
  storehouse: ['grass'],
  arcane_conduit: ['grass'],
  warden_barracks: ['grass'],
  prismatic_workshop: ['grass'],
  sky_dock: ['grass'],
  astral_bastion: ['grass', 'mountain'],
  eternal_archive: ['grass'],
};

export interface BuildMenuGroup {
  id: string;
  label: string;
  types: BuildTypeId[];
}

export const BUILD_MENU_GROUPS: BuildMenuGroup[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    types: ['farm', 'house', 'council_hall', 'storehouse', 'lumber_camp', 'sawmill'],
  },
  {
    id: 'commerce',
    label: 'Commerce & Arcana',
    types: ['trade_post', 'automation_workshop', 'prismatic_workshop', 'shrine', 'arcane_conduit'],
  },
  {
    id: 'defense',
    label: 'Defense & Logistics',
    types: ['warden_barracks', 'sky_dock'],
  },
  {
    id: 'wonders',
    label: 'Unique Wonders',
    types: ['astral_bastion', 'eternal_archive'],
  },
];

export interface BuildingAvailabilityContext extends BuildingPrerequisiteContext {
  existingBuildings?: Array<{ typeId: BuildTypeId | string }>;
  skillLabels?: Record<string, string>;
  questLabels?: Record<string, string>;
  eraLabels?: Record<string, string>;
}

export interface BuildingAvailability {
  typeId: BuildTypeId;
  status: BuildingPrerequisiteStatus;
  meetsPrerequisites: boolean;
  uniqueLocked: boolean;
  reasons: string[];
  requirementSummaries: string[];
}

export function evaluateBuildingAvailability(
  typeId: BuildTypeId,
  context: BuildingAvailabilityContext,
): BuildingAvailability {
  const def = SIM_BUILDINGS[typeId];
  const status = evaluateBuildingPrerequisites(def?.prerequisites, context);
  const existing = context.existingBuildings ?? [];
  const uniqueLocked = Boolean(def?.unique && existing.some(b => String(b.typeId) === typeId));
  const reasons: string[] = [];
  if (uniqueLocked) {
    reasons.push('Unique structure already constructed');
  }
  const labelSkill = (id: string) => context.skillLabels?.[id] ?? id;
  const labelQuest = (id: string) => context.questLabels?.[id] ?? id;
  const labelEra = (id: string) => context.eraLabels?.[id] ?? id;
  if (status.missingSkills.length > 0) {
    status.missingSkills.forEach(id => {
      reasons.push(`Unlock skill: ${labelSkill(id)}`);
    });
  }
  if (status.missingQuests.length > 0) {
    status.missingQuests.forEach(id => {
      reasons.push(`Complete quest: ${labelQuest(id)}`);
    });
  }
  if (status.missingEra) {
    reasons.push(`Reach ${labelEra(status.missingEra)}`);
  }
  const requirementSummaries: string[] = [];
  if (def?.unique) {
    requirementSummaries.push('Unique wonder (only one may stand)');
  }
  const prereq = def?.prerequisites;
  if (prereq?.skills && prereq.skills.length > 0) {
    const parts = prereq.skills.map(id => {
      const name = labelSkill(id);
      return status.missingSkills.includes(id) ? `${name} (locked)` : `${name} (met)`;
    });
    requirementSummaries.push(`Skills: ${parts.join(', ')}`);
  }
  if (prereq?.quests && prereq.quests.length > 0) {
    const parts = prereq.quests.map(id => {
      const name = labelQuest(id);
      return status.missingQuests.includes(id) ? `${name} (locked)` : `${name} (met)`;
    });
    requirementSummaries.push(`Quests: ${parts.join(', ')}`);
  }
  if (prereq?.era) {
    const name = labelEra(prereq.era);
    const met = !status.missingEra;
    requirementSummaries.push(`Era: ${name}${met ? ' (met)' : ' (locked)'}`);
  }
  return {
    typeId,
    status,
    meetsPrerequisites: status.meetsRequirements && !uniqueLocked,
    uniqueLocked,
    reasons,
    requirementSummaries,
  };
}
