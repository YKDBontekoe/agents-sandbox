import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { expandSkillTree } from './generate';
import type { SkillTree } from './types';

interface UseSkillTreeFrontierExpansionOptions {
  tree: SkillTree;
  selectedNodeId: string | null;
  seed: number;
  setTree: Dispatch<SetStateAction<SkillTree>>;
  tiersToAdd?: number;
  frontierBuffer?: number;
}

export function useSkillTreeFrontierExpansion({
  tree,
  selectedNodeId,
  seed,
  setTree,
  tiersToAdd = 4,
  frontierBuffer = 2,
}: UseSkillTreeFrontierExpansionOptions) {
  const lastExpandedMaxTierRef = useRef<number | null>(null);
  const layoutMaxTier = tree.layout?.maxTier ?? null;

  useEffect(() => {
    if (!selectedNodeId || layoutMaxTier === null) return;

    const selected = tree.nodes.find(n => n.id === selectedNodeId);
    if (!selected || typeof selected.tier !== 'number') return;

    const nearFrontier = selected.tier >= layoutMaxTier - frontierBuffer;
    if (!nearFrontier) return;

    if (lastExpandedMaxTierRef.current === layoutMaxTier) return;
    lastExpandedMaxTierRef.current = layoutMaxTier;

    setTree(prev => {
      if (!prev.layout) return prev;

      const layoutClone = {
        ...prev.layout,
        tiers: { ...prev.layout.tiers },
        categoryDistribution: Object.fromEntries(
          Object.entries(prev.layout.categoryDistribution).map(([key, value]) => [key, [...value]])
        ) as Record<string, number[]>,
        maxTier: typeof prev.layout.maxTier === 'number' ? prev.layout.maxTier : 0,
      };

      return expandSkillTree(
        {
          ...prev,
          nodes: [...prev.nodes],
          edges: [...prev.edges],
          layout: layoutClone,
        },
        seed,
        tiersToAdd,
      );
    });
  }, [selectedNodeId, layoutMaxTier, tree.nodes, seed, frontierBuffer, tiersToAdd, setTree]);

  useEffect(() => {
    if (layoutMaxTier === null) {
      lastExpandedMaxTierRef.current = null;
    }
  }, [layoutMaxTier]);
}
