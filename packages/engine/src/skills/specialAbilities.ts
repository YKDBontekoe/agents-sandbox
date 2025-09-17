import type { NodeQuality, SkillNode, SpecialAbility } from './types';

export interface SpecialAbilityContent {
  id: string;
  name: string;
  description: string;
  power: number;
  flavor?: string;
  duration?: string;
  cooldown?: string;
}

const SPECIAL_ABILITIES: Record<SkillNode['category'], SpecialAbilityContent[]> = {
  economic: [
    {
      id: 'golden_touch',
      name: 'Golden Touch',
      description: 'Doubles coin generation from all economic buildings for a short time.',
      power: 2,
      flavor: 'Treasurers whisper of ledgers that ink themselves in radiant gold.',
      duration: '5 minutes',
      cooldown: 'Once per cycle',
    },
    {
      id: 'market_insight',
      name: 'Market Insight',
      description: 'Reveals optimal trade routes and grants bonus tariffs while active.',
      power: 1.5,
      flavor: 'Scribes chart phantom caravans that never miss a profit.',
      duration: '3 minutes',
      cooldown: 'Twice per cycle',
    },
  ],
  military: [
    {
      id: 'battle_fury',
      name: 'Battle Fury',
      description: 'Halves military upkeep and rallies defenders with renewed vigor.',
      power: 0.5,
      flavor: 'Wardens carve runes into shields that burn like sunrise.',
      duration: '4 minutes',
      cooldown: 'Once per cycle',
    },
    {
      id: 'fortress_shield',
      name: 'Fortress Shield',
      description: 'Projects a barrier that nullifies raids and border incursions temporarily.',
      power: 0,
      flavor: 'Citadel walls hum as an astral shell seals every gate.',
      duration: '10 minutes',
      cooldown: 'Once per two cycles',
    },
  ],
  mystical: [
    {
      id: 'mana_storm',
      name: 'Mana Storm',
      description: 'Triples mana generation and awakens latent ley currents.',
      power: 3,
      flavor: 'Ley lines arc overhead like chained lightning made patient.',
      duration: '3 minutes',
      cooldown: 'Once per cycle',
    },
    {
      id: 'arcane_mastery',
      name: 'Arcane Mastery',
      description: 'Reveals hidden mystical nodes and grants a scrying boon.',
      power: 1,
      flavor: 'Mystics taste the ozone tang of secrets clawing into the light.',
      duration: 'Until next unlock',
      cooldown: 'Thrice per cycle',
    },
  ],
  infrastructure: [
    {
      id: 'rapid_construction',
      name: 'Rapid Construction',
      description: 'Completes all queued infrastructure instantly at no extra cost.',
      power: 1,
      flavor: 'Builder crews move as if tomorrow already happened.',
      duration: 'Instant',
      cooldown: 'Once per cycle',
    },
    {
      id: 'efficiency_boost',
      name: 'Efficiency Boost',
      description: 'Increases all building output substantially while the boon persists.',
      power: 1.5,
      flavor: 'Gearworks spin with a bright, orderly hymn.',
      duration: '6 minutes',
      cooldown: 'Twice per cycle',
    },
  ],
  diplomatic: [
    {
      id: 'silver_tongue',
      name: 'Silver Tongue',
      description: 'Doubles favor gains from treaties, festivals, and emissaries.',
      power: 2,
      flavor: 'Envoys speak in mirrored phrases that charm every hall.',
      duration: '5 minutes',
      cooldown: 'Once per cycle',
    },
    {
      id: 'peace_treaty',
      name: 'Peace Treaty',
      description: 'Eliminates all diplomatic penalties and unrest from foreign agents temporarily.',
      power: 1,
      flavor: 'Scrolls seal themselves with wax that never cools.',
      duration: '8 minutes',
      cooldown: 'Once per two cycles',
    },
  ],
  social: [
    {
      id: 'festival_spirit',
      name: 'Festival Spirit',
      description: 'Boosts all resource generation across the city as celebrations erupt.',
      power: 1.25,
      flavor: 'Lanterns bloom in the streets, warming grain stores and hearts alike.',
      duration: '4 minutes',
      cooldown: 'Twice per cycle',
    },
    {
      id: 'unity_bond',
      name: 'Unity Bond',
      description: 'Reduces every cost by invoking collective guild stewardship.',
      power: 0.7,
      flavor: 'Councilors clasp hands as silver threads stitch every guild crest.',
      duration: '5 minutes',
      cooldown: 'Once per cycle',
    },
  ],
};

const SPECIAL_ABILITIES_BY_ID = new Map<string, SpecialAbilityContent>();
for (const list of Object.values(SPECIAL_ABILITIES)) {
  for (const ability of list) {
    SPECIAL_ABILITIES_BY_ID.set(ability.id, ability);
  }
}

export const specialAbilityCatalog = SPECIAL_ABILITIES;

export function rollSpecialAbility(
  category: SkillNode['category'],
  quality: NodeQuality,
  rng: () => number,
): SpecialAbility | undefined {
  if (quality === 'common') return undefined;
  const options = SPECIAL_ABILITIES[category];
  if (!options || options.length === 0) return undefined;
  const selection = options[Math.floor(rng() * options.length)];
  return {
    ...selection,
    quality,
  };
}

export function resolveSpecialAbility(
  ability: SpecialAbility | undefined | null,
): (SpecialAbility & SpecialAbilityContent) | undefined {
  if (!ability) return undefined;
  const catalogEntry = SPECIAL_ABILITIES_BY_ID.get(ability.id);
  if (!catalogEntry) {
    return ability;
  }
  return {
    ...catalogEntry,
    ...ability,
    description: ability.description || catalogEntry.description,
    flavor: ability.flavor ?? catalogEntry.flavor,
    duration: ability.duration ?? catalogEntry.duration,
    cooldown: ability.cooldown ?? catalogEntry.cooldown,
    quality: ability.quality,
  };
}

export function getSpecialAbilityContent(id: string): SpecialAbilityContent | undefined {
  return SPECIAL_ABILITIES_BY_ID.get(id);
}
