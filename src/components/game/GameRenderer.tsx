"use client";

import { useState } from "react";
import type { GameRendererProps } from "./types";
import { useGameContext } from "./GameContext";
import GameCanvas from "./GameCanvas";
import { GameProvider } from "./GameContext";
import { Viewport } from "pixi-viewport";
import * as PIXI from "pixi.js";
import MiniMap from "./MiniMap";
import logger from "@/lib/logger";
import { useKeyboardNavigation } from "./renderer/useKeyboardNavigation";
import { useEdgeScroll } from "./renderer/useEdgeScroll";
import { useContainerDimensions } from "./renderer/useContainerDimensions";

function GameRendererContent({
  width = 800,
  height = 600,
  gridSize = 20,
  tileTypes,
  onTileHover,
  onTileClick,
  enableEdgeScroll = true,
  onReset,
}: GameRendererProps) {
  logger.debug("GameRendererContent rendering with:", { width, height, gridSize });
  void tileTypes;
  const [showHelp, setShowHelp] = useState(true);
  const { app, viewport } = useGameContext();
  const { ref: containerRef, width: canvasWidth, height: canvasHeight } = useContainerDimensions({
    initialWidth: width,
    initialHeight: height,
  });

  useKeyboardNavigation({ viewport, gridSize });
  useEdgeScroll({
    containerRef,
    viewport,
    app,
    enabled: enableEdgeScroll,
  });

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900">
      <GameCanvas
        width={canvasWidth}
        height={canvasHeight}
        onTileHover={onTileHover}
        onTileClick={onTileClick}
      />

      {gridSize > 0 && <MiniMapOverlay gridSize={gridSize} />}

      {showHelp && <HelpOverlay gridSize={gridSize} onDismiss={() => setShowHelp(false)} />}

      {/* Control buttons */}
      <div className="absolute top-2 left-2 pointer-events-auto flex gap-2">
        <button
          onClick={() => {
            if (!viewport) return;
            const midY = (gridSize - 1) * (32 / 2);
            viewport.moveCenter(0, midY);
            viewport.setZoom(1.2);
          }}
          className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs border border-gray-600 shadow-sm"
        >
          Recenter
        </button>
        {onReset && (
          <button
            onClick={onReset}
            className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-gray-100 text-xs border border-red-600 shadow-sm"
            title="Reset game state (Development)"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function MiniMapOverlay({ gridSize }: { gridSize: number }) {
  return (
    <div className="absolute bottom-4 right-4 hidden sm:block pointer-events-auto">
      <div className="bg-gray-900/80 border border-gray-700 rounded-lg shadow-lg p-2">
        <MiniMap gridSize={gridSize} />
      </div>
    </div>
  );
}

function HelpOverlay({
  gridSize,
  onDismiss,
}: {
  gridSize: number;
  onDismiss: () => void;
}) {
  return (
    <div className="absolute top-2 left-2 pointer-events-none">
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-md px-3 py-2 text-[11px] sm:text-xs text-gray-200 max-w-xs pointer-events-none">
        <div className="font-semibold text-gray-100 mb-1">How to interact</div>
        <ul className="list-disc pl-4 space-y-0.5 text-gray-300">
          <li>Click tiles to select</li>
          <li>Drag to pan, scroll to zoom</li>
          <li>Open Council to take actions</li>
        </ul>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-gray-400">Grid: {gridSize}×{gridSize}</span>
          <button
            onClick={onDismiss}
            className="ml-2 px-2 py-0.5 text-[11px] rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100 pointer-events-auto"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameRenderer({ children, useExternalProvider = false, ...props }: GameRendererProps) {
  logger.debug("GameRenderer component rendering with props:", props);

  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);

  if (useExternalProvider) {
    return (
      <>
        <GameRendererContent {...props} />
        {children}
      </>
    );
  }

  return (
    <GameProvider app={app} viewport={viewport} setApp={setApp} setViewport={setViewport}>
      <GameRendererContent {...props} />
      {children}
    </GameProvider>
  );
}

export type { GameRendererProps } from "./types";
