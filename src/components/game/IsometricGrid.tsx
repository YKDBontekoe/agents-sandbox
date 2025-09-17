"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

import { useGameContext } from "./GameContext";
import type { GridTile } from "./grid/TileRenderer";
import {
  useIsometricGridSetup,
  type VisibilityUpdateOptions,
} from "./grid/useIsometricGridSetup";
import { useIsometricViewportBounds } from "./grid/useIsometricViewportBounds";

interface IsometricGridProps {
  gridSize: number;
  tileWidth: number;
  tileHeight: number;
  tileTypes?: string[][];
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
}

export default function IsometricGrid({
  gridSize,
  tileWidth = 64,
  tileHeight = 32,
  tileTypes = [],
  onTileHover,
  onTileClick,
}: IsometricGridProps) {
  const { viewport, app } = useGameContext();
  const updateVisibilityRef = useRef<((options?: VisibilityUpdateOptions) => void) | null>(null);

  const { gridContainerRef, tilesRef, overlayManagerRef } = useIsometricGridSetup({
    app,
    viewport,
    gridSize,
    tileWidth,
    tileHeight,
    tileTypes,
    onTileHover,
    onTileClick,
    requestOverlayUpdate: (options) => {
      updateVisibilityRef.current?.(options);
    },
  });

  useIsometricViewportBounds({ viewport, gridSize, tileWidth, tileHeight });

  useEffect(() => {
    if (!viewport || !gridContainerRef.current || !app?.ticker) return;

    let isUpdating = false;
    let isTickerActive = false;
    let overlayAccumulator = 0;
    let overlayAnimationTime = 0;
    let selectionPulseTime = 0;
    const overlayUpdateInterval = 120; // milliseconds between overlay redraws

    const updateVisibilityAndLOD = (options: VisibilityUpdateOptions = {}) => {
      if (!viewport || !viewport.scale || isUpdating) return;

      const { overlayUpdate = false, animationTime } = options;

      isUpdating = true;
      const scale = viewport.scale.x;
      const tiles = tilesRef.current;

      const bounds = viewport.getVisibleBounds();
      const padding = Math.max(tileWidth, tileHeight) * 2; // Add padding for smooth scrolling

      const visibleLeft = bounds.x - padding;
      const visibleRight = bounds.x + bounds.width + padding;
      const visibleTop = bounds.y - padding;
      const visibleBottom = bounds.y + bounds.height + padding;

      const frameTime = animationTime ?? overlayAnimationTime;

      tiles.forEach((tile) => {
        const isInViewport =
          tile.worldX >= visibleLeft &&
          tile.worldX <= visibleRight &&
          tile.worldY >= visibleTop &&
          tile.worldY <= visibleBottom;

        const shouldShowTile = scale > 0.15 && isInViewport;

        if (tile.sprite.visible !== shouldShowTile) {
          tile.sprite.visible = shouldShowTile;
        }

        const overlay = tile.overlay;
        if (overlay) {
          overlay.visible = shouldShowTile;
          if (overlayUpdate && shouldShowTile) {
            overlay.clear();
            if (tile.tileType === "water") {
              const wave = frameTime * 0.005 + (tile.x + tile.y);
              const r = tileHeight / 4 + Math.sin(wave) * 2;
              overlay.fill({ color: 0xffffff, alpha: 0.05 });
              overlay.drawCircle(0, 0, r);
              overlay.fill({ color: 0xffffff, alpha: 0.03 });
              overlay.drawCircle(0, 0, r * 0.6);
            } else if (tile.tileType === "forest") {
              const sway = Math.sin(frameTime * 0.006 + tile.x * 0.1) * 3;
              overlay.setStrokeStyle({ width: 1, color: 0x14532d, alpha: 0.2 });
              overlay.moveTo(-tileWidth / 4 + sway, -tileHeight / 6);
              overlay.lineTo(-tileWidth / 8 + sway, 0);
              overlay.lineTo(-tileWidth / 4 + sway, tileHeight / 6);
              overlay.stroke();
            }
          }
        }
      });

      isUpdating = false;
    };

    updateVisibilityRef.current = updateVisibilityAndLOD;

    const handleViewportChanged = () => {
      updateVisibilityAndLOD({ overlayUpdate: false });
    };

    viewport.on("zoomed", handleViewportChanged);
    viewport.on("moved", handleViewportChanged);

    const tick = (ticker: PIXI.Ticker) => {
      const deltaMS = ticker.deltaMS;
      selectionPulseTime += deltaMS;

      const sel = overlayManagerRef.current?.selectOverlay;
      if (sel && sel.visible) {
        const base = 0.35;
        const amp = 0.1;
        const w = 0.002;
        sel.alpha = base + amp * (0.5 + 0.5 * Math.sin(selectionPulseTime * w));
      }

      overlayAccumulator += deltaMS;
      if (overlayAccumulator >= overlayUpdateInterval) {
        const steps = Math.floor(overlayAccumulator / overlayUpdateInterval);
        overlayAccumulator -= steps * overlayUpdateInterval;
        overlayAnimationTime += steps * overlayUpdateInterval;
        updateVisibilityAndLOD({ overlayUpdate: true, animationTime: overlayAnimationTime });
      }
    };

    isTickerActive = true;
    app.ticker.add(tick);

    updateVisibilityAndLOD({ overlayUpdate: true, animationTime: overlayAnimationTime });

    return () => {
      if (isTickerActive && app?.ticker) {
        app.ticker.remove(tick);
        isTickerActive = false;
      }
      viewport.off("zoomed", handleViewportChanged);
      viewport.off("moved", handleViewportChanged);
      if (updateVisibilityRef.current === updateVisibilityAndLOD) {
        updateVisibilityRef.current = null;
      }
    };
  }, [viewport, app, tileWidth, tileHeight, gridContainerRef, tilesRef, overlayManagerRef]);

  return null;
}

export type { IsometricGridProps, GridTile };
export { IsometricGrid };
