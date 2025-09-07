import { Achievement, QualityChallenge, SkillNode, SkillTree } from './types';

export function evaluateAchievements(tree: SkillTree, unlockedIds: string[]): Achievement[] {
  if (!tree.progressionData) return [];
  return tree.progressionData.achievements.map(a => ({
    ...a,
    unlocked: a.condition(tree, unlockedIds),
  }));
}

export function evaluateChallenges(tree: SkillTree, unlockedIds: string[]): QualityChallenge[] {
  if (!tree.progressionData) return [];
  return tree.progressionData.challenges.map(ch => {
    const completed = ch.requirements.every(req => {
      switch (req.type) {
        case 'unlock_count':
          return unlockedIds.length >= req.value;
        case 'category_mastery':
          if (!req.category) return false;
          const count = unlockedIds.filter(id => {
            const node = tree.nodes.find(n => n.id === id);
            return node?.category === req.category;
          }).length;
          return count >= req.value;
        case 'tier_completion':
          if (req.tier === undefined) return false;
          const tierNodes = tree.nodes.filter(n => n.tier === req.tier).map(n => n.id);
          return tierNodes.every(id => unlockedIds.includes(id));
        case 'resource_threshold':
          return false; // game state not available here
        default:
          return false;
      }
    });
    return { ...ch, completed };
  });
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
        resMul['coin'] = (resMul['coin'] ?? 1) * (1 + e.percent / 100);
      } else if (e.kind === 'logistics_bonus') {
        ['farm', 'lumber_camp', 'sawmill', 'storehouse'].forEach(t => {
          bldMul[t] = (bldMul[t] ?? 1) * (1 + e.percent / 100);
        });
      }
    });
  });

  const byCat: Record<SkillNode['category'], number> = {
    economic: 0, military: 0, mystical: 0, infrastructure: 0, diplomatic: 0, social: 0,
  };
  unlocked.forEach(n => { byCat[n.category] = (byCat[n.category] || 0) + 1; });

  const econInfra = (byCat.economic > 0 && byCat.infrastructure > 0) ? (byCat.economic + byCat.infrastructure) : 0;
  if (econInfra >= 4) {
    ['trade_post', 'sawmill'].forEach(t => { bldMul[t] = (bldMul[t] ?? 1) * 1.05; });
  }

  const mystInfra = (byCat.mystical > 0 && byCat.infrastructure > 0) ? (byCat.mystical + byCat.infrastructure) : 0;
  if (mystInfra >= 4) {
    resMul['mana'] = (resMul['mana'] ?? 1) * 1.05;
    bldMul['storehouse'] = (bldMul['storehouse'] ?? 1) * 1.05;
  }

  const milSoc = (byCat.military > 0 && byCat.social > 0) ? (byCat.military + byCat.social) : 0;
  if (milSoc >= 3) {
    upkeepDelta += -0.05;
  }

  if (unlocked.some(n => n.quality === 'legendary')) {
    resMul['coin'] = (resMul['coin'] ?? 1) * 1.02;
  }
  return { resMul, bldMul, upkeepDelta };
}
