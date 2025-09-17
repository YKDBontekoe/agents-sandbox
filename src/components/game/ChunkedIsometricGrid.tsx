"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGameContext } from "./GameContext";
import { TileOverlay } from "./grid/TileOverlay";
import { useChunkStreaming } from "./grid/useChunkStreaming";

interface ChunkedIsometricGridProps {
  worldSeed?: number;
  chunkSize?: number;
  tileWidth?: number;
  tileHeight?: number;
  maxLoadedChunks?: number;
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
}

export default function ChunkedIsometricGrid({
  worldSeed = 12345,
  chunkSize = 32,
  tileWidth = 64,
  tileHeight = 32,
  maxLoadedChunks = 6,
  onTileHover,
  onTileClick,
}: ChunkedIsometricGridProps) {
  const { viewport, app } = useGameContext();
  const overlayManagerRef = useRef<TileOverlay | null>(null);
  const onTileHoverRef = useRef(onTileHover);
  const onTileClickRef = useRef(onTileClick);

  useEffect(() => {
    onTileHoverRef.current = onTileHover;
  }, [onTileHover]);

  useEffect(() => {
    onTileClickRef.current = onTileClick;
  }, [onTileClick]);

  const handleTileHover = useCallback((x: number, y: number, tileType?: string) => {
    onTileHoverRef.current?.(x, y, tileType);
  }, []);

  const handleTileClick = useCallback((x: number, y: number, tileType?: string) => {
    onTileClickRef.current?.(x, y, tileType);
  }, []);

  const { worldContainer, loadedChunks, getTileType } = useChunkStreaming({
    app,
    viewport,
    worldSeed,
    chunkSize,
    tileWidth,
    tileHeight,
    maxLoadedChunks,
  });

  useEffect(() => {
    if (!worldContainer) return;

    const overlay = new TileOverlay(worldContainer, {
      tileWidth,
      tileHeight,
      getTileType,
      onTileHover: handleTileHover,
      onTileClick: handleTileClick,
    });

    overlayManagerRef.current = overlay;

    return () => {
      overlayManagerRef.current?.destroy();
      overlayManagerRef.current = null;
    };
  }, [worldContainer, tileWidth, tileHeight, getTileType, handleTileHover, handleTileClick]);

  useEffect(() => {
    if (!viewport || !worldContainer || !app?.ticker) return;

    let lastScale = viewport.scale?.x || 1;
    let lastUpdateTime = 0;
    let t = 0;

    const updateVisibilityAndLOD = (force = false) => {
      const now = Date.now();
      if (!force && now - lastUpdateTime < 200) return;

      if (!viewport || !viewport.scale) return;

      const scale = viewport.scale.x;
      const bounds = viewport.getVisibleBounds();
      const padding = Math.max(tileWidth, tileHeight) * 4;

      const visibleLeft = bounds.x - padding;
      const visibleRight = bounds.x + bounds.width + padding;
      const visibleTop = bounds.y - padding;
      const visibleBottom = bounds.y + bounds.height + padding;

      const scaleChanged = Math.abs(scale - lastScale) > 0.3;

      loadedChunks.forEach((chunk) => {
        chunk.tiles.forEach((tile) => {
          const isInViewport =
            tile.worldX >= visibleLeft &&
            tile.worldX <= visibleRight &&
            tile.worldY >= visibleTop &&
            tile.worldY <= visibleBottom;

          const shouldShowTile = scale > 0.1 && isInViewport;

          if (tile.sprite.visible !== shouldShowTile) {
            tile.sprite.visible = shouldShowTile;
          }

          const overlay = tile.overlay;
          if (overlay?.destroyed) {
            tile.overlay = undefined;
            return;
          }

          if (overlay) {
            if (overlay.visible !== shouldShowTile) {
              overlay.visible = shouldShowTile;
              if (!shouldShowTile) {
                overlay.clear();
              }
            }

            if (shouldShowTile) {
              const { x: overlayX, y: overlayY } = overlay.position;
              if (overlayX !== tile.worldX || overlayY !== tile.worldY) {
                overlay.position.set(tile.worldX, tile.worldY);
              }
            }
          }
        });
      });

      if (scaleChanged) {
        lastScale = scale;
      }
      lastUpdateTime = now;
    };

    const tick = () => {
      t += app.ticker.deltaMS;

      const sel = overlayManagerRef.current?.selectOverlay;
      if (sel && sel.visible) {
        const base = 0.35;
        const amp = 0.1;
        const w = 0.002;
        sel.alpha = base + amp * (0.5 + 0.5 * Math.sin(t * w));
      }

      if (t % 100 < app.ticker.deltaMS) {
        updateVisibilityAndLOD();
      }
    };

    updateVisibilityAndLOD(true);

    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
    };
  }, [viewport, app, tileWidth, tileHeight, worldContainer, loadedChunks]);

  return null;
}

export type { ChunkedIsometricGridProps };
export { ChunkedIsometricGrid };
