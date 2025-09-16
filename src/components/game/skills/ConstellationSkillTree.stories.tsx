import React from 'react';
import ConstellationSkillTree from './ConstellationSkillTree';
import type { SkillNode, SkillTree } from './types';

const makeNode = (id: string, overrides: Partial<SkillNode> = {}): SkillNode => ({
  id,
  title: overrides.title ?? `Node ${id}`,
  description: overrides.description ?? 'Storybook node description',
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

const sampleTree: SkillTree = {
  nodes: [
    makeNode('merchant-trade', { category: 'economic', tier: 0, title: 'Trade Winds' }),
    makeNode('warrior-vanguard', {
      category: 'military',
      tier: 1,
      title: 'Vanguard Tactics',
      requires: ['merchant-trade'],
    }),
    makeNode('mystic-echo', {
      category: 'mystical',
      tier: 2,
      title: 'Echoes of Mana',
      requires: ['warrior-vanguard'],
    }),
    makeNode('builder-forge', {
      category: 'infrastructure',
      tier: 1,
      title: 'Skyforge',
      requires: ['merchant-trade'],
    }),
    makeNode('diplomat-accord', {
      category: 'diplomatic',
      tier: 2,
      title: 'Accord of Houses',
      requires: ['builder-forge'],
    }),
    makeNode('scholar-archive', {
      category: 'social',
      tier: 0,
      title: 'Archivist Circle',
    }),
  ],
  edges: [
    { from: 'merchant-trade', to: 'warrior-vanguard' },
    { from: 'warrior-vanguard', to: 'mystic-echo' },
    { from: 'merchant-trade', to: 'builder-forge' },
    { from: 'builder-forge', to: 'diplomat-accord' },
    { from: 'scholar-archive', to: 'merchant-trade' },
  ],
  layout: { tiers: {}, maxTier: 3, categoryDistribution: {} },
};

const colorFor = (category: SkillNode['category']) =>
  ({
    economic: '#0ea5e9',
    military: '#ef4444',
    mystical: '#a855f7',
    infrastructure: '#22c55e',
    diplomatic: '#f59e0b',
    social: '#64748b',
  }[category] ?? '#4b5563');

const meta = {
  title: 'Game/Skills/Constellation Skill Tree',
};

export default meta;

export const Default = () => (
  <div style={{ width: '100%', height: '600px' }}>
    <ConstellationSkillTree
      tree={sampleTree}
      unlocked={{ 'merchant-trade': true, 'scholar-archive': true }}
      onUnlock={() => {}}
      colorFor={colorFor}
    />
  </div>
);
