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
  enableEdgeScroll?: boolean;
  onReset?: () => void;
}

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
  const [showHelp, setShowHelp] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: width, h: height });
  const { viewport } = useGameContext();
  const edgeScrollRef = useRef<{ vx: number; vy: number; raf: number | null }>({ vx: 0, vy: 0, raf: null });
  // Keyboard pan/zoom helpers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!viewport) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) return;
      const step = 64;
      const zoomStep = 0.1;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        viewport.moveCenter(viewport.center.x - step, viewport.center.y);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        viewport.moveCenter(viewport.center.x + step, viewport.center.y);
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        viewport.moveCenter(viewport.center.x, viewport.center.y - step);
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        viewport.moveCenter(viewport.center.x, viewport.center.y + step);
      } else if (e.key === '+' || e.key === '=' || e.key.toLowerCase() === 'e') {
        viewport.setZoom(viewport.scale.x * (1 + zoomStep));
      } else if (e.key === '-' || e.key.toLowerCase() === 'q') {
        viewport.setZoom(viewport.scale.x * (1 - zoomStep));
      } else if (e.key === '0') {
        // quick recenter
        const midY = (gridSize - 1) * (32 / 2);
        viewport.moveCenter(0, midY);
        viewport.setZoom(1.2);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewport, gridSize]);

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

  // Edge scroll: pan when cursor is near container edges
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !viewport || !enableEdgeScroll) return;
    const margin = 24; // px from edge
    const maxSpeed = 12; // pixels per frame pan speed
    const state = edgeScrollRef.current;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let vx = 0, vy = 0;
      if (x < margin) vx = -((margin - x) / margin) * maxSpeed;
      else if (x > rect.width - margin) vx = ((x - (rect.width - margin)) / margin) * maxSpeed;
      if (y < margin) vy = -((margin - y) / margin) * maxSpeed;
      else if (y > rect.height - margin) vy = ((y - (rect.height - margin)) / margin) * maxSpeed;
      state.vx = vx;
      state.vy = vy;
      if (!state.raf) animate();
    };
    const onMouseLeave = () => {
      state.vx = 0; state.vy = 0;
    };
    const animate = () => {
      if (!viewport) { state.raf = null; return; }
      const { vx, vy } = state;
      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) { state.raf = null; return; }
      viewport.moveCenter(viewport.center.x + vx, viewport.center.y + vy);
      state.raf = requestAnimationFrame(animate);
    };
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
      if (state.raf) cancelAnimationFrame(state.raf);
      state.vx = 0; state.vy = 0; state.raf = null;
    };
  }, [viewport, enableEdgeScroll]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900">
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
                onClick={() => setShowHelp(false)}
                className="ml-2 px-2 py-0.5 text-[11px] rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100 pointer-events-auto"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

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
