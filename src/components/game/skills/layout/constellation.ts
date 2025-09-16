import type { ConstellationNode, SkillTree } from '../types';

export interface ConstellationLayoutMetrics {
  baseRingRadius: number;
  ringGap: number;
  radiusByTier: number[];
  maxConstellationRadius: number;
  maxTier: number;
  constellationSpacing: number;
}

export interface ConstellationLayout {
  nodes: ConstellationNode[];
  constellations: Record<string, { color: string; theme: string }>;
  metrics: ConstellationLayoutMetrics;
}

const CATEGORY_TO_CONSTELLATION: Record<string, string> = {
  economic: 'Merchant',
  military: 'Warrior',
  mystical: 'Mystic',
  infrastructure: 'Builder',
  diplomatic: 'Diplomat',
  social: 'Scholar',
};

const DEFAULT_CONSTELLATIONS: Record<string, { color: string; theme: string }> = {
  Warrior: { color: '#ff6b6b', theme: 'combat' },
  Scholar: { color: '#4ecdc4', theme: 'knowledge' },
  Merchant: { color: '#45b7d1', theme: 'trade' },
  Mystic: { color: '#96ceb4', theme: 'magic' },
  Builder: { color: '#feca57', theme: 'construction' },
  Diplomat: { color: '#ff9ff3', theme: 'social' },
};

const clampTier = (tier: unknown): number => {
  if (typeof tier !== 'number' || !Number.isFinite(tier)) {
    return 0;
  }
  return Math.max(0, Math.floor(tier));
};

const assignConstellation = (category: string): string => {
  return CATEGORY_TO_CONSTELLATION[category] ?? 'Scholar';
};

/**
 * Deterministically arranges skill tree nodes into a constellation layout.
 */
export function createConstellationLayout(tree: SkillTree): ConstellationLayout {
  const nodesByConstellation: Record<string, ConstellationNode[]> = {};
  let highestTierInNodes = 0;

  for (const node of tree.nodes) {
    const constellation = assignConstellation(node.category);
    const tier = clampTier(node.tier);
    highestTierInNodes = Math.max(highestTierInNodes, tier);

    const constellationNode: ConstellationNode = {
      node,
      gridX: 0,
      gridY: 0,
      x: 0,
      y: 0,
      constellation,
      tier,
    };

    if (!nodesByConstellation[constellation]) {
      nodesByConstellation[constellation] = [];
    }

    nodesByConstellation[constellation].push(constellationNode);
  }

  const layoutMaxTier = clampTier(tree.layout?.maxTier);
  const maxTier = Math.max(0, highestTierInNodes, layoutMaxTier);
  const tierCount = Math.max(1, maxTier + 1);

  const baseRingRadius = 80;
  const minRingGap = 60;
  const maxRingGap = 140;
  const gapDenominator = Math.max(1, tierCount - 1);
  const adaptiveGap = tierCount > 1 ? 320 / gapDenominator : maxRingGap;
  const ringGap = Math.min(maxRingGap, Math.max(minRingGap, adaptiveGap));
  const radiusByTier = Array.from({ length: tierCount }, (_, tierIndex) => baseRingRadius + tierIndex * ringGap);
  const maxConstellationRadius = radiusByTier[radiusByTier.length - 1] ?? baseRingRadius;
  const constellationSpacing = Math.max(450, maxConstellationRadius * 2 + 160);

  const constellationPositions = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0.5, y: 0.866 },
    { x: -0.5, y: 0.866 },
    { x: -1, y: 0 },
    { x: -0.5, y: -0.866 },
    { x: 0.5, y: -0.866 },
  ];

  const positionedNodes: ConstellationNode[] = [];
  let constellationIndex = 0;

  for (const constellationNodes of Object.values(nodesByConstellation)) {
    const pos = constellationPositions[constellationIndex % constellationPositions.length];
    const centerX = pos.x * constellationSpacing;
    const centerY = pos.y * constellationSpacing;
    const nodeCount = constellationNodes.length;

    constellationNodes.forEach((cNode, nodeIndex) => {
      const angle = nodeCount > 0 ? (nodeIndex / nodeCount) * Math.PI * 2 : 0;
      const radius = radiusByTier[cNode.tier] ?? (baseRingRadius + cNode.tier * ringGap);

      cNode.gridX = Math.round(centerX + Math.cos(angle) * radius);
      cNode.gridY = Math.round(centerY + Math.sin(angle) * radius);
      cNode.x = cNode.gridX;
      cNode.y = cNode.gridY;

      positionedNodes.push(cNode);
    });

    constellationIndex += 1;
  }

  return {
    nodes: positionedNodes,
    constellations: DEFAULT_CONSTELLATIONS,
    metrics: {
      baseRingRadius,
      ringGap,
      radiusByTier,
      maxConstellationRadius,
      maxTier,
      constellationSpacing,
    },
  };
}
