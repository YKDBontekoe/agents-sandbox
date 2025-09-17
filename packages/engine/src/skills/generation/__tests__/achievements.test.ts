import { describe, expect, it } from 'vitest';
import { buildDefaultAchievements, buildDefaultChallenges } from '../achievements';
import type { SkillNode } from '../../types';

describe('buildDefaultAchievements', () => {
  it('returns expected achievement identifiers and clones definitions', () => {
    const first = buildDefaultAchievements();
    const second = buildDefaultAchievements();

    expect(first.map(a => a.id)).toEqual([
      'first_unlock',
      'quality_collector',
      'legendary_master',
      'tier_master',
      'category_specialist',
    ]);

    expect(first[0]).not.toBe(second[0]);
    first[0].unlocked = true;
    expect(second[0].unlocked).toBeUndefined();
  });
});

describe('buildDefaultChallenges', () => {
  const makeNode = (overrides: Partial<SkillNode>): SkillNode => ({
    id: 'skill_0',
    title: 'Title',
    description: 'Desc',
    category: 'economic',
    rarity: 'common',
    quality: 'common',
    tags: [],
    cost: {},
    baseCost: {},
    effects: [],
    ...overrides,
  });

  it('uses provided nodes to select challenge targets', () => {
    const nodes: SkillNode[] = [
      makeNode({ id: 'skill_0', category: 'military', tier: 0 }),
      makeNode({ id: 'skill_1', category: 'economic', tier: 1 }),
      makeNode({ id: 'skill_2', category: 'social', tier: 2 }),
      makeNode({ id: 'skill_3', category: 'mystical', tier: 3 }),
    ];

    const challenges = buildDefaultChallenges(nodes);
    const lookup = Object.fromEntries(challenges.map(challenge => [challenge.id, challenge]));

    expect(lookup.speed_runner?.targetNodeId).toBe(nodes[Math.floor(nodes.length * 0.3)].id);
    expect(lookup.category_master?.targetNodeId).toBe('skill_1');
    expect(lookup.tier_completionist?.targetNodeId).toBe(nodes[Math.floor(nodes.length * 0.7)].id);
  });
});
