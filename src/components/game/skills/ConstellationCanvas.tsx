import React, { useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ConstellationLayout } from './layout/constellation';
import type {
  ConstellationNode,
  SkillNode,
  SkillTree,
  TooltipState,
  Vec2,
} from './types';
import { useConstellationRenderer } from './hooks/useConstellationRenderer';
import {
  useConstellationController,
  type ControllerHandlers,
} from './hooks/useConstellationController';

interface ConstellationCanvasProps {
  tree: SkillTree;
  unlocked: Record<string, boolean>;
  layout: ConstellationLayout;
  pan: Vec2;
  zoom: number;
  hover: ConstellationNode | null;
  selected: ConstellationNode | null;
  size: { w: number; h: number };
  tooltipState: TooltipState;
  highlightNodes: Set<string>;
  highlightEdges: Set<string>;
  colorFor: (category: SkillNode['category']) => string;
  canAfford: (node: SkillNode) => boolean;
  checkUnlock: (node: SkillNode) => { ok: boolean; reasons: string[] };
  onPanChange: Dispatch<SetStateAction<Vec2>>;
  onZoomChange: Dispatch<SetStateAction<number>>;
  onHoverChange: Dispatch<SetStateAction<ConstellationNode | null>>;
  onSelectedChange: (node: ConstellationNode | null) => void;
  onTooltipChange: Dispatch<SetStateAction<TooltipState>>;
  onUnlock: (node: SkillNode) => void;
  className?: string;
  onControlsChange?: (handlers: ControllerHandlers) => void;
  setSize: Dispatch<SetStateAction<{ w: number; h: number }>>;
}

export default function ConstellationCanvas({
  tree,
  unlocked,
  layout,
  pan,
  zoom,
  hover,
  selected,
  size,
  tooltipState,
  highlightNodes,
  highlightEdges,
  colorFor,
  canAfford,
  checkUnlock,
  onPanChange,
  onZoomChange,
  onHoverChange,
  onSelectedChange,
  onTooltipChange,
  onUnlock,
  className,
  onControlsChange,
  setSize,
}: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { updateNodeTransition, spawnParticles } = useConstellationRenderer({
    canvasRef,
    layout,
    tree,
    unlocked,
    hover,
    selected,
    highlightNodes,
    highlightEdges,
    pan,
    zoom,
    size,
    colorFor,
    canAfford,
    checkUnlock,
    tooltip: tooltipState,
    setTooltip: onTooltipChange,
  });

  const controllerHandlers = useConstellationController({
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
  });

  useEffect(() => {
    if (!onControlsChange) return;
    onControlsChange(controllerHandlers);
  }, [controllerHandlers, onControlsChange]);

  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setSize({ w: container.clientWidth, h: container.clientHeight });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSize]);

  const eventHandlers = useMemo(
    () => ({
      onMouseMove: controllerHandlers.onMouseMove,
      onMouseDown: controllerHandlers.onMouseDown,
      onMouseUp: controllerHandlers.onMouseUp,
      onMouseLeave: controllerHandlers.onMouseLeave,
      onClick: controllerHandlers.onClick,
      onWheel: controllerHandlers.onWheel,
    }),
    [
      controllerHandlers.onClick,
      controllerHandlers.onMouseDown,
      controllerHandlers.onMouseLeave,
      controllerHandlers.onMouseMove,
      controllerHandlers.onMouseUp,
      controllerHandlers.onWheel,
    ],
  );

  return <canvas ref={canvasRef} className={className} {...eventHandlers} />;
}
