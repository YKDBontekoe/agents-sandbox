import type { Achievement, QualityChallenge, SkillNode, SkillTree } from '../types';

const ACHIEVEMENT_DEFINITIONS: ReadonlyArray<Achievement> = [
  {
    id: 'first_unlock',
    name: 'First Steps',
    description: 'Unlock your first skill node',
    condition: (tree: SkillTree, unlocked: string[]) => unlocked.length >= 1,
  },
  {
    id: 'quality_collector',
    name: 'Quality Collector',
    description: 'Unlock 5 rare or higher quality nodes',
    condition: (tree: SkillTree, unlocked: string[]) => {
      const qualifying = unlocked.filter(id => {
        const node = tree.nodes.find(n => n.id === id);
        return node && (node.quality === 'rare' || node.quality === 'epic' || node.quality === 'legendary');
      });
      return qualifying.length >= 5;
    },
  },
  {
    id: 'legendary_master',
    name: 'Legendary Master',
    description: 'Unlock a legendary quality node',
    condition: (tree: SkillTree, unlocked: string[]) =>
      unlocked.some(id => tree.nodes.find(n => n.id === id)?.quality === 'legendary'),
    reward: { kind: 'resource_multiplier', resource: 'coin', factor: 1.5 },
  },
  {
    id: 'tier_master',
    name: 'Tier Master',
    description: 'Unlock nodes from 5 different tiers',
    condition: (tree: SkillTree, unlocked: string[]) => {
      const tiers = new Set<number>();
      unlocked.forEach(id => {
        const node = tree.nodes.find(n => n.id === id);
        if (node?.tier !== undefined) {
          tiers.add(node.tier);
        }
      });
      return tiers.size >= 5;
    },
  },
  {
    id: 'category_specialist',
    name: 'Category Specialist',
    description: 'Unlock 10 nodes from the same category',
    condition: (tree: SkillTree, unlocked: string[]) => {
      const categoryCounts: Record<string, number> = {};
      unlocked.forEach(id => {
        const node = tree.nodes.find(n => n.id === id);
        if (!node) return;
        categoryCounts[node.category] = (categoryCounts[node.category] ?? 0) + 1;
      });
      return Object.values(categoryCounts).some(count => count >= 10);
    },
  },
];

type ChallengeConfig = {
  id: QualityChallenge['id'];
  name: QualityChallenge['name'];
  description: QualityChallenge['description'];
  targetNodePicker: (nodes: SkillNode[]) => string;
  requirements: QualityChallenge['requirements'];
  qualityBoost: QualityChallenge['qualityBoost'];
  timeLimit?: number;
  completed?: boolean;
  active?: boolean;
};

const CHALLENGE_CONFIGS: ReadonlyArray<ChallengeConfig> = [
  {
    id: 'speed_runner',
    name: 'Speed Runner',
    description: 'Unlock 5 nodes within the first 10 unlocks to boost this node to Epic quality',
    targetNodePicker: nodes => nodes[Math.floor(nodes.length * 0.3)]?.id ?? nodes[0]?.id ?? 'skill_0',
    requirements: [{ type: 'unlock_count', value: 5 }],
    qualityBoost: 2,
    timeLimit: 300,
    completed: false,
    active: false,
  },
  {
    id: 'category_master',
    name: 'Category Master',
    description: 'Unlock 3 economic nodes to boost this node quality',
    targetNodePicker: nodes => nodes.find(n => n.category === 'economic')?.id ?? nodes[0]?.id ?? 'skill_0',
    requirements: [{ type: 'category_mastery', value: 3, category: 'economic' }],
    qualityBoost: 1,
    completed: false,
    active: true,
  },
  {
    id: 'tier_completionist',
    name: 'Tier Completionist',
    description: 'Complete an entire tier to unlock legendary quality boost',
    targetNodePicker: nodes => nodes[Math.floor(nodes.length * 0.7)]?.id ?? nodes.at(-1)?.id ?? 'skill_0',
    requirements: [{ type: 'tier_completion', value: 1, tier: 2 }],
    qualityBoost: 3,
    completed: false,
    active: false,
  },
];

export function buildDefaultAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map(def => ({ ...def }));
}

export function buildDefaultChallenges(nodes: SkillNode[]): QualityChallenge[] {
  return CHALLENGE_CONFIGS.map(config => ({
    id: config.id,
    name: config.name,
    description: config.description,
    targetNodeId: config.targetNodePicker(nodes),
    requirements: config.requirements.map(req => ({ ...req })),
    qualityBoost: config.qualityBoost,
    timeLimit: config.timeLimit,
    completed: config.completed,
    active: config.active,
  }));
}
