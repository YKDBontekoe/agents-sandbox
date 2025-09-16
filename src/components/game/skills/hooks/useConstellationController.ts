import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type {
  ConstellationNode,
  SkillNode,
  TooltipState,
  Vec2,
  ParticleEffect,
} from '../types';
import type { ConstellationLayout } from '../layout/constellation';

interface UseConstellationControllerOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  layout: ConstellationLayout;
  size: { w: number; h: number };
  pan: Vec2;
  zoom: number;
  hover: ConstellationNode | null;
  selected: ConstellationNode | null;
  onHoverChange: React.Dispatch<React.SetStateAction<ConstellationNode | null>>;
  onSelectedChange: (node: ConstellationNode | null) => void;
  onPanChange: React.Dispatch<React.SetStateAction<Vec2>>;
  onZoomChange: React.Dispatch<React.SetStateAction<number>>;
  onTooltipChange: React.Dispatch<React.SetStateAction<TooltipState>>;
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

interface ControllerHandlers {
  onMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onWheel: (event: React.WheelEvent<HTMLCanvasElement>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: () => void;
  zoomTo: (value: number, options?: { animate?: boolean }) => void;
}

const clampZoom = (value: number) => Math.max(0.2, Math.min(4.0, value));

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
  const dragRef = useRef<{ dragging: boolean; start: Vec2; startPan: Vec2 }>({
    dragging: false,
    start: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
  });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTargetRef = useRef<ConstellationNode | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const latestZoomRef = useRef(zoom);

  useEffect(() => {
    latestZoomRef.current = zoom;
  }, [zoom]);

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

  const clearZoomAnimation = useCallback(() => {
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearHoverTimeout();
    clearZoomAnimation();
  }, [clearHoverTimeout, clearZoomAnimation]);

  const zoomTo = useCallback(
    (targetZoom: number, options?: { animate?: boolean }) => {
      const clamped = clampZoom(targetZoom);
      if (options?.animate) {
        clearZoomAnimation();
        const step = () => {
          let shouldContinue = true;
          onZoomChange((prev) => {
            const diff = clamped - prev;
            if (Math.abs(diff) <= 0.001) {
              latestZoomRef.current = clamped;
              shouldContinue = false;
              return clamped;
            }
            const next = prev + diff * 0.2;
            latestZoomRef.current = next;
            return next;
          });
          if (shouldContinue) {
            zoomAnimationRef.current = requestAnimationFrame(step);
          } else {
            zoomAnimationRef.current = null;
          }
        };
        zoomAnimationRef.current = requestAnimationFrame(step);
      } else {
        clearZoomAnimation();
        latestZoomRef.current = clamped;
        onZoomChange(clamped);
      }
    },
    [clearZoomAnimation, onZoomChange],
  );

  const zoomIn = useCallback(() => {
    zoomTo(latestZoomRef.current * 1.2);
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    zoomTo(latestZoomRef.current * 0.8);
  }, [zoomTo]);

  const resetZoom = useCallback(() => {
    zoomTo(1.0);
    onPanChange({ x: 0, y: 0 });
  }, [zoomTo, onPanChange]);

  const fitToView = useCallback(() => {
    if (layout.nodes.length === 0) return;
    const bounds = layout.nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );

    const padding = 100;
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;

    const scaleX = size.w / contentWidth;
    const scaleY = size.h / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 2.0);

    zoomTo(newZoom);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    onPanChange({ x: -centerX * newZoom, y: -centerY * newZoom });
  }, [layout.nodes, size, zoomTo, onPanChange]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      if (dragRef.current.dragging) {
        const dx = mouseX - dragRef.current.start.x;
        const dy = mouseY - dragRef.current.start.y;

        if (dx !== 0 || dy !== 0) {
          hoverTargetRef.current = null;
          if (hover) {
            updateNodeTransition(hover.node.id, { scale: 1, glowIntensity: 0 });
            onHoverChange(null);
          }
          hideTooltip();
        }

        onPanChange({
          x: dragRef.current.startPan.x + dx,
          y: dragRef.current.startPan.y + dy,
        });
        return;
      }

      const worldX = (mouseX - size.w / 2 - pan.x) / zoom;
      const worldY = (mouseY - size.h / 2 - pan.y) / zoom;

      let hoveredNode: ConstellationNode | null = null;
      for (const cNode of layout.nodes) {
        const dx = worldX - cNode.x;
        const dy = worldY - cNode.y;
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

      hoverTargetRef.current = hoveredNode;
      onHoverChange(hoveredNode);

      if (hoveredNode && hoveredNode !== hover) {
        const hoverCanvas = canvasRef.current;
        if (hoverCanvas) {
          const hoverRect = hoverCanvas.getBoundingClientRect();
          const canvasWidth = hoverRect.width;
          const canvasHeight = hoverRect.height;
          let tooltipX = mouseX;
          let tooltipY = mouseY;
          let anchor: TooltipState['anchor'] = 'top';
          let offset = { x: 15, y: -10 };
          const tooltipWidth = 250;
          const tooltipHeight = 120;

          if (mouseX + tooltipWidth + 20 > canvasWidth) {
            anchor = 'left';
            offset = { x: -tooltipWidth - 15, y: -tooltipHeight / 2 };
          } else if (mouseY + tooltipHeight + 20 > canvasHeight) {
            anchor = 'bottom';
            offset = { x: 15, y: -tooltipHeight - 15 };
          } else if (mouseY - tooltipHeight - 20 < 0) {
            anchor = 'top';
            offset = { x: 15, y: 15 };
          }

          tooltipX = Math.max(10, Math.min(canvasWidth - tooltipWidth - 10, mouseX + offset.x));
          tooltipY = Math.max(10, Math.min(canvasHeight - tooltipHeight - 10, mouseY + offset.y));

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
        }
      } else if (!hoveredNode) {
        hideTooltip();
      }
    },
    [
      canvasRef,
      layout.nodes,
      pan,
      zoom,
      size,
      hover,
      onHoverChange,
      hideTooltip,
      colorFor,
      spawnParticles,
      updateNodeTransition,
      clearHoverTimeout,
      onPanChange,
      onTooltipChange,
    ],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      dragRef.current = {
        dragging: true,
        start: { x: mouseX, y: mouseY },
        startPan: { ...pan },
      };
      clearHoverTimeout();
    },
    [canvasRef, pan, clearHoverTimeout],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current.dragging = false;
    hoverTargetRef.current = null;
    if (hover) {
      updateNodeTransition(hover.node.id, { scale: 1, glowIntensity: 0 });
      onHoverChange(null);
    }
    hideTooltip();
  }, [hover, hideTooltip, onHoverChange, updateNodeTransition]);

  const handleClick = useCallback(() => {
    if (dragRef.current.dragging) return;

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
  ]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = clampZoom(latestZoomRef.current * zoomFactor);
      zoomTo(newZoom, { animate: true });
    },
    [zoomTo],
  );

  return useMemo(
    () => ({
      onMouseMove: handleMouseMove,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onWheel: handleWheel,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToView,
      zoomTo,
    }),
    [
      handleMouseMove,
      handleMouseDown,
      handleMouseUp,
      handleMouseLeave,
      handleClick,
      handleWheel,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToView,
      zoomTo,
    ],
  );
}
