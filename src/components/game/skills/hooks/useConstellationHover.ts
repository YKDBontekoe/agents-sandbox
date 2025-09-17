import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { ConstellationLayout } from '../layout/constellation';
import type { ConstellationNode, SkillNode, TooltipState, ParticleEffect } from '../types';
import type { PanZoomMouseMoveResult } from './useConstellationPanZoom';

interface UseConstellationHoverOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  layout: ConstellationLayout;
  hover: ConstellationNode | null;
  onHoverChange: Dispatch<SetStateAction<ConstellationNode | null>>;
  onTooltipChange: Dispatch<SetStateAction<TooltipState>>;
  updateNodeTransition: (
    nodeId: string,
    target: { scale?: number; glowIntensity?: number },
  ) => void;
  spawnParticles: (
    x: number,
    y: number,
    type: ParticleEffect['type'],
    count: number,
    color: string,
  ) => void;
  colorFor: (category: SkillNode['category']) => string;
}

export interface UseConstellationHoverResult {
  handleMouseMove: (result: PanZoomMouseMoveResult | null) => void;
  handleMouseLeave: () => void;
  cancelHoverIntent: () => void;
}

export function useConstellationHover({
  canvasRef,
  layout,
  hover,
  onHoverChange,
  onTooltipChange,
  updateNodeTransition,
  spawnParticles,
  colorFor,
}: UseConstellationHoverOptions): UseConstellationHoverResult {
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTargetRef = useRef<ConstellationNode | null>(null);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearHoverTimeout();
    onTooltipChange((prev) => {
      if (!prev.visible && prev.node === null && prev.fadeIn === 0) {
        return prev;
      }
      return { ...prev, visible: false, fadeIn: 0, node: null };
    });
  }, [clearHoverTimeout, onTooltipChange]);

  useEffect(
    () => () => {
      clearHoverTimeout();
    },
    [clearHoverTimeout],
  );

  const applyHover = useCallback(
    (hoveredNode: ConstellationNode | null, canvasPosition: { x: number; y: number }) => {
      hoverTargetRef.current = hoveredNode;
      onHoverChange(hoveredNode);

      if (!hoveredNode) {
        hideTooltip();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const hoverRect = canvas.getBoundingClientRect();
      const canvasWidth = hoverRect.width;
      const canvasHeight = hoverRect.height;

      let tooltipX = canvasPosition.x;
      let tooltipY = canvasPosition.y;
      let anchor: TooltipState['anchor'] = 'top';
      let offset = { x: 15, y: -10 };
      const tooltipWidth = 250;
      const tooltipHeight = 120;

      if (canvasPosition.x + tooltipWidth + 20 > canvasWidth) {
        anchor = 'left';
        offset = { x: -tooltipWidth - 15, y: -tooltipHeight / 2 };
      } else if (canvasPosition.y + tooltipHeight + 20 > canvasHeight) {
        anchor = 'bottom';
        offset = { x: 15, y: -tooltipHeight - 15 };
      } else if (canvasPosition.y - tooltipHeight - 20 < 0) {
        anchor = 'top';
        offset = { x: 15, y: 15 };
      }

      tooltipX = Math.max(10, Math.min(canvasWidth - tooltipWidth - 10, canvasPosition.x + offset.x));
      tooltipY = Math.max(10, Math.min(canvasHeight - tooltipHeight - 10, canvasPosition.y + offset.y));

      clearHoverTimeout();
      const targetNodeId = hoveredNode.node.id;
      const targetAnchor = anchor;
      const targetOffset = offset;
      const targetX = tooltipX;
      const targetY = tooltipY;

      hoverTimeoutRef.current = setTimeout(() => {
        if (hoverTargetRef.current?.node.id !== targetNodeId) return;
        onTooltipChange({
          visible: true,
          x: targetX,
          y: targetY,
          node: hoveredNode.node,
          fadeIn: 0,
          anchor: targetAnchor,
          offset: targetOffset,
        });
      }, 150);
    },
    [canvasRef, clearHoverTimeout, hideTooltip, onHoverChange, onTooltipChange],
  );

  const handleMouseMove = useCallback(
    (result: PanZoomMouseMoveResult | null) => {
      if (!result) return;

      const { canvas, world, isDragging, didPan } = result;

      if (isDragging) {
        if (didPan) {
          hoverTargetRef.current = null;
          if (hover) {
            updateNodeTransition(hover.node.id, { scale: 1, glowIntensity: 0 });
            onHoverChange(null);
          }
          hideTooltip();
        }
        return;
      }

      let hoveredNode: ConstellationNode | null = null;
      for (const cNode of layout.nodes) {
        const dx = world.x - cNode.x;
        const dy = world.y - cNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 20) {
          hoveredNode = cNode;
          break;
        }
      }

      if (hoveredNode && hoveredNode !== hover) {
        const nodeColor = colorFor(hoveredNode.node.category);
        spawnParticles(hoveredNode.x, hoveredNode.y, 'hover', 4, nodeColor);
        updateNodeTransition(hoveredNode.node.id, { scale: 1.1, glowIntensity: 0.8 });
      }

      if (hover && hoveredNode !== hover) {
        updateNodeTransition(hover.node.id, { scale: 1, glowIntensity: 0 });
      }

      applyHover(hoveredNode, canvas);
    },
    [
      applyHover,
      colorFor,
      hover,
      layout.nodes,
      spawnParticles,
      updateNodeTransition,
      hideTooltip,
      onHoverChange,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    hoverTargetRef.current = null;
    clearHoverTimeout();
    if (hover) {
      updateNodeTransition(hover.node.id, { scale: 1, glowIntensity: 0 });
      onHoverChange(null);
    }
    hideTooltip();
  }, [clearHoverTimeout, hideTooltip, hover, onHoverChange, updateNodeTransition]);

  const cancelHoverIntent = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  return useMemo(
    () => ({
      handleMouseMove,
      handleMouseLeave,
      cancelHoverIntent,
    }),
    [handleMouseMove, handleMouseLeave, cancelHoverIntent],
  );
}
