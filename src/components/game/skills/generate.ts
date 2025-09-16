import type {
  Achievement,
  SkillNode,
  SkillTree,
  SpecialAbility,
  UnlockCondition,
} from './types';
import { rollSpecialAbility } from './specialAbilities';
import {
  SKILL_CATEGORIES,
  buildCategoryEffects,
  buildCost,
  getQualityMultiplier,
  mulberry32,
  pick,
  pickQuality,
  pickRarity,
} from './generation/utils';
import { buildDefaultAchievements, buildDefaultChallenges } from './generation/achievements';
import { buildCrossLinks, buildPrerequisites, type Edge } from './generation/graph';

function createCategoryBuckets<T>(factory: () => T): Record<SkillNode['category'], T> {
  return {
    economic: factory(),
    military: factory(),
    mystical: factory(),
    infrastructure: factory(),
    diplomatic: factory(),
    social: factory(),
  };
}

const TITLES_BY_CATEGORY: Record<SkillNode['category'], string[]> = {
  economic: ['Tariff Tuning', 'Market Savvy', 'Guild Contracts', 'Ledger Lore'],
  military: ['Guard Drills', 'Supply Lines', 'Road Wardens', 'Siege Readiness'],
  mystical: ['Mana Channels', 'Rune Etching', 'Ley Tuning', 'Arcane Economy'],
  infrastructure: ['Granary Logic', 'Saw Alignment', 'Gearworks', 'Stone Roads'],
  diplomatic: ['Fair Tribute', 'Caravan Pacts', 'Envoy Network', 'Open Ports'],
  social: ['Festivals', 'Guild Mediation', 'Bread & Circus', 'Public Works'],
};

function calculateImportance(tier: number, rarity: SkillNode['rarity'], prereqCount: number): number {
  const tierWeight = tier * 0.2;
  const rarityWeight = rarity === 'common' ? 0.1 : rarity === 'uncommon' ? 0.3 : rarity === 'rare' ? 0.6 : 1.0;
  const prereqWeight = prereqCount * 0.15;
  return Math.min(1.0, tierWeight + rarityWeight + prereqWeight);
}

export function generateSkillTree(seed = 42, tiers: number = 8): SkillTree {
  const rng = mulberry32(seed);
  const nodes: SkillNode[] = [];
  const edges: Edge[] = [];

  const idForIndex = (index: number) => `skill_${index}`;

  let prevTier: string[] = [];
  const nodesByCategory = createCategoryBuckets(() => [] as string[]);
  const tierNodes: Record<number, SkillNode[]> = {};
  const categoryDistribution = createCategoryBuckets(() => [] as number[]);

  for (let tier = 0; tier < tiers; tier++) {
    const count = 6 + Math.floor(rng() * 5);
    const currentIds: string[] = [];
    const currentNodes: SkillNode[] = [];
    const currentByCategory = createCategoryBuckets(() => [] as string[]);

    for (let i = 0; i < count; i++) {
      const category = pick(rng, SKILL_CATEGORIES);
      const rarity = pickRarity(rng);
      const nodeId = idForIndex(nodes.length);
      const unlockCount = nodes.length;
      const { requires, edges: prerequisiteEdges } = buildPrerequisites({
        tier,
        nodeId,
        category,
        rarity,
        prevTierNodeIds: prevTier,
        nodesByCategory,
        rng,
      });

      const importance = calculateImportance(tier, rarity, requires.length);
      const quality = pickQuality(rng, tier);
      const statMultiplier = getQualityMultiplier(quality);
      const { cost, baseCost } = buildCost(rng, rarity, unlockCount);
      const tags = [category, rarity, rng() < 0.5 ? 'economy' : 'growth'];
      const specialAbility: SpecialAbility | undefined = rollSpecialAbility(category, quality, rng);

      let exclusiveGroup: string | undefined;
      if (tier >= 2 && rng() < 0.25) {
        exclusiveGroup = `tier${tier}_${category}_path_${Math.floor(rng() * 3)}`;
      }

      const unlockConditions: UnlockCondition[] = [];
      if (tier > 0 && rng() < 0.35) {
        unlockConditions.push({ type: 'min_unlocked', value: 2 + Math.floor(tier * rng()) });
      }
      if (tier >= 3 && rng() < 0.3) {
        if (rng() < 0.5) {
          unlockConditions.push({ type: 'category_unlocked_at_least', category, value: 2 });
        } else {
          unlockConditions.push({ type: 'max_unlocked_in_category', category, value: 6 });
        }
      }
      if (tier >= 4 && rng() < 0.2) {
        unlockConditions.push({ type: 'tier_before_required', tier: tier - 1 });
      }

      const node: SkillNode = {
        id: nodeId,
        title: pick(rng, TITLES_BY_CATEGORY[category]),
        description: `Benefit aligned to ${category}. Procedurally tailored.`,
        category,
        rarity,
        quality,
        tags,
        cost,
        baseCost,
        effects: buildCategoryEffects(rng, category),
        requires: requires.length ? requires : undefined,
        tier,
        importance,
        unlockCount,
        isRevealed: tier === 0,
        specialAbility,
        statMultiplier,
        exclusiveGroup,
        unlockConditions: unlockConditions.length ? unlockConditions : undefined,
      };

      nodes.push(node);
      currentIds.push(nodeId);
      currentNodes.push(node);
      currentByCategory[category].push(nodeId);
      nodesByCategory[category].push(nodeId);
      edges.push(...prerequisiteEdges);
    }

    const crossLinks = buildCrossLinks({
      tier,
      prevTierNodeIds: prevTier,
      currentTierNodeIds: currentIds,
      categories: SKILL_CATEGORIES,
      currentByCategory,
      nodesByCategory,
      rng,
      existingEdges: edges,
    });
    edges.push(...crossLinks);

    tierNodes[tier] = currentNodes;
    SKILL_CATEGORIES.forEach(category => {
      categoryDistribution[category][tier] = currentByCategory[category].length;
    });

    prevTier = currentIds;
  }

  const achievements: Achievement[] = buildDefaultAchievements();
  const challenges = buildDefaultChallenges(nodes);

  return {
    nodes,
    edges,
    layout: {
      tiers: tierNodes,
      maxTier: tiers - 1,
      categoryDistribution,
    },
    progressionData: {
      totalUnlocked: 0,
      qualityDistribution: { common: 0, rare: 0, epic: 0, legendary: 0 },
      achievements,
      challenges,
    },
  };
}

