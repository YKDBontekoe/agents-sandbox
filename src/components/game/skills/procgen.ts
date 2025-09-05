export type SkillEffect =
  | { kind: 'resource_multiplier'; resource: 'grain' | 'coin' | 'mana' | 'favor' | 'wood' | 'planks'; factor: number }
  | { kind: 'building_multiplier'; typeId: string; factor: number }
  | { kind: 'upkeep_delta'; grainPerWorkerDelta: number };

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  category: 'economic' | 'military' | 'mystical' | 'infrastructure' | 'diplomatic' | 'social';
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

  // Helper to build effects per category
  const makeEffects = (cat: SkillNode['category']): SkillEffect[] => {
    switch (cat) {
      case 'economic':
        return [{ kind: 'resource_multiplier', resource: 'coin', factor: 1.06 + rng() * 0.05 }];
      case 'military':
        return [{ kind: 'upkeep_delta', grainPerWorkerDelta: -0.02 - rng() * 0.03 }];
      case 'mystical':
        return [{ kind: 'resource_multiplier', resource: 'mana', factor: 1.08 + rng() * 0.06 }];
      case 'infrastructure':
        return [{ kind: 'building_multiplier', typeId: pick(rng, ['farm', 'lumber_camp', 'sawmill', 'trade_post']), factor: 1.10 + rng() * 0.08 }];
      case 'diplomatic':
        return [{ kind: 'resource_multiplier', resource: 'favor', factor: 1.10 + rng() * 0.08 }];
      case 'social':
        return [{ kind: 'resource_multiplier', resource: 'grain', factor: 1.05 + rng() * 0.05 }];
    }
  };

  const makeCost = (): SkillNode['cost'] => ({
    coin: Math.round(20 + rng() * 40),
    mana: Math.round(5 + rng() * 10),
    favor: Math.round(3 + rng() * 6),
  });

  // Generate tiers (like a tree)
  const tiers = 6; // larger tree
  let prevTier: string[] = [];
  for (let t = 0; t < tiers; t++) {
    const count = 4 + Math.floor(rng() * 3);
    const current: string[] = [];
    for (let i = 0; i < count; i++) {
      const cat = pick(rng, categories);
      const node: SkillNode = {
        id: id(nodes.length),
        title: pick(rng, titlesByCat[cat]),
        description: `Benefit aligned to ${cat}.`,
        category: cat,
        cost: makeCost(),
        effects: makeEffects(cat),
        requires: t > 0 && prevTier.length ? [pick(rng, prevTier)] : [],
      };
      nodes.push(node);
      current.push(node.id);
      if (node.requires && node.requires.length) edges.push({ from: node.requires[0], to: node.id });
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
      }
    });
  });
  return { resMul, bldMul, upkeepDelta };
}
