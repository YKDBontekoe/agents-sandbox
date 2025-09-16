import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SkillTooltipContent from './SkillTooltipContent';
import { rollSpecialAbility } from './specialAbilities';
import type { SkillNode, SkillTree, SpecialAbility } from './types';

describe('SkillTooltipContent', () => {
  const baseNode: SkillNode = {
    id: 'skill_test',
    title: 'Test Node',
    description: 'Proves that tooltip abilities render correctly.',
    category: 'economic',
    rarity: 'rare',
    quality: 'epic',
    tags: [],
    cost: {},
    baseCost: {},
    effects: [],
  };

  const makeProps = (node: SkillNode) => {
    const tree: SkillTree = { nodes: [node], edges: [] };
    return {
      tree,
      unlocked: {},
      colorFor: () => '#ffffff',
      checkUnlock: () => ({ ok: true, reasons: [] }),
      canAfford: () => true,
    };
  };

  it('renders special ability details when provided', () => {
    const ability = rollSpecialAbility('economic', 'epic', () => 0);
    const node: SkillNode = { ...baseNode, specialAbility: ability ?? undefined };
    const markup = renderToStaticMarkup(
      <SkillTooltipContent
        node={node}
        {...makeProps(node)}
      />,
    );

    expect(markup).toContain('Special Ability');
    expect(markup).toContain(ability?.name ?? 'Golden Touch');
    expect(markup).toContain('Power');
  });

  it('falls back to catalog flavor text when node ability omits optional fields', () => {
    const ability = rollSpecialAbility('economic', 'legendary', () => 0);
    const minimalAbility: SpecialAbility | undefined = ability
      ? { id: ability.id, name: ability.name, description: ability.description, power: ability.power, quality: ability.quality }
      : undefined;
    const node: SkillNode = { ...baseNode, specialAbility: minimalAbility };

    const markup = renderToStaticMarkup(
      <SkillTooltipContent
        node={node}
        {...makeProps(node)}
      />,
    );

    expect(markup).toContain('Treasurers whisper of ledgers');
  });
});
