import { Achievement, QualityChallenge, SkillNode, SkillTree } from './types';

export interface AccumulatedSkillEffects {
  resMul: Record<string, number>;
  bldMul: Record<string, number>;
  upkeepDelta: number;
  globalBuildingMultiplier: number;
  globalResourceMultiplier: number;
  routeCoinMultiplier: number;
  patrolCoinUpkeepMultiplier: number;
  buildingInputMultiplier: number;
}

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

export function accumulateEffects(unlocked: SkillNode[]): AccumulatedSkillEffects {
  const resMul: Record<string, number> = {};
  const bldMul: Record<string, number> = {};
  let upkeepDelta = 0;
  let globalBuildingMultiplier = 1;
  let globalResourceMultiplier = 1;
  let routeCoinMultiplier = 1;
  let patrolCoinUpkeepMultiplier = 1;
  let buildingInputMultiplier = 1;
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
    if (s.specialAbility) {
      const ability = s.specialAbility;
      const power = Math.max(0, ability.power);
      switch (ability.id) {
        case 'golden_touch': {
          const factor = power > 0 ? power : 2;
          ['trade_post', 'automation_workshop'].forEach(typeId => {
            bldMul[typeId] = (bldMul[typeId] ?? 1) * factor;
          });
          break;
        }
        case 'market_insight': {
          const factor = power > 0 ? power : 1.25;
          routeCoinMultiplier *= factor;
          bldMul['trade_post'] = (bldMul['trade_post'] ?? 1) * (1 + 0.1 * power);
          break;
        }
        case 'battle_fury': {
          const relief = Math.min(0.2, 0.2 * power);
          upkeepDelta -= relief;
          break;
        }
        case 'fortress_shield': {
          patrolCoinUpkeepMultiplier = 0;
          break;
        }
        case 'mana_storm': {
          const factor = power > 0 ? power : 3;
          resMul['mana'] = (resMul['mana'] ?? 1) * factor;
          globalResourceMultiplier *= 1 + 0.05 * power;
          break;
        }
        case 'arcane_mastery': {
          const manaBoost = 1 + 0.15 * power;
          const shrineBoost = 1 + 0.1 * power;
          resMul['mana'] = (resMul['mana'] ?? 1) * manaBoost;
          bldMul['shrine'] = (bldMul['shrine'] ?? 1) * shrineBoost;
          break;
        }
        case 'rapid_construction': {
          const materialBoost = 1 + 0.25 * power;
          resMul['wood'] = (resMul['wood'] ?? 1) * materialBoost;
          resMul['planks'] = (resMul['planks'] ?? 1) * materialBoost;
          globalBuildingMultiplier *= 1 + 0.05 * power;
          break;
        }
        case 'efficiency_boost': {
          const boost = 1 + 0.2 * power;
          globalBuildingMultiplier *= boost;
          break;
        }
        case 'silver_tongue': {
          const factor = power > 0 ? power : 1.5;
          resMul['favor'] = (resMul['favor'] ?? 1) * factor;
          break;
        }
        case 'peace_treaty': {
          const relief = 0.03 * power;
          upkeepDelta -= relief;
          const costFactor = Math.max(0.6, 1 - 0.15 * power);
          buildingInputMultiplier *= costFactor;
          break;
        }
        case 'festival_spirit': {
          const celebration = 1 + 0.08 * power;
          globalResourceMultiplier *= celebration;
          break;
        }
        case 'unity_bond': {
          const factor = power > 0 ? Math.min(1, ability.power) : 0.8;
          buildingInputMultiplier *= factor;
          upkeepDelta -= 0.02 * Math.max(1 - factor, 0);
          break;
        }
        default:
          break;
      }
    }
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
  return {
    resMul,
    bldMul,
    upkeepDelta,
    globalBuildingMultiplier,
    globalResourceMultiplier,
    routeCoinMultiplier,
    patrolCoinUpkeepMultiplier,
    buildingInputMultiplier,
  };
}
