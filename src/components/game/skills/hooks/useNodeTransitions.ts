import { useCallback, useState } from 'react';

export type NodeTransitionTarget = Partial<Pick<NodeTransitionState, 'scale' | 'opacity' | 'glowIntensity'>>;

export interface NodeTransitionState {
  scale: number;
  opacity: number;
  glowIntensity: number;
  targetScale: number;
  targetOpacity: number;
  targetGlowIntensity: number;
  lastUpdate: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const TRANSITION_DURATION = 300;

export const DEFAULT_NODE_TRANSITION: NodeTransitionState = {
  scale: 1,
  opacity: 1,
  glowIntensity: 0,
  targetScale: 1,
  targetOpacity: 1,
  targetGlowIntensity: 0,
  lastUpdate: 0,
};

export function useNodeTransitions(duration: number = TRANSITION_DURATION) {
  const [transitions, setTransitions] = useState<Map<string, NodeTransitionState>>(() => new Map());

  const updateNodeTransition = useCallback((nodeId: string, target: NodeTransitionTarget) => {
    setTransitions((prev) => {
      const current = prev.get(nodeId) ?? {
        ...DEFAULT_NODE_TRANSITION,
        lastUpdate: Date.now(),
      };

      const next = new Map(prev);
      next.set(nodeId, {
        ...current,
        targetScale: target.scale ?? current.targetScale,
        targetOpacity: target.opacity ?? current.targetOpacity,
        targetGlowIntensity: target.glowIntensity ?? current.targetGlowIntensity,
        lastUpdate: Date.now(),
      });
      return next;
    });
  }, []);

  const tickTransitions = useCallback(
    (now: number = Date.now()) => {
      setTransitions((prev) => {
        if (prev.size === 0) return prev;

        const updated = new Map<string, NodeTransitionState>();

        for (const [nodeId, transition] of prev) {
          const elapsed = now - transition.lastUpdate;
          const progress = Math.min(1, elapsed / duration);

          if (progress < 1) {
            const easedProgress = easeOutCubic(progress);
            updated.set(nodeId, {
              ...transition,
              scale:
                transition.scale +
                (transition.targetScale - transition.scale) * easedProgress,
              opacity:
                transition.opacity +
                (transition.targetOpacity - transition.opacity) * easedProgress,
              glowIntensity:
                transition.glowIntensity +
                (transition.targetGlowIntensity - transition.glowIntensity) * easedProgress,
            });
          } else {
            updated.set(nodeId, {
              ...transition,
              scale: transition.targetScale,
              opacity: transition.targetOpacity,
              glowIntensity: transition.targetGlowIntensity,
            });
          }
        }

        return updated;
      });
    },
    [duration],
  );

  return {
    transitions,
    updateNodeTransition,
    tickTransitions,
  };
}
