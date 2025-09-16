"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConstellationNode,
  ConstellationSkillTreeProps,
  SkillNode,
  TooltipState,
  Vec2,
} from './types';
import SkillTooltipContent from './SkillTooltipContent';
import { collectUnlockBlockers } from './unlock';
import { createConstellationLayout } from './layout/constellation';
import { computeHighlight } from './layout/highlights';
import { useConstellationRenderer } from './hooks/useConstellationRenderer';
import { useConstellationController } from './hooks/useConstellationController';

const initialTooltipState: TooltipState = {
  visible: false,
  x: 0,
  y: 0,
  node: null,
  fadeIn: 0,
  anchor: 'top',
  offset: { x: 0, y: 0 },
};

export default function ConstellationSkillTree({
  tree,
  unlocked,
  onUnlock,
  colorFor,
  focusNodeId,
  resources,
  onSelectNode,
}: ConstellationSkillTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1200, h: 800 });
  const [hover, setHover] = useState<ConstellationNode | null>(null);
  const [selected, setSelected] = useState<ConstellationNode | null>(null);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(0.8);
  const [tooltip, setTooltip] = useState<TooltipState>(initialTooltipState);
  const lastAutoFitRadius = useRef<number | null>(null);

  const layout = useMemo(() => createConstellationLayout(tree), [tree]);
  const layoutById = useMemo(() => {
    const map = new Map<string, ConstellationNode>();
    layout.nodes.forEach((node) => {
      map.set(node.node.id, node);
    });
    return map;
  }, [layout.nodes]);

  const checkUnlock = useCallback(
    (node: SkillNode) => {
      const reasons = collectUnlockBlockers({ node, unlocked, nodes: tree.nodes });
      return { ok: reasons.length === 0, reasons };
    },
    [tree.nodes, unlocked],
  );

  const canAfford = useCallback(
    (node: SkillNode) => {
      if (!resources) return true;
      const cost = node.cost ?? {};
      if (typeof cost.coin === 'number' && (resources.coin || 0) < cost.coin) return false;
      if (typeof cost.mana === 'number' && (resources.mana || 0) < cost.mana) return false;
      if (typeof cost.favor === 'number' && (resources.favor || 0) < cost.favor) return false;
      return true;
    },
    [resources],
  );

  const highlightTargetId = hover?.node.id ?? selected?.node.id ?? null;
  const { nodes: highlightNodes, edges: highlightEdges } = useMemo(
    () => computeHighlight({ targetId: highlightTargetId, tree, layoutNodes: layout.nodes }),
    [highlightTargetId, tree, layout.nodes],
  );

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
    tooltip,
    setTooltip,
  });

  const handleSelectedChange = useCallback(
    (node: ConstellationNode | null) => {
      setSelected(node);
      onSelectNode?.(node?.node.id ?? null);
    },
    [onSelectNode],
  );

  const {
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onClick,
    onWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    zoomTo,
  } = useConstellationController({
    canvasRef,
    layout,
    size,
    pan,
    zoom,
    hover,
    selected,
    onHoverChange: setHover,
    onSelectedChange: handleSelectedChange,
    onPanChange: setPan,
    onZoomChange: setZoom,
    onTooltipChange: setTooltip,
    onUnlock,
    colorFor,
    checkUnlock,
    updateNodeTransition,
    spawnParticles,
  });

  useEffect(() => {
    if (!focusNodeId) return;
    const node = layoutById.get(focusNodeId);
    if (!node) return;
    zoomTo(Math.min(2.5, Math.max(0.7, 1.4)));
    setPan({ x: -node.x, y: -node.y });
    handleSelectedChange(node);
  }, [focusNodeId, layoutById, zoomTo, handleSelectedChange]);

  useEffect(() => {
    if (layout.nodes.length === 0) return;
    const maxRadius = layout.metrics?.maxConstellationRadius ?? 0;
    const previous = lastAutoFitRadius.current;

    if (focusNodeId) {
      lastAutoFitRadius.current = maxRadius;
      return;
    }

    if (previous === null || maxRadius > previous + 1) {
      lastAutoFitRadius.current = maxRadius;
      fitToView();
    } else if (previous !== maxRadius) {
      lastAutoFitRadius.current = maxRadius;
    }
  }, [fitToView, focusNodeId, layout.metrics?.maxConstellationRadius, layout.nodes.length]);

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
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onWheel={onWheel}
      />

      {tooltip.visible && tooltip.node && (
        <div
          className={`absolute pointer-events-none z-50 max-w-sm ${
            tooltip.anchor === 'left'
              ? 'transform -translate-x-full'
              : tooltip.anchor === 'right'
              ? 'transform translate-x-0'
              : tooltip.anchor === 'top'
              ? 'transform -translate-y-full'
              : 'transform translate-y-0'
          }`}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            opacity: tooltip.fadeIn,
            transform: `scale(${0.95 + tooltip.fadeIn * 0.05}) translateZ(0)`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.4))',
          }}
        >
          <SkillTooltipContent
            node={tooltip.node}
            tree={tree}
            unlocked={unlocked}
            colorFor={colorFor}
            checkUnlock={checkUnlock}
            canAfford={canAfford}
          />
        </div>
      )}

      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-600">
        <button
          onClick={zoomIn}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors text-xs"
          title="Reset View"
        >
          ⌂
        </button>
        <button
          onClick={fitToView}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors text-xs"
          title="Fit to View"
        >
          ⊞
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded px-3 py-1 text-white text-sm border border-gray-600">
        Zoom: {Math.round(zoom * 100)}%
      </div>

      <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded px-3 py-2 text-white text-xs border border-gray-600 max-w-xs">
        <div className="font-semibold mb-1">Navigation:</div>
        <div>• Drag to pan around</div>
        <div>• Scroll wheel to zoom</div>
        <div>• Click nodes to unlock</div>
        <div>• Hover for details</div>
      </div>

      <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 border border-gray-600 rounded overflow-hidden">
        <div className="relative w-full h-full">
          {layout.nodes.map((cNode) => {
            const x = ((cNode.x + 600) / 1200) * 128;
            const y = ((cNode.y + 400) / 800) * 96;
            const isUnlocked = unlocked[cNode.node.id];

            return (
              <div
                key={cNode.node.id}
                className={`absolute w-1 h-1 rounded-full ${isUnlocked ? 'bg-blue-400' : 'bg-gray-600'}`}
                style={{ left: x, top: y }}
              />
            );
          })}

          <div
            className="absolute border border-white opacity-50"
            style={{
              left: (-pan.x / zoom + 600) / 1200 * 128 - 64 / zoom,
              top: (-pan.y / zoom + 400) / 800 * 96 - 48 / zoom,
              width: 128 / zoom,
              height: 96 / zoom,
            }}
          />
        </div>
      </div>
    </div>
  );
}
