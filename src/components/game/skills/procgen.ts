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

export interface SkillTree {
  nodes: SkillNode[];
  edges: Array<{ from: string; to: string }>; // prerequisites
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

// Simple seeded RNG (mulberry32)
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateSkillTree(seed = 42): SkillTree {
  const rng = mulberry32(seed);
  const categories: SkillNode['category'][] = ['economic', 'military', 'mystical', 'infrastructure', 'diplomatic', 'social'];
  const nodes: SkillNode[] = [];
  const edges: Array<{ from: string; to: string }> = [];

  const id = (i: number) => `skill_${i}`;
  const titlesByCat: Record<SkillNode['category'], string[]> = {
    economic: ['Tariff Tuning', 'Market Savvy', 'Guild Contracts', 'Ledger Lore'],
    military: ['Guard Drills', 'Supply Lines', 'Road Wardens', 'Siege Readiness'],
    mystical: ['Mana Channels', 'Rune Etching', 'Ley Tuning', 'Arcane Economy'],
    infrastructure: ['Granary Logic', 'Saw Alignment', 'Gearworks', 'Stone Roads'],
    diplomatic: ['Fair Tribute', 'Caravan Pacts', 'Envoy Network', 'Open Ports'],
    social: ['Festivals', 'Guild Mediation', 'Bread & Circus', 'Public Works'],
  };

  // Helper to build effects per category (procedural variety)
  const makeEffects = (cat: SkillNode['category']): SkillEffect[] => {
    switch (cat) {
      case 'economic':
        return rng() < 0.5
          ? [{ kind: 'resource_multiplier', resource: 'coin', factor: 1.06 + rng() * 0.08 }]
          : [{ kind: 'route_bonus', percent: 5 + Math.floor(rng() * 10) }];
      case 'military':
        return [{ kind: 'upkeep_delta', grainPerWorkerDelta: -0.02 - rng() * 0.04 }];
      case 'mystical':
        return [{ kind: 'resource_multiplier', resource: 'mana', factor: 1.08 + rng() * 0.10 }];
      case 'infrastructure':
        return rng() < 0.5
          ? [{ kind: 'building_multiplier', typeId: pick(rng, ['farm', 'lumber_camp', 'sawmill', 'trade_post', 'storehouse']), factor: 1.10 + rng() * 0.12 }]
          : [{ kind: 'logistics_bonus', percent: 5 + Math.floor(rng() * 10) }];
      case 'diplomatic':
        return [{ kind: 'resource_multiplier', resource: 'favor', factor: 1.10 + rng() * 0.12 }];
      case 'social':
        return [{ kind: 'resource_multiplier', resource: 'grain', factor: 1.05 + rng() * 0.08 }];
    }
  };

  const makeCost = (rarity: SkillNode['rarity'], unlockCount: number = 0): { cost: SkillNode['cost']; baseCost: SkillNode['baseCost'] } => {
    const base = rarity === 'common' ? 1 : rarity === 'uncommon' ? 1.5 : rarity === 'rare' ? 2 : 3;
    const progressiveMultiplier = 1 + (unlockCount * 0.15); // 15% increase per unlocked node
    
    const baseCost = {
      coin: Math.round((15 + rng() * 35) * base),
      mana: Math.round((3 + rng() * 8) * base),
      favor: Math.round((2 + rng() * 6) * base),
    };
    
    const cost = {
      coin: Math.round(baseCost.coin! * progressiveMultiplier),
      mana: Math.round(baseCost.mana! * progressiveMultiplier),
      favor: Math.round(baseCost.favor! * progressiveMultiplier),
    };
    
    return { cost, baseCost };
  };

  const pickRarity = (): SkillNode['rarity'] => {
    const r = rng();
    if (r < 0.55) return 'common';
    if (r < 0.85) return 'uncommon';
    if (r < 0.97) return 'rare';
    return 'legendary';
  };

  const pickQuality = (tier: number): NodeQuality => {
    const r = rng();
    const tierBonus = tier * 0.05; // Higher tiers have better quality chances
    
    if (r < 0.4 - tierBonus) return 'common';
    if (r < 0.7 - tierBonus) return 'rare';
    if (r < 0.9 - tierBonus) return 'epic';
    return 'legendary';
  };

  const getQualityMultiplier = (quality: NodeQuality): number => {
    switch (quality) {
      case 'common': return 1.0;
      case 'rare': return 1.3;
      case 'epic': return 1.6;
      case 'legendary': return 2.0;
    }
  };

  const createSpecialAbility = (quality: NodeQuality, category: SkillNode['category']): SpecialAbility | undefined => {
    if (quality === 'common') return undefined;
    
    const abilities: Record<SkillNode['category'], SpecialAbility[]> = {
      economic: [
        { id: 'golden_touch', name: 'Golden Touch', description: 'Double coin generation for 5 minutes', power: 2.0, quality },
        { id: 'market_insight', name: 'Market Insight', description: 'Reveal optimal trade routes', power: 1.5, quality }
      ],
      military: [
        { id: 'battle_fury', name: 'Battle Fury', description: 'Reduce all military costs by 50%', power: 0.5, quality },
        { id: 'fortress_shield', name: 'Fortress Shield', description: 'Immunity to raids for 10 minutes', power: 0.0, quality }
      ],
      mystical: [
        { id: 'mana_storm', name: 'Mana Storm', description: 'Triple mana generation for 3 minutes', power: 3.0, quality },
        { id: 'arcane_mastery', name: 'Arcane Mastery', description: 'Unlock hidden mystical nodes', power: 1.0, quality }
      ],
      infrastructure: [
        { id: 'rapid_construction', name: 'Rapid Construction', description: 'Instant building completion', power: 1.0, quality },
        { id: 'efficiency_boost', name: 'Efficiency Boost', description: 'All buildings produce 50% more', power: 1.5, quality }
      ],
      diplomatic: [
        { id: 'silver_tongue', name: 'Silver Tongue', description: 'Double favor from all sources', power: 2.0, quality },
        { id: 'peace_treaty', name: 'Peace Treaty', description: 'Eliminate all diplomatic penalties', power: 1.0, quality }
      ],
      social: [
        { id: 'festival_spirit', name: 'Festival Spirit', description: 'Boost all resource generation by 25%', power: 1.25, quality },
        { id: 'unity_bond', name: 'Unity Bond', description: 'Reduce all costs by 30%', power: 0.7, quality }
      ]
    };
    
    return pick(rng, abilities[category]);
  };

  // Generate hierarchical tiers with optimized connectivity
  const tiers = 8; // larger tree
  let prevTier: string[] = [];
  const nodesByCategory: Record<SkillNode['category'], string[]> = {
    economic: [], military: [], mystical: [], infrastructure: [], diplomatic: [], social: []
  };
  const tierNodes: Record<number, SkillNode[]> = {};
  const categoryDistribution: Record<string, number[]> = {
    economic: [], military: [], mystical: [], infrastructure: [], diplomatic: [], social: []
  };
  
  for (let t = 0; t < tiers; t++) {
    const count = 6 + Math.floor(rng() * 5); // more nodes per tier
    const current: string[] = [];
    const currentByCategory: Record<SkillNode['category'], string[]> = {
      economic: [], military: [], mystical: [], infrastructure: [], diplomatic: [], social: []
    };
    
    for (let i = 0; i < count; i++) {
      const cat = pick(rng, categories);
      const rarity = pickRarity();
      const tags = [cat, rarity, rng() < 0.5 ? 'economy' : 'growth'];
      
      // Enhanced prerequisite logic
      let requires: string[] = [];
      if (t > 0 && prevTier.length) {
        // Primary prerequisite from previous tier
        const primaryReq = pick(rng, prevTier);
        requires.push(primaryReq);
        
        // Add category-based prerequisites for higher tiers
        if (t > 2 && nodesByCategory[cat].length > 0 && rng() < 0.4) {
          const categoryReq = pick(rng, nodesByCategory[cat]);
          if (categoryReq !== primaryReq) {
            requires.push(categoryReq);
          }
        }
        
        // Add synergy prerequisites for rare/legendary skills
        if ((rarity === 'rare' || rarity === 'legendary') && t > 1 && rng() < 0.3) {
          const synergyCategories = getSynergyCategories(cat);
          const availableSynergies = synergyCategories.flatMap(synCat => nodesByCategory[synCat]);
          if (availableSynergies.length > 0) {
            const synergyReq = pick(rng, availableSynergies);
            if (!requires.includes(synergyReq)) {
              requires.push(synergyReq);
            }
          }
        }
      }
      
      // Calculate importance based on tier, rarity, and prerequisites
      const importance = calculateImportance(t, rarity, requires.length);
      const quality = pickQuality(t);
      const qualityMultiplier = getQualityMultiplier(quality);
      const { cost, baseCost } = makeCost(rarity, nodes.length);
      const specialAbility = createSpecialAbility(quality, cat);
      
      // Occasionally create mutually exclusive paths within a tier/category
      let exclusiveGroup: string | undefined = undefined;
      if (t >= 2 && rng() < 0.25) {
        exclusiveGroup = `tier${t}_${cat}_path_${Math.floor(rng()*3)}`;
      }

      // Add extra unlock conditions to make choices more meaningful
      const unlockConditions: UnlockCondition[] = [];
      if (t > 0 && rng() < 0.35) {
        unlockConditions.push({ type: 'min_unlocked', value: 2 + Math.floor(t * rng()) });
      }
      if (t >= 3 && rng() < 0.3) {
        // Encourage specializing or delaying over-investment in one category
        if (rng() < 0.5) unlockConditions.push({ type: 'category_unlocked_at_least', category: cat, value: 2 });
        else unlockConditions.push({ type: 'max_unlocked_in_category', category: cat, value: 6 });
      }
      if (t >= 4 && rng() < 0.2) {
        unlockConditions.push({ type: 'tier_before_required', tier: t - 1 });
      }

      const node: SkillNode = {
        id: id(nodes.length),
        title: pick(rng, titlesByCat[cat]),
        description: `Benefit aligned to ${cat}. Procedurally tailored.`,
        category: cat,
        rarity,
        quality,
        tags,
        cost,
        baseCost,
        effects: makeEffects(cat),
        requires: requires.length > 0 ? requires : undefined,
        tier: t,
        importance,
        unlockCount: nodes.length,
        isRevealed: t === 0, // Only first tier is initially revealed
        specialAbility,
        statMultiplier: qualityMultiplier,
        exclusiveGroup,
        unlockConditions: unlockConditions.length ? unlockConditions : undefined,
      };
      
      nodes.push(node);
      current.push(node.id);
      currentByCategory[cat].push(node.id);
      nodesByCategory[cat].push(node.id);
      
      // Add edges for all prerequisites
      if (node.requires) {
        node.requires.forEach(req => {
          edges.push({ from: req, to: node.id });
        });
      }
    }
    
    // Enhanced cross-links with category awareness
    if (t > 0) {
      const links = 3 + Math.floor(rng() * 4); // More cross-links
      for (let k = 0; k < links; k++) {
        const from = pick(rng, prevTier);
        const to = pick(rng, current);
        if (from !== to && !edges.some(e => e.from === from && e.to === to)) {
          edges.push({ from, to });
        }
      }
      
      // Add strategic category bridges
      if (t > 2) {
        categories.forEach(cat => {
          if (currentByCategory[cat].length > 0 && rng() < 0.3) {
            const synergyCategories = getSynergyCategories(cat);
            synergyCategories.forEach(synCat => {
              if (nodesByCategory[synCat].length > 0 && rng() < 0.5) {
                const from = pick(rng, nodesByCategory[synCat]);
                const to = pick(rng, currentByCategory[cat]);
                if (from !== to && !edges.some(e => e.from === from && e.to === to)) {
                  edges.push({ from, to });
                }
              }
            });
          }
        });
      }
    }
    
    // Store tier information for layout
    tierNodes[t] = nodes.filter(n => n.tier === t);
    
    // Track category distribution per tier
    categories.forEach(cat => {
      categoryDistribution[cat][t] = currentByCategory[cat].length;
    });
    
    prevTier = current;
  }
  
  // Helper function to calculate node importance
  function calculateImportance(tier: number, rarity: SkillNode['rarity'], prereqCount: number): number {
    const tierWeight = tier * 0.2; // Higher tiers are more important
    const rarityWeight = rarity === 'common' ? 0.1 : rarity === 'uncommon' ? 0.3 : rarity === 'rare' ? 0.6 : 1.0;
    const prereqWeight = prereqCount * 0.15; // More prerequisites = higher importance
    return Math.min(1.0, tierWeight + rarityWeight + prereqWeight);
  }
  
  // Helper function for category synergies
  function getSynergyCategories(category: SkillNode['category']): SkillNode['category'][] {
    const synergies: Record<SkillNode['category'], SkillNode['category'][]> = {
      economic: ['diplomatic', 'infrastructure'],
      military: ['infrastructure', 'social'],
      mystical: ['economic', 'diplomatic'],
      infrastructure: ['economic', 'military'],
      diplomatic: ['economic', 'mystical'],
      social: ['military', 'diplomatic']
    };
    return synergies[category] || [];
  }

  // Create achievements system
  const achievements: Achievement[] = [
    {
      id: 'first_unlock',
      name: 'First Steps',
      description: 'Unlock your first skill node',
      condition: (tree, unlocked) => unlocked.length >= 1
    },
    {
      id: 'quality_collector',
      name: 'Quality Collector',
      description: 'Unlock 5 rare or higher quality nodes',
      condition: (tree, unlocked) => {
        const qualityNodes = unlocked.filter(id => {
          const node = tree.nodes.find(n => n.id === id);
          return node && (node.quality === 'rare' || node.quality === 'epic' || node.quality === 'legendary');
        });
        return qualityNodes.length >= 5;
      }
    },
    {
      id: 'legendary_master',
      name: 'Legendary Master',
      description: 'Unlock a legendary quality node',
      condition: (tree, unlocked) => {
        return unlocked.some(id => {
          const node = tree.nodes.find(n => n.id === id);
          return node?.quality === 'legendary';
        });
      },
      reward: { kind: 'resource_multiplier', resource: 'coin', factor: 1.5 }
    },
    {
      id: 'tier_master',
      name: 'Tier Master',
      description: 'Unlock nodes from 5 different tiers',
      condition: (tree, unlocked) => {
        const tiers = new Set();
        unlocked.forEach(id => {
          const node = tree.nodes.find(n => n.id === id);
          if (node?.tier !== undefined) tiers.add(node.tier);
        });
        return tiers.size >= 5;
      }
    },
    {
      id: 'category_specialist',
      name: 'Category Specialist',
      description: 'Unlock 10 nodes from the same category',
      condition: (tree, unlocked) => {
        const categoryCount: Record<string, number> = {};
        unlocked.forEach(id => {
          const node = tree.nodes.find(n => n.id === id);
          if (node) {
            categoryCount[node.category] = (categoryCount[node.category] || 0) + 1;
          }
        });
        return Object.values(categoryCount).some(count => count >= 10);
      }
    }
  ];

  return { 
    nodes, 
    edges,
    layout: {
      tiers: tierNodes,
      maxTier: tiers - 1,
      categoryDistribution
    },
    progressionData: {
      totalUnlocked: 0,
      qualityDistribution: { common: 0, rare: 0, epic: 0, legendary: 0 },
      achievements,
      challenges: [
        {
          id: 'speed_runner',
          name: 'Speed Runner',
          description: 'Unlock 5 nodes within the first 10 unlocks to boost this node to Epic quality',
          targetNodeId: nodes[Math.floor(nodes.length * 0.3)].id,
          requirements: [{ type: 'unlock_count', value: 5 }],
          qualityBoost: 2,
          timeLimit: 300,
          completed: false,
          active: false
        },
        {
          id: 'category_master',
          name: 'Category Master',
          description: 'Unlock 3 economic nodes to boost this node quality',
          targetNodeId: nodes.find(n => n.category === 'economic')?.id || nodes[0].id,
          requirements: [{ type: 'category_mastery', value: 3, category: 'economic' }],
          qualityBoost: 1,
          completed: false,
          active: true
        },
        {
          id: 'tier_completionist',
          name: 'Tier Completionist',
          description: 'Complete an entire tier to unlock legendary quality boost',
          targetNodeId: nodes[Math.floor(nodes.length * 0.7)].id,
          requirements: [{ type: 'tier_completion', value: 1, tier: 2 }],
          qualityBoost: 3,
          completed: false,
          active: false
        }
      ]
    }
  };
}

export function accumulateEffects(unlocked: SkillNode[]): { resMul: Record<string, number>; bldMul: Record<string, number>; upkeepDelta: number } {
  const resMul: Record<string, number> = {};
  const bldMul: Record<string, number> = {};
  let upkeepDelta = 0;
  unlocked.forEach((s) => {
    s.effects.forEach((e) => {
      if (e.kind === 'resource_multiplier') {
        resMul[e.resource] = (resMul[e.resource] ?? 1) * e.factor;
      } else if (e.kind === 'building_multiplier') {
        bldMul[e.typeId] = (bldMul[e.typeId] ?? 1) * e.factor;
      } else if (e.kind === 'upkeep_delta') {
        upkeepDelta += e.grainPerWorkerDelta;
      } else if (e.kind === 'route_bonus') {
        // treat as coin resource tilt (simplification for agents)
        resMul['coin'] = (resMul['coin'] ?? 1) * (1 + e.percent / 100);
      } else if (e.kind === 'logistics_bonus') {
        // treat as building multipliers for core producers
        ['farm', 'lumber_camp', 'sawmill', 'storehouse'].forEach(t => {
          bldMul[t] = (bldMul[t] ?? 1) * (1 + e.percent / 100);
        })
      }
    });
  });

  // Lightweight, conservative set-bonus synergies to make builds more fun
  // Category synergies
  const byCat: Record<SkillNode['category'], number> = {
    economic: 0, military: 0, mystical: 0, infrastructure: 0, diplomatic: 0, social: 0
  };
  unlocked.forEach(n => { byCat[n.category] = (byCat[n.category] || 0) + 1; });

  // Econ + Infra synergy: small boost to trade and processing
  const econInfra = (byCat.economic > 0 && byCat.infrastructure > 0) ? (byCat.economic + byCat.infrastructure) : 0;
  if (econInfra >= 4) {
    ['trade_post', 'sawmill'].forEach(t => { bldMul[t] = (bldMul[t] ?? 1) * 1.05; });
  }

  // Mystical + Infra synergy: storage and mana alignment
  const mystInfra = (byCat.mystical > 0 && byCat.infrastructure > 0) ? (byCat.mystical + byCat.infrastructure) : 0;
  if (mystInfra >= 4) {
    resMul['mana'] = (resMul['mana'] ?? 1) * 1.05;
    bldMul['storehouse'] = (bldMul['storehouse'] ?? 1) * 1.05;
  }

  // Military + Social synergy: slight upkeep reduction via discipline & morale
  const milSoc = (byCat.military > 0 && byCat.social > 0) ? (byCat.military + byCat.social) : 0;
  if (milSoc >= 3) {
    upkeepDelta += -0.05; // very modest reduction
  }

  // Quality set bonus: any legendary unlocked grants a tiny coin tilt
  if (unlocked.some(n => n.quality === 'legendary')) {
    resMul['coin'] = (resMul['coin'] ?? 1) * 1.02;
  }
  return { resMul, bldMul, upkeepDelta };
}
