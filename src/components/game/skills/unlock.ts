import type { SkillNode } from './types';

export interface UnlockCheckContext {
  node: SkillNode;
  unlocked: Record<string, boolean>;
  nodes: SkillNode[];
}

const CATEGORY_KEYS: SkillNode['category'][] = [
  'economic',
  'military',
  'mystical',
  'infrastructure',
  'diplomatic',
  'social',
];

export function collectUnlockBlockers({ node, unlocked, nodes }: UnlockCheckContext): string[] {
  const reasons: string[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));

  if (node.requires && node.requires.length > 0) {
    node.requires.forEach((reqId) => {
      if (!unlocked[reqId]) {
        const title = nodeMap.get(reqId)?.title || reqId;
        reasons.push(`Requires: ${title}`);
      }
    });
  }

  if (node.exclusiveGroup) {
    const taken = nodes.find(
      (n) => n.exclusiveGroup === node.exclusiveGroup && n.id !== node.id && unlocked[n.id],
    );
    if (taken) {
      reasons.push(`Path chosen: ${taken.title}`);
    }
  }

  if (node.unlockConditions && node.unlockConditions.length > 0) {
    const unlockedIds = Object.keys(unlocked).filter((id) => unlocked[id]);
    const byCategory: Record<SkillNode['category'], number> = CATEGORY_KEYS.reduce(
      (acc, category) => {
        acc[category] = 0;
        return acc;
      },
      {} as Record<SkillNode['category'], number>,
    );

    unlockedIds.forEach((id) => {
      const unlockedNode = nodeMap.get(id);
      if (unlockedNode) {
        byCategory[unlockedNode.category] = (byCategory[unlockedNode.category] || 0) + 1;
      }
    });

    const highestTier = unlockedIds.reduce((maxTier, id) => {
      const unlockedNode = nodeMap.get(id);
      if (unlockedNode && typeof unlockedNode.tier === 'number' && Number.isFinite(unlockedNode.tier)) {
        return Math.max(maxTier, unlockedNode.tier);
      }
      return maxTier;
    }, -1);

    node.unlockConditions.forEach((cond) => {
      switch (cond.type) {
        case 'min_unlocked':
          if (unlockedIds.length < cond.value) {
            reasons.push(`Unlock at least ${cond.value} skills`);
          }
          break;
        case 'category_unlocked_at_least': {
          const count = byCategory[cond.category] || 0;
          if (count < cond.value) {
            reasons.push(`Unlock ${cond.value} ${cond.category} skills`);
          }
          break;
        }
        case 'max_unlocked_in_category': {
          const count = byCategory[cond.category] || 0;
          if (count >= cond.value) {
            reasons.push(`Too many in ${cond.category}: max ${cond.value}`);
          }
          break;
        }
        case 'tier_before_required':
          if (highestTier < cond.tier) {
            reasons.push(`Reach tier ${cond.tier} first`);
          }
          break;
      }
    });
  }

  return reasons;
}
