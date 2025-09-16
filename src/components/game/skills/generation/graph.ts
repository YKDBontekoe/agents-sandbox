import type { SkillNode } from '../types';
import { getSynergyCategories, pick, type RNG } from './utils';

export interface Edge {
  from: string;
  to: string;
}

export interface PrerequisiteContext {
  tier: number;
  nodeId: string;
  category: SkillNode['category'];
  rarity: SkillNode['rarity'];
  prevTierNodeIds: string[];
  nodesByCategory: Record<SkillNode['category'], string[]>;
  rng: RNG;
  synergyResolver?: (category: SkillNode['category']) => SkillNode['category'][];
}

export function buildPrerequisites(context: PrerequisiteContext): { requires: string[]; edges: Edge[] } {
  const {
    tier,
    nodeId,
    category,
    rarity,
    prevTierNodeIds,
    nodesByCategory,
    rng,
    synergyResolver = getSynergyCategories,
  } = context;

  const requires: string[] = [];

  if (tier > 0 && prevTierNodeIds.length > 0) {
    const primaryRequirement = pick(rng, prevTierNodeIds);
    requires.push(primaryRequirement);

    if (tier > 2 && nodesByCategory[category]?.length > 0 && rng() < 0.4) {
      const categoryRequirement = pick(rng, nodesByCategory[category]);
      if (!requires.includes(categoryRequirement)) {
        requires.push(categoryRequirement);
      }
    }

    if ((rarity === 'rare' || rarity === 'legendary') && tier > 1 && rng() < 0.3) {
      const availableSynergies = synergyResolver(category)
        .flatMap(synCat => nodesByCategory[synCat] ?? []);
      if (availableSynergies.length > 0) {
        const synergyRequirement = pick(rng, availableSynergies);
        if (!requires.includes(synergyRequirement)) {
          requires.push(synergyRequirement);
        }
      }
    }
  }

  const edges = requires.map(req => ({ from: req, to: nodeId }));
  return { requires, edges };
}

export interface CrossLinkContext {
  tier: number;
  prevTierNodeIds: string[];
  currentTierNodeIds: string[];
  categories: ReadonlyArray<SkillNode['category']>;
  currentByCategory: Record<SkillNode['category'], string[]>;
  nodesByCategory: Record<SkillNode['category'], string[]>;
  rng: RNG;
  existingEdges?: Edge[];
  synergyResolver?: (category: SkillNode['category']) => SkillNode['category'][];
}

export function buildCrossLinks(context: CrossLinkContext): Edge[] {
  const {
    tier,
    prevTierNodeIds,
    currentTierNodeIds,
    categories,
    currentByCategory,
    nodesByCategory,
    rng,
    existingEdges = [],
    synergyResolver = getSynergyCategories,
  } = context;

  const edges: Edge[] = [];
  const seen = new Set(existingEdges.map(edge => `${edge.from}->${edge.to}`));

  const registerEdge = (edge: Edge) => {
    if (edge.from === edge.to) return;
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };

  if (tier > 0 && prevTierNodeIds.length > 0 && currentTierNodeIds.length > 0) {
    const linkCount = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < linkCount; i++) {
      if (prevTierNodeIds.length === 0 || currentTierNodeIds.length === 0) break;
      const from = pick(rng, prevTierNodeIds);
      const to = pick(rng, currentTierNodeIds);
      registerEdge({ from, to });
    }
  }

  if (tier > 2) {
    categories.forEach(category => {
      const currentNodes = currentByCategory[category] ?? [];
      if (currentNodes.length === 0) return;
      if (rng() >= 0.3) return;

      const synergyCategories = synergyResolver(category);
      synergyCategories.forEach(synergyCategory => {
        const availableNodes = nodesByCategory[synergyCategory] ?? [];
        if (availableNodes.length === 0) return;
        if (rng() >= 0.5) return;
        const from = pick(rng, availableNodes);
        const to = pick(rng, currentNodes);
        registerEdge({ from, to });
      });
    });
  }

  return edges;
}
