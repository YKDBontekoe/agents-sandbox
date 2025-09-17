"use client";
import React from 'react';
import ConstellationCanvas from './ConstellationCanvas';
import SkillTooltipContent from './SkillTooltipContent';
import type { ConstellationSkillTreeProps } from './types';
import { useConstellationSkillTree } from './hooks/useConstellationSkillTree';

export default function ConstellationSkillTree(props: ConstellationSkillTreeProps) {
  const { tree, unlocked, onUnlock, colorFor } = props;

  const {
    layout,
    hover,
    selected,
    pan,
    zoom,
    size,
    tooltip,
    highlightNodes,
    highlightEdges,
    canAfford,
    checkUnlock,
    setHover,
    handleSelectedChange,
    setPan,
    setZoom,
    setSize,
    setTooltip,
    registerControls,
    controls,
  } = useConstellationSkillTree(props);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      <ConstellationCanvas
        tree={tree}
        unlocked={unlocked}
        layout={layout}
        pan={pan}
        zoom={zoom}
        hover={hover}
        selected={selected}
        size={size}
        tooltipState={tooltip}
        highlightNodes={highlightNodes}
        highlightEdges={highlightEdges}
        colorFor={colorFor}
        canAfford={canAfford}
        checkUnlock={checkUnlock}
        onPanChange={setPan}
        onZoomChange={setZoom}
        onHoverChange={setHover}
        onSelectedChange={handleSelectedChange}
        onTooltipChange={setTooltip}
        onUnlock={onUnlock}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onControlsChange={registerControls}
        setSize={setSize}
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
          onClick={() => controls?.zoomIn()}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => controls?.zoomOut()}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => controls?.resetZoom()}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors text-xs"
          title="Reset View"
        >
          ⌂
        </button>
        <button
          onClick={() => controls?.fitToView()}
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
