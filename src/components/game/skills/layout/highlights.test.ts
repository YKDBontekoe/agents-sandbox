import { describe, expect, it } from 'vitest';
import { computeHighlight } from './highlights';
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

describe('computeHighlight', () => {
  const tree: SkillTree = {
    nodes: [
      makeNode('root', { category: 'economic', tier: 0 }),
      makeNode('mid', { category: 'military', tier: 1, requires: ['root'] }),
      makeNode('leaf', { category: 'mystical', tier: 2, requires: ['mid'] }),
      makeNode('bridge', { category: 'social', tier: 1 }),
    ],
    edges: [
      { from: 'root', to: 'mid' },
      { from: 'mid', to: 'leaf' },
      { from: 'mid', to: 'bridge' },
    ],
  };

  const layout = createConstellationLayout(tree);

  it('returns empty sets when no target node is provided', () => {
    const result = computeHighlight({ targetId: null, tree, layoutNodes: layout.nodes });
    expect(result.nodes.size).toBe(0);
    expect(result.edges.size).toBe(0);
  });

  it('includes ancestors, dependents, and bridge connections for the target node', () => {
    const result = computeHighlight({ targetId: 'mid', tree, layoutNodes: layout.nodes });

    expect(result.nodes).toEqual(new Set(['root', 'mid', 'leaf', 'bridge']));
    expect(result.edges).toEqual(new Set([
      'root->mid',
      'mid->leaf',
      'bridge:mid->bridge',
    ]));
  });
});
