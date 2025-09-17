import type { NodeQuality, SkillEffect, SkillNode } from '../types';

export type RNG = () => number;

export const SKILL_CATEGORIES: ReadonlyArray<SkillNode['category']> = [
  'economic',
  'military',
  'mystical',
  'infrastructure',
  'diplomatic',
  'social',
];

export function mulberry32(seed: number): RNG {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: RNG, arr: ReadonlyArray<T>): T {
  if (arr.length === 0) {
    throw new Error('Cannot pick from an empty array');
  }
  return arr[Math.floor(rng() * arr.length)];
}

export function buildCategoryEffects(rng: RNG, category: SkillNode['category']): SkillEffect[] {
  switch (category) {
    case 'economic':
      return rng() < 0.5
        ? [{ kind: 'resource_multiplier', resource: 'coin', factor: 1.06 + rng() * 0.08 }]
        : [{ kind: 'route_bonus', percent: 5 + Math.floor(rng() * 10) }];
    case 'military':
      return [{ kind: 'upkeep_delta', grainPerWorkerDelta: -0.02 - rng() * 0.04 }];
    case 'mystical':
      return [{ kind: 'resource_multiplier', resource: 'mana', factor: 1.08 + rng() * 0.10 }];
    case 'infrastructure':
      return rng() < 0.5
        ? [{
            kind: 'building_multiplier',
            typeId: pick(rng, ['farm', 'lumber_camp', 'sawmill', 'trade_post', 'storehouse']),
            factor: 1.10 + rng() * 0.12,
          }]
        : [{ kind: 'logistics_bonus', percent: 5 + Math.floor(rng() * 10) }];
    case 'diplomatic':
      return [{ kind: 'resource_multiplier', resource: 'favor', factor: 1.10 + rng() * 0.12 }];
    case 'social':
      return [{ kind: 'resource_multiplier', resource: 'grain', factor: 1.05 + rng() * 0.08 }];
  }
}

export function buildCost(
  rng: RNG,
  rarity: SkillNode['rarity'],
  unlockCount: number = 0,
): { cost: SkillNode['cost']; baseCost: SkillNode['baseCost'] } {
  const rarityMultiplier = rarity === 'common' ? 1 : rarity === 'uncommon' ? 1.5 : rarity === 'rare' ? 2 : 3;
  const progressiveMultiplier = 1 + unlockCount * 0.15;

  const baseCost = {
    coin: Math.round((15 + rng() * 35) * rarityMultiplier),
    mana: Math.round((3 + rng() * 8) * rarityMultiplier),
    favor: Math.round((2 + rng() * 6) * rarityMultiplier),
  };

  const cost = {
    coin: Math.round(baseCost.coin! * progressiveMultiplier),
    mana: Math.round(baseCost.mana! * progressiveMultiplier),
    favor: Math.round(baseCost.favor! * progressiveMultiplier),
  };

  return { cost, baseCost };
}

export function pickRarity(rng: RNG): SkillNode['rarity'] {
  const roll = rng();
  if (roll < 0.55) return 'common';
  if (roll < 0.85) return 'uncommon';
  if (roll < 0.97) return 'rare';
  return 'legendary';
}

export function pickQuality(rng: RNG, tier: number): NodeQuality {
  const roll = rng();
  const tierBonus = tier * 0.05;
  if (roll < 0.4 - tierBonus) return 'common';
  if (roll < 0.7 - tierBonus) return 'rare';
  if (roll < 0.9 - tierBonus) return 'epic';
  return 'legendary';
}

export function getQualityMultiplier(quality: NodeQuality): number {
  switch (quality) {
    case 'common':
      return 1.0;
    case 'rare':
      return 1.3;
    case 'epic':
      return 1.6;
    case 'legendary':
      return 2.0;
  }
}

export function getSynergyCategories(category: SkillNode['category']): SkillNode['category'][] {
  const synergies: Record<SkillNode['category'], SkillNode['category'][]> = {
    economic: ['diplomatic', 'infrastructure'],
    military: ['infrastructure', 'social'],
    mystical: ['economic', 'diplomatic'],
    infrastructure: ['economic', 'military'],
    diplomatic: ['economic', 'mystical'],
    social: ['military', 'diplomatic'],
  };
  return synergies[category] ?? [];
}
