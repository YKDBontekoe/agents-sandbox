export type SkillEffect =
  | { kind: 'resource_multiplier'; resource: 'grain' | 'coin' | 'mana' | 'favor' | 'wood' | 'planks'; factor: number }
  | { kind: 'building_multiplier'; typeId: string; factor: number }
  | { kind: 'upkeep_delta'; grainPerWorkerDelta: number }
  | { kind: 'route_bonus'; percent: number }
  | { kind: 'logistics_bonus'; percent: number };

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  category: 'economic' | 'military' | 'mystical' | 'infrastructure' | 'diplomatic' | 'social';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  tags: string[];
  cost: { coin?: number; mana?: number; favor?: number };
  effects: SkillEffect[];
  requires?: string[];
}

export interface SkillTree {
  nodes: SkillNode[];
  edges: Array<{ from: string; to: string }>; // prerequisites
}

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

  const makeCost = (rarity: SkillNode['rarity']): SkillNode['cost'] => {
    const base = rarity === 'common' ? 1 : rarity === 'uncommon' ? 1.5 : rarity === 'rare' ? 2 : 3;
    return {
      coin: Math.round((15 + rng() * 35) * base),
      mana: Math.round((3 + rng() * 8) * base),
      favor: Math.round((2 + rng() * 6) * base),
    };
  };

  const pickRarity = (): SkillNode['rarity'] => {
    const r = rng();
    if (r < 0.55) return 'common';
    if (r < 0.85) return 'uncommon';
    if (r < 0.97) return 'rare';
    return 'legendary';
  };

  // Generate tiers (like a tree)
  const tiers = 8; // larger tree
  let prevTier: string[] = [];
  for (let t = 0; t < tiers; t++) {
    const count = 6 + Math.floor(rng() * 5); // more nodes per tier
    const current: string[] = [];
    for (let i = 0; i < count; i++) {
      const cat = pick(rng, categories);
      const rarity = pickRarity();
      const tags = [cat, rarity, rng() < 0.5 ? 'economy' : 'growth'];
      const node: SkillNode = {
        id: id(nodes.length),
        title: pick(rng, titlesByCat[cat]),
        description: `Benefit aligned to ${cat}. Procedurally tailored.`,
        category: cat,
        rarity,
        tags,
        cost: makeCost(rarity),
        effects: makeEffects(cat),
        requires: t > 0 && prevTier.length ? Array.from(new Set([pick(rng, prevTier)])).slice(0, 1) : [],
      };
      nodes.push(node);
      current.push(node.id);
      if (node.requires && node.requires.length) edges.push({ from: node.requires[0], to: node.id });
    }
    // Add some cross-links for web-like branches
    if (t > 0) {
      const links = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < links; k++) {
        const from = pick(rng, prevTier);
        const to = pick(rng, current);
        if (from !== to) edges.push({ from, to });
      }
    }
    prevTier = current;
  }

  return { nodes, edges };
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
  return { resMul, bldMul, upkeepDelta };
}
