"use client";

import { useEffect, useRef, useState } from "react";
import { useGameContext } from "./GameContext";
import GameCanvas from "./GameCanvas";
import { IsometricGrid } from "./IsometricGrid";
import { GameProvider } from "./GameContext";
import { Viewport } from "pixi-viewport";
import * as PIXI from "pixi.js";
import MiniMap from "./MiniMap";
import logger from "@/lib/logger";

interface GameRendererProps {
  width?: number;
  height?: number;
  gridSize?: number;
  tileTypes?: string[][];
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
  children?: React.ReactNode;
  useExternalProvider?: boolean;
}

function GameRendererContent({
  width = 800,
  height = 600,
  gridSize = 20,
  tileTypes,
  onTileHover,
  onTileClick,
}: GameRendererProps) {
  logger.debug("GameRendererContent rendering with:", { width, height, gridSize });
  const [showHelp, setShowHelp] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: width, h: height });
  const { viewport } = useGameContext();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      setDims({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <GameCanvas
        width={dims.w}
        height={dims.h}
        onTileHover={onTileHover}
        onTileClick={onTileClick}
      />

      <IsometricGrid
        gridSize={gridSize}
        tileWidth={64}
        tileHeight={32}
        tileTypes={tileTypes}
        onTileHover={onTileHover}
        onTileClick={onTileClick}
      />
      
      {showHelp && (
        <div className="absolute top-2 left-2 pointer-events-none">
          <div className="bg-panel backdrop-blur-sm border border-border rounded-lg shadow-md px-3 py-2 text-[11px] sm:text-xs text-foreground max-w-xs pointer-events-none">
            <div className="font-semibold text-foreground mb-1">How to interact</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Click tiles to select</li>
              <li>Drag to pan, scroll to zoom</li>
              <li>Open Council to take actions</li>
            </ul>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted">Grid: {gridSize}×{gridSize}</span>
              <button
                onClick={() => setShowHelp(false)}
                className="ml-2 px-2 py-0.5 text-[11px] rounded-md bg-panel hover:bg-muted text-foreground pointer-events-auto"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recenter button */}
      <div className="absolute top-2 left-2 pointer-events-auto">
        <button
          onClick={() => {
            if (!viewport) return;
            const midY = (gridSize - 1) * (32 / 2);
            viewport.moveCenter(0, midY);
            viewport.setZoom(1.2);
          }}
          className="px-2 py-1 rounded bg-panel hover:bg-muted text-foreground text-xs border border-border shadow-sm"
        >
          Recenter
        </button>
      </div>
    </div>
  );
}

export default function GameRenderer({ children, useExternalProvider = false, ...props }: GameRendererProps) {
  logger.debug("GameRenderer component rendering with props:", props);
  
  if (useExternalProvider) {
    return (
      <>
        <GameRendererContent {...props} />
        {children}
      </>
    );
  }

  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);

  return (
    <GameProvider app={app} viewport={viewport} setApp={setApp} setViewport={setViewport}>
      <GameRendererContent {...props} />
      {children}
    </GameProvider>
  );
}

export type { GameRendererProps };
