import { describe, expect, it } from 'vitest';
import { createConstellationLayout } from './constellation';
import type { SkillNode, SkillTree } from '../types';

const makeNode = (id: string, overrides: Partial<SkillNode> = {}): SkillNode => ({
  id,
  title: overrides.title ?? `Node ${id}`,
  description: overrides.description ?? 'Test node',
  category: overrides.category ?? 'economic',
  rarity: overrides.rarity ?? 'rare',
  quality: overrides.quality ?? 'rare',
  tags: overrides.tags ?? [],
  cost: overrides.cost ?? {},
  baseCost: overrides.baseCost ?? {},
  effects: overrides.effects ?? [],
  requires: overrides.requires,
  tier: overrides.tier,
  importance: overrides.importance,
  unlockCount: overrides.unlockCount,
  isRevealed: overrides.isRevealed,
  specialAbility: overrides.specialAbility,
  statMultiplier: overrides.statMultiplier,
  exclusiveGroup: overrides.exclusiveGroup,
  unlockConditions: overrides.unlockConditions,
});

describe('createConstellationLayout', () => {
  it('groups nodes by constellation category and preserves tiers', () => {
    const tree: SkillTree = {
      nodes: [
        makeNode('economic-node', { category: 'economic', tier: 0 }),
        makeNode('military-node', { category: 'military', tier: 1 }),
        makeNode('mystic-node', { category: 'mystical', tier: 2 }),
        makeNode('builder-node', { category: 'infrastructure', tier: 3 }),
        makeNode('diplomat-node', { category: 'diplomatic', tier: 1 }),
        makeNode('social-node', { category: 'social', tier: 0 }),
      ],
      edges: [],
      layout: { tiers: {}, maxTier: 3, categoryDistribution: {} },
    };

    const layout = createConstellationLayout(tree);
    const byId = new Map(layout.nodes.map((node) => [node.node.id, node]));

    expect(byId.get('economic-node')?.constellation).toBe('Merchant');
    expect(byId.get('military-node')?.constellation).toBe('Warrior');
    expect(byId.get('mystic-node')?.constellation).toBe('Mystic');
    expect(byId.get('builder-node')?.constellation).toBe('Builder');
    expect(byId.get('diplomat-node')?.constellation).toBe('Diplomat');
    expect(byId.get('social-node')?.constellation).toBe('Scholar');

    expect(layout.metrics.maxTier).toBe(3);
    expect(layout.metrics.radiusByTier).toHaveLength(4);
  });

  it('generates increasing ring radii for additional tiers', () => {
    const tree: SkillTree = {
      nodes: [
        makeNode('tier0', { tier: 0 }),
        makeNode('tier1', { tier: 1 }),
        makeNode('tier2', { tier: 2 }),
      ],
      edges: [],
    };

    const layout = createConstellationLayout(tree);
    const { radiusByTier } = layout.metrics;

    expect(radiusByTier[0]).toBeGreaterThan(0);
    expect(radiusByTier[1]).toBeGreaterThan(radiusByTier[0]);
    expect(radiusByTier[2]).toBeGreaterThan(radiusByTier[1]);
  });
});
