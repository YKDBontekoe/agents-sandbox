import { describe, expect, it } from 'vitest';
import { buildCrossLinks, buildPrerequisites } from '../graph';
import { SKILL_CATEGORIES, type RNG } from '../utils';
import type { SkillNode } from '../../types';

function sequenceRng(values: number[]): RNG {
  let index = 0;
  return () => {
    if (index < values.length) {
      return values[index++];
    }
    return values.length > 0 ? values[values.length - 1] : 0;
  };
}

describe('buildPrerequisites', () => {
  it('builds primary, category, and synergy requirements when available', () => {
    const rng = sequenceRng([0.2, 0.2, 0, 0.1, 0]);
    const prevTier = ['prev_1', 'prev_2', 'prev_3'];
    const nodesByCategory: Record<SkillNode['category'], string[]> = {
      economic: ['econ_1'],
      military: [],
      mystical: [],
      infrastructure: [],
      diplomatic: ['dip_1'],
      social: [],
    };

    const result = buildPrerequisites({
      tier: 3,
      nodeId: 'new_node',
      category: 'economic',
      rarity: 'rare',
      prevTierNodeIds: prevTier,
      nodesByCategory,
      rng,
    });

    expect(result.requires).toEqual(['prev_1', 'econ_1', 'dip_1']);
    expect(result.edges).toEqual([
      { from: 'prev_1', to: 'new_node' },
      { from: 'econ_1', to: 'new_node' },
      { from: 'dip_1', to: 'new_node' },
    ]);
  });
});

describe('buildCrossLinks', () => {
  it('connects tiers without duplicating existing edges', () => {
    const rng = sequenceRng([0, 0, 0.6, 0.6, 0.6, 0.6, 0.6]);
    const edges = buildCrossLinks({
      tier: 1,
      prevTierNodeIds: ['prev_a', 'prev_b'],
      currentTierNodeIds: ['cur_a', 'cur_b'],
      categories: SKILL_CATEGORIES,
      currentByCategory: {
        economic: ['cur_a'],
        military: ['cur_b'],
        mystical: [],
        infrastructure: [],
        diplomatic: [],
        social: [],
      },
      nodesByCategory: {
        economic: ['prev_a'],
        military: ['prev_b'],
        mystical: [],
        infrastructure: [],
        diplomatic: [],
        social: [],
      },
      rng,
      existingEdges: [{ from: 'prev_a', to: 'cur_a' }],
    });

    expect(edges.length).toBeGreaterThan(0);
    const hasDuplicate = edges.some(edge => edge.from === 'prev_a' && edge.to === 'cur_a');
    expect(hasDuplicate).toBe(false);
    edges.forEach(edge => {
      expect(['prev_a', 'prev_b']).toContain(edge.from);
      expect(['cur_a', 'cur_b']).toContain(edge.to);
    });
  });

  it('creates synergy bridges for higher tiers', () => {
    const rng = sequenceRng([0.1, 0.2, 0, 0]);
    const edges = buildCrossLinks({
      tier: 3,
      prevTierNodeIds: [],
      currentTierNodeIds: ['econ_node'],
      categories: SKILL_CATEGORIES,
      currentByCategory: {
        economic: ['econ_node'],
        military: [],
        mystical: [],
        infrastructure: [],
        diplomatic: [],
        social: [],
      },
      nodesByCategory: {
        economic: [],
        military: [],
        mystical: [],
        infrastructure: [],
        diplomatic: ['dip_source'],
        social: [],
      },
      rng,
      existingEdges: [],
    });

    expect(edges).toContainEqual({ from: 'dip_source', to: 'econ_node' });
  });
});
