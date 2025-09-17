import {
  useCallback,
  useMemo,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type {
  ConstellationNode,
  SkillNode,
  TooltipState,
  Vec2,
  ParticleEffect,
} from '../types';
import type { ConstellationLayout } from '../layout/constellation';
import { useConstellationPanZoom } from './useConstellationPanZoom';
import { useConstellationHover } from './useConstellationHover';

interface UseConstellationControllerOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  layout: ConstellationLayout;
  size: { w: number; h: number };
  pan: Vec2;
  zoom: number;
  hover: ConstellationNode | null;
  selected: ConstellationNode | null;
  onHoverChange: Dispatch<SetStateAction<ConstellationNode | null>>;
  onSelectedChange: (node: ConstellationNode | null) => void;
  onPanChange: Dispatch<SetStateAction<Vec2>>;
  onZoomChange: Dispatch<SetStateAction<number>>;
  onTooltipChange: Dispatch<SetStateAction<TooltipState>>;
  onUnlock: (node: SkillNode) => void;
  colorFor: (category: SkillNode['category']) => string;
  checkUnlock: (node: SkillNode) => { ok: boolean; reasons: string[] };
  updateNodeTransition: (nodeId: string, target: { scale?: number; glowIntensity?: number }) => void;
  spawnParticles: (
    x: number,
    y: number,
    type: ParticleEffect['type'],
    count: number,
    color: string,
  ) => void;
}

export interface ControllerHandlers {
  onMouseMove: (event: ReactMouseEvent<HTMLCanvasElement>) => void;
  onMouseDown: (event: ReactMouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: () => void;
  zoomTo: (value: number, options?: { animate?: boolean }) => void;
}

export function useConstellationController({
  canvasRef,
  layout,
  size,
  pan,
  zoom,
  hover,
  selected,
  onHoverChange,
  onSelectedChange,
  onPanChange,
  onZoomChange,
  onTooltipChange,
  onUnlock,
  colorFor,
  checkUnlock,
  updateNodeTransition,
  spawnParticles,
}: UseConstellationControllerOptions): ControllerHandlers {
  const panZoom = useConstellationPanZoom({
    canvasRef,
    layout,
    size,
    pan,
    zoom,
    onPanChange,
    onZoomChange,
  });

  const hoverHandlers = useConstellationHover({
    canvasRef,
    layout,
    hover,
    onHoverChange,
    onTooltipChange,
    updateNodeTransition,
    spawnParticles,
    colorFor,
  });

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const result = panZoom.handleMouseMove(event);
      hoverHandlers.handleMouseMove(result);
    },
    [hoverHandlers, panZoom],
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      hoverHandlers.cancelHoverIntent();
      panZoom.handleMouseDown(event);
    },
    [hoverHandlers, panZoom],
  );

  const handleMouseUp = useCallback(() => {
    panZoom.handleMouseUp();
  }, [panZoom]);

  const handleMouseLeave = useCallback(() => {
    panZoom.handleMouseLeave();
    hoverHandlers.handleMouseLeave();
  }, [hoverHandlers, panZoom]);

  const handleClick = useCallback(() => {
    if (panZoom.isDragging()) return;

    if (hover) {
      const { node } = hover;
      const { ok: canUnlockNode } = checkUnlock(node);

      if (selected && selected.node.id !== node.id) {
        updateNodeTransition(selected.node.id, { scale: 1, glowIntensity: 0 });
      }

      if (canUnlockNode) {
        const nodeColor = colorFor(node.category);
        spawnParticles(hover.x, hover.y, 'unlock', 8, nodeColor);
        onUnlock(node);
        updateNodeTransition(node.id, { scale: 1.3, glowIntensity: 1.2 });
      } else {
        updateNodeTransition(node.id, { scale: 1.15, glowIntensity: 0.9 });
      }

      onSelectedChange(hover);
    } else {
      if (selected) {
        updateNodeTransition(selected.node.id, { scale: 1, glowIntensity: 0 });
      }
      onSelectedChange(null);
    }
  }, [
    hover,
    selected,
    checkUnlock,
    updateNodeTransition,
    colorFor,
    spawnParticles,
    onUnlock,
    onSelectedChange,
    panZoom,
  ]);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      panZoom.handleWheel(event);
    },
    [panZoom],
  );

  return useMemo(
    () => ({
      onMouseMove: handleMouseMove,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onWheel: handleWheel,
      zoomIn: panZoom.zoomIn,
      zoomOut: panZoom.zoomOut,
      resetZoom: panZoom.resetZoom,
      fitToView: panZoom.fitToView,
      zoomTo: panZoom.zoomTo,
    }),
    [
      handleMouseMove,
      handleMouseDown,
      handleMouseUp,
      handleMouseLeave,
      handleClick,
      handleWheel,
      panZoom.fitToView,
      panZoom.resetZoom,
      panZoom.zoomIn,
      panZoom.zoomOut,
      panZoom.zoomTo,
    ],
  );
}
