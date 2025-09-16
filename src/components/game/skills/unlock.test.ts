import { describe, expect, it } from 'vitest';
import { collectUnlockBlockers } from './unlock';
import type { SkillNode } from './types';

const makeNode = (id: string, overrides: Partial<SkillNode> = {}): SkillNode => ({
  id,
  title: `Node ${id}`,
  description: 'Test node',
  category: overrides.category ?? 'mystical',
  rarity: overrides.rarity ?? 'common',
  quality: overrides.quality ?? 'common',
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

describe('collectUnlockBlockers', () => {
  it('blocks unlock when category max is already reached', () => {
    const unlockedNodes = Array.from({ length: 6 }, (_, index) => makeNode(`mystic_${index}`));
    const targetNode = makeNode('target', {
      unlockConditions: [
        { type: 'max_unlocked_in_category', category: 'mystical', value: 6 },
      ],
    });
    const nodes: SkillNode[] = [...unlockedNodes, targetNode];
    const unlockedState = unlockedNodes.reduce<Record<string, boolean>>((acc, node) => {
      acc[node.id] = true;
      return acc;
    }, {});

    const reasons = collectUnlockBlockers({ node: targetNode, unlocked: unlockedState, nodes });

    expect(reasons).toContain('Too many in mystical: max 6');
    expect(reasons.length).toBe(1);
  });
});
