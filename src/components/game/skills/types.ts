export type SkillEffect =
  | { kind: 'resource_multiplier'; resource: 'grain' | 'coin' | 'mana' | 'favor' | 'wood' | 'planks'; factor: number }
  | { kind: 'building_multiplier'; typeId: string; factor: number }
  | { kind: 'upkeep_delta'; grainPerWorkerDelta: number }
  | { kind: 'route_bonus'; percent: number }
  | { kind: 'logistics_bonus'; percent: number }
  | { kind: 'special_ability'; abilityId: string; power: number; description: string };

export type NodeQuality = 'common' | 'rare' | 'epic' | 'legendary';

export interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  power: number;
  quality: NodeQuality;
}

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  category: 'economic' | 'military' | 'mystical' | 'infrastructure' | 'diplomatic' | 'social';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  quality: NodeQuality;
  tags: string[];
  cost: { coin?: number; mana?: number; favor?: number };
  baseCost: { coin?: number; mana?: number; favor?: number };
  effects: SkillEffect[];
  requires?: string[];
  tier?: number;
  importance?: number;
  unlockCount?: number; // Track how many nodes have been unlocked before this one
  isRevealed?: boolean; // Whether this node is visible to the player
  specialAbility?: SpecialAbility;
  statMultiplier?: number; // Quality-based stat scaling
  // New: optional exclusivity path grouping and additional unlock conditions
  exclusiveGroup?: string; // if set, only one node within the same group can be unlocked
  unlockConditions?: UnlockCondition[]; // extra conditions beyond requires
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (tree: SkillTree, unlocked: string[]) => boolean;
  reward?: SkillEffect;
  unlocked?: boolean;
}

export interface QualityChallenge {
  id: string;
  name: string;
  description: string;
  targetNodeId: string;
  requirements: {
    type: 'unlock_count' | 'category_mastery' | 'tier_completion' | 'resource_threshold';
    value: number;
    category?: SkillNode['category'];
    tier?: number;
  }[];
  qualityBoost: 1 | 2 | 3; // How many quality levels to boost (1 = common->rare, 2 = common->epic, etc.)
  timeLimit?: number; // Optional time limit in seconds
  completed?: boolean;
  active?: boolean;
}

// Additional unlock conditions for added challenge without relying on external game state
export type UnlockCondition =
  | { type: 'min_unlocked'; value: number }
  | { type: 'category_unlocked_at_least'; category: SkillNode['category']; value: number }
  | { type: 'max_unlocked_in_category'; category: SkillNode['category']; value: number } // encourages branching
  | { type: 'tier_before_required'; tier: number }; // cannot unlock before reaching tier

export interface SkillTree {
  nodes: SkillNode[];
  edges: Array<{ from: string; to: string }>;
  layout?: {
    tiers: Record<number, SkillNode[]>;
    maxTier: number;
    categoryDistribution: Record<string, number[]>;
  };
  progressionData?: {
    totalUnlocked: number;
    qualityDistribution: Record<NodeQuality, number>;
    achievements: Achievement[];
    challenges: QualityChallenge[];
  };
}
