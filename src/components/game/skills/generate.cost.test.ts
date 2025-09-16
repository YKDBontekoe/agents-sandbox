import { describe, expect, it } from 'vitest';
import {
  RARITY_BASE_COST,
  calculateNodeCost,
  generateSkillTree,
  getCostMultiplier,
} from './generate';
import type { SkillNode } from './types';

const COIN_BASE_RANGE = { min: 15, max: 50 };
const MANA_BASE_RANGE = { min: 3, max: 11 };
const FAVOR_BASE_RANGE = { min: 2, max: 8 };

describe('skill cost generation', () => {
  it('scales multiplier with tier, rarity, and unlocked progress', () => {
    const base = getCostMultiplier(0, 'common', 0);
    const tierBump = getCostMultiplier(3, 'common', 0);
    const rarityBump = getCostMultiplier(0, 'rare', 0);
    const progressBump = getCostMultiplier(0, 'common', 12);

    expect(tierBump).toBeGreaterThan(base);
    expect(rarityBump).toBeGreaterThan(base);
    expect(progressBump).toBeGreaterThan(base);
  });

  it('derives node costs from baseCost and multiplier', () => {
    const node: Pick<SkillNode, 'baseCost' | 'rarity' | 'tier'> = {
      baseCost: { coin: 80, mana: 20, favor: 10 },
      rarity: 'rare',
      tier: 4,
    };
    const unlockedCount = 9;
    const multiplier = getCostMultiplier(node.tier ?? 0, node.rarity, unlockedCount);
    const cost = calculateNodeCost(node, unlockedCount);

    expect(cost.coin).toBe(Math.round((node.baseCost.coin ?? 0) * multiplier));
    expect(cost.mana).toBe(Math.round((node.baseCost.mana ?? 0) * multiplier));
    expect(cost.favor).toBe(Math.round((node.baseCost.favor ?? 0) * multiplier));
  });

  it('keeps generated costs within expected rarity/tier ranges', () => {
    const unlockedCount = 18;
    const tree = generateSkillTree(424242, 8, { unlockedCount });

    const observed = new Map<string, { coin: { min: number; max: number }; mana: { min: number; max: number }; favor: { min: number; max: number } }>();

    tree.nodes.forEach((node) => {
      const tier = node.tier ?? 0;
      const key = `${tier}:${node.rarity}`;
      const current = observed.get(key) ?? {
        coin: { min: Number.POSITIVE_INFINITY, max: 0 },
        mana: { min: Number.POSITIVE_INFINITY, max: 0 },
        favor: { min: Number.POSITIVE_INFINITY, max: 0 },
      };

      current.coin.min = Math.min(current.coin.min, node.cost.coin ?? 0);
      current.coin.max = Math.max(current.coin.max, node.cost.coin ?? 0);
      current.mana.min = Math.min(current.mana.min, node.cost.mana ?? 0);
      current.mana.max = Math.max(current.mana.max, node.cost.mana ?? 0);
      current.favor.min = Math.min(current.favor.min, node.cost.favor ?? 0);
      current.favor.max = Math.max(current.favor.max, node.cost.favor ?? 0);

      observed.set(key, current);
    });

    observed.forEach((stats, key) => {
      const [tierStr, rarity] = key.split(':') as [string, SkillNode['rarity']];
      const tier = Number(tierStr);
      const base = RARITY_BASE_COST[rarity];
      const multiplier = getCostMultiplier(tier, rarity, unlockedCount);

      const expectedCoinMin = Math.round(Math.round(COIN_BASE_RANGE.min * base) * multiplier);
      const expectedCoinMax = Math.round(Math.round(COIN_BASE_RANGE.max * base) * multiplier);
      const expectedManaMin = Math.round(Math.round(MANA_BASE_RANGE.min * base) * multiplier);
      const expectedManaMax = Math.round(Math.round(MANA_BASE_RANGE.max * base) * multiplier);
      const expectedFavorMin = Math.round(Math.round(FAVOR_BASE_RANGE.min * base) * multiplier);
      const expectedFavorMax = Math.round(Math.round(FAVOR_BASE_RANGE.max * base) * multiplier);

      expect(stats.coin.min).toBeGreaterThanOrEqual(expectedCoinMin);
      expect(stats.coin.max).toBeLessThanOrEqual(expectedCoinMax);
      expect(stats.mana.min).toBeGreaterThanOrEqual(expectedManaMin);
      expect(stats.mana.max).toBeLessThanOrEqual(expectedManaMax);
      expect(stats.favor.min).toBeGreaterThanOrEqual(expectedFavorMin);
      expect(stats.favor.max).toBeLessThanOrEqual(expectedFavorMax);
    });
  });

  it('raises costs as more skills are unlocked', () => {
    const seed = 777;
    const baseline = generateSkillTree(seed, 8, { unlockedCount: 0 });
    const progressed = generateSkillTree(seed, 8, { unlockedCount: 25 });

    baseline.nodes.forEach((node, idx) => {
      const progressedNode = progressed.nodes[idx];
      expect((progressedNode.cost.coin ?? 0)).toBeGreaterThanOrEqual(node.cost.coin ?? 0);
      expect((progressedNode.cost.mana ?? 0)).toBeGreaterThanOrEqual(node.cost.mana ?? 0);
      expect((progressedNode.cost.favor ?? 0)).toBeGreaterThanOrEqual(node.cost.favor ?? 0);
    });
  });
});
