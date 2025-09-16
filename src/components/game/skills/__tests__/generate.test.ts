import { describe, expect, it } from 'vitest';
import { expandSkillTree, generateSkillTree } from '../generate';

const ACHIEVEMENT_IDS = [
  'first_unlock',
  'quality_collector',
  'legendary_master',
  'tier_master',
  'category_specialist',
];

describe('skill tree generation orchestration', () => {
  it('builds consistent nodes, edges, and achievements', () => {
    const tree = generateSkillTree(123, 4);

    expect(tree.nodes.length).toBeGreaterThan(0);
    const totalFromLayout = Object.values(tree.layout?.tiers ?? {}).reduce(
      (sum, tierNodes) => sum + tierNodes.length,
      0,
    );
    expect(totalFromLayout).toBe(tree.nodes.length);

    tree.nodes.forEach(node => {
      node.requires?.forEach(req => {
        expect(tree.edges).toContainEqual({ from: req, to: node.id });
      });
    });

    const achievements = tree.progressionData?.achievements ?? [];
    expect(achievements.map(achievement => achievement.id)).toEqual(ACHIEVEMENT_IDS);
  });

  it('expands trees with new tiers while preserving prerequisite edges', () => {
    const base = generateSkillTree(77, 3);
    const originalCount = base.nodes.length;
    const originalMaxTier = base.layout?.maxTier ?? -1;

    const expanded = expandSkillTree(base, 91, 2);
    expect(expanded.nodes.length).toBeGreaterThan(originalCount);
    expect(expanded.layout?.maxTier).toBe(originalMaxTier + 2);

    const newNodes = expanded.nodes.slice(originalCount);
    newNodes.forEach(node => {
      node.requires?.forEach(req => {
        expect(expanded.edges).toContainEqual({ from: req, to: node.id });
      });
    });

    for (let offset = 1; offset <= 2; offset++) {
      const tierIndex = originalMaxTier + offset;
      const tierNodes = expanded.layout?.tiers[tierIndex] ?? [];
      expect(tierNodes.length).toBeGreaterThan(0);
      const economicCount = expanded.layout?.categoryDistribution.economic[tierIndex] ?? 0;
      expect(economicCount).toBeGreaterThanOrEqual(0);
    }
  });
});
