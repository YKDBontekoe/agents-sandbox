import { describe, expect, it } from 'vitest';
import { accumulateEffects } from './progression';
import type { SkillNode } from './types';

const makeNode = (id: string, overrides: Partial<SkillNode> = {}): SkillNode => ({
  id,
  title: overrides.title ?? `Node ${id}`,
  description: overrides.description ?? 'Test node',
  category: overrides.category ?? 'economic',
  rarity: overrides.rarity ?? 'rare',
  quality: overrides.quality ?? 'epic',
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

describe('accumulateEffects special abilities', () => {
  it('boosts mana production with mana storm', () => {
    const node = makeNode('mana', {
      category: 'mystical',
      quality: 'legendary',
      specialAbility: {
        id: 'mana_storm',
        name: 'Mana Storm',
        description: 'Triples mana generation.',
        power: 3,
        quality: 'legendary',
      },
    });
    const acc = accumulateEffects([node]);
    expect(acc.resMul.mana).toBeCloseTo(3, 5);
    expect(acc.globalResourceMultiplier).toBeCloseTo(1 + 0.05 * 3, 5);
  });

  it('doubles economic building output with golden touch', () => {
    const node = makeNode('gold', {
      category: 'economic',
      quality: 'legendary',
      specialAbility: {
        id: 'golden_touch',
        name: 'Golden Touch',
        description: 'Doubles coin generation from economic buildings.',
        power: 2,
        quality: 'legendary',
      },
    });
    const acc = accumulateEffects([node]);
    expect(acc.bldMul.trade_post).toBeCloseTo(2, 5);
    expect(acc.bldMul.automation_workshop).toBeCloseTo(2, 5);
  });

  it('improves routes through market insight', () => {
    const node = makeNode('routes', {
      category: 'economic',
      specialAbility: {
        id: 'market_insight',
        name: 'Market Insight',
        description: 'Improves tariffs and routes.',
        power: 1.5,
        quality: 'epic',
      },
    });
    const acc = accumulateEffects([node]);
    expect(acc.routeCoinMultiplier).toBeCloseTo(1.5, 5);
    expect(acc.bldMul.trade_post).toBeGreaterThan(1);
  });

  it('reduces input costs with unity bond', () => {
    const node = makeNode('unity', {
      category: 'social',
      specialAbility: {
        id: 'unity_bond',
        name: 'Unity Bond',
        description: 'Reduces costs across the board.',
        power: 0.7,
        quality: 'epic',
      },
    });
    const acc = accumulateEffects([node]);
    expect(acc.buildingInputMultiplier).toBeCloseTo(0.7, 5);
    expect(acc.upkeepDelta).toBeLessThan(0);
  });
});