export function expandSkillTree(tree: SkillTree, seed: number, moreTiers: number = 4): SkillTree {
  const currentMaxTier = tree.layout?.maxTier ?? -1;
  const rng = mulberry32(seed + currentMaxTier * 1009);

  if (!tree.layout) {
    tree.layout = {
      tiers: {},
      maxTier: currentMaxTier,
      categoryDistribution: createCategoryBuckets(() => [] as number[]),
    };
  }

  const nodesByCategory = createCategoryBuckets(() => [] as string[]);
  tree.nodes.forEach(node => {
    nodesByCategory[node.category].push(node.id);
  });

  let prevTier = currentMaxTier >= 0
    ? tree.nodes.filter(node => node.tier === currentMaxTier).map(node => node.id)
    : [];

  let idCounter = tree.nodes.length;
  const nextId = () => `skill_${idCounter++}`;

  for (let tier = currentMaxTier + 1; tier < currentMaxTier + 1 + moreTiers; tier++) {
    const count = 6 + Math.floor(rng() * 5);
    const currentIds: string[] = [];
    const currentNodes: SkillNode[] = [];
    const currentByCategory = createCategoryBuckets(() => [] as string[]);

    for (let i = 0; i < count; i++) {
      const category = pick(rng, SKILL_CATEGORIES);
      const rarity = pickRarity(rng);
      const unlockCount = tree.nodes.length;
      const nodeId = nextId();
      const { requires, edges: prerequisiteEdges } = buildPrerequisites({
        tier,
        nodeId,
        category,
        rarity,
        prevTierNodeIds: prevTier,
        nodesByCategory,
        rng,
      });

      const importance = calculateImportance(tier, rarity, requires.length);
      const quality = pickQuality(rng, tier);
      const statMultiplier = getQualityMultiplier(quality);
      const { cost, baseCost } = buildCost(rng, rarity, unlockCount);

      const node: SkillNode = {
        id: nodeId,
        title: pick(rng, TITLES_BY_CATEGORY[category]),
        description: `Benefit aligned to ${category}. Procedurally tailored.`,
        category,
        rarity,
        quality,
        tags: [category, rarity],
        cost,
        baseCost,
        effects: buildCategoryEffects(rng, category),
        requires: requires.length ? requires : undefined,
        tier,
        importance,
        unlockCount,
        isRevealed: false,
        specialAbility: rollSpecialAbility(category, quality, rng),
        statMultiplier,
      };

      tree.nodes.push(node);
      currentIds.push(nodeId);
      currentNodes.push(node);
      currentByCategory[category].push(nodeId);
      nodesByCategory[category].push(nodeId);
      tree.edges.push(...prerequisiteEdges);
    }

    const crossLinks = buildCrossLinks({
      tier,
      prevTierNodeIds: prevTier,
      currentTierNodeIds: currentIds,
      categories: SKILL_CATEGORIES,
      currentByCategory,
      nodesByCategory,
      rng,
      existingEdges: tree.edges,
    });
    tree.edges.push(...crossLinks);

    const tierEntry = tree.layout!.tiers[tier] ?? [];
    tierEntry.push(...currentNodes);
    tree.layout!.tiers[tier] = tierEntry;

    SKILL_CATEGORIES.forEach(category => {
      const distribution = tree.layout!.categoryDistribution[category] ?? [];
      distribution[tier] = currentByCategory[category].length;
      tree.layout!.categoryDistribution[category] = distribution;
    });

    tree.layout!.maxTier = Math.max(tree.layout!.maxTier, tier);
    prevTier = currentIds;
  }

  return tree;
}
