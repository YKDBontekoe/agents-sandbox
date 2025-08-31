"use client";

import { useState } from "react";
import GameCanvas from "./GameCanvas";
import { IsometricGrid } from "./IsometricGrid";
import { GameProvider } from "./GameContext";
import { Viewport } from "pixi-viewport";
import * as PIXI from "pixi.js";

interface GameRendererProps {
  width?: number;
  height?: number;
  gridSize?: number;
  onTileHover?: (x: number, y: number) => void;
  onTileClick?: (x: number, y: number) => void;
  children?: React.ReactNode;
}

function GameRendererContent({
  width = 800,
  height = 600,
  gridSize = 20,
  onTileHover,
  onTileClick,
}: GameRendererProps) {
  return (
    <div className="relative">
      <GameCanvas
        width={width}
        height={height}
        onTileHover={onTileHover}
        onTileClick={onTileClick}
      />
      
      <IsometricGrid
        gridSize={gridSize}
        tileWidth={64}
        tileHeight={32}
        onTileHover={onTileHover}
        onTileClick={onTileClick}
      />
      
      <div className="absolute top-2 left-2 bg-slate-900 bg-opacity-75 rounded px-2 py-1 text-xs text-slate-300">
        Grid: {gridSize}x{gridSize} | Zoom to interact
      </div>
    </div>
  );
}

export default function GameRenderer({ children, ...props }: GameRendererProps) {
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);

  return (
    <GameProvider
      app={app}
      viewport={viewport}
      setApp={setApp}
      setViewport={setViewport}
    >
      <GameRendererContent {...props} />
      {children}
    </GameProvider>
  );
}

export type { GameRendererProps };