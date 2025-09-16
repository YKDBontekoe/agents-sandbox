"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Viewport } from "pixi-viewport";
import { useGameContext } from "./GameContext";
import { worldToGrid } from "@/lib/isometric";
import { createChunkRenderer, type ChunkRenderer } from "./chunks/ChunkRenderer";
import { useChunkStreaming } from "./chunks/useChunkStreaming";
import { createChunkTelemetry } from "./chunks/chunkTelemetry";
import { getChunkKey } from "@engine/chunks";

interface ChunkedIsometricGridProps {
  worldSeed?: number;
  chunkSize?: number;
  tileWidth?: number;
  tileHeight?: number;
  maxLoadedChunks?: number;
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
}

function collectVisibleChunks(
  viewport: Viewport,
  chunkSize: number,
  tileWidth: number,
  tileHeight: number,
) {
  const bounds = viewport.getVisibleBounds();
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ];

  const gridCorners = corners.map((corner) => worldToGrid(corner.x, corner.y, tileWidth, tileHeight));
  const minGridX = Math.min(...gridCorners.map((grid) => grid.gridX));
  const maxGridX = Math.max(...gridCorners.map((grid) => grid.gridX));
  const minGridY = Math.min(...gridCorners.map((grid) => grid.gridY));
  const maxGridY = Math.max(...gridCorners.map((grid) => grid.gridY));

  const minChunkX = Math.floor(minGridX / chunkSize) - 1;
  const maxChunkX = Math.floor(maxGridX / chunkSize) + 1;
  const minChunkY = Math.floor(minGridY / chunkSize) - 1;
  const maxChunkY = Math.floor(maxGridY / chunkSize) + 1;

  const visible = [] as Array<{ chunkX: number; chunkY: number; key: string }>;

  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      const key = getChunkKey(chunkX, chunkY);
      visible.push({ chunkX, chunkY, key });
    }
  }

  return visible;
}

function ChunkedIsometricGrid({
  worldSeed = 12345,
  chunkSize = 32,
  tileWidth = 64,
  tileHeight = 32,
  maxLoadedChunks = 6,
  onTileHover,
  onTileClick,
}: ChunkedIsometricGridProps) {
  const { viewport, app } = useGameContext();
  const telemetry = useMemo(() => createChunkTelemetry({ cleanupIntervalMs: 30_000, chunkTimeoutMs: 60_000 }), []);
  const rendererRef = useRef<ChunkRenderer | null>(null);
  const onTileHoverRef = useRef(onTileHover);
  const onTileClickRef = useRef(onTileClick);

  useEffect(() => {
    onTileHoverRef.current = onTileHover;
  }, [onTileHover]);

  useEffect(() => {
    onTileClickRef.current = onTileClick;
  }, [onTileClick]);

  useEffect(() => () => telemetry.dispose(), [telemetry]);

  const handleTileHover = useCallback((x: number, y: number, tileType?: string) => {
    onTileHoverRef.current?.(x, y, tileType);
  }, []);

  const handleTileClick = useCallback((x: number, y: number, tileType?: string) => {
    onTileClickRef.current?.(x, y, tileType);
  }, []);

  const onChunkEvicted = useCallback((chunkKey: string) => {
    rendererRef.current?.destroyChunk(chunkKey);
  }, []);

  const { ensureChunkLoaded, releaseChunk, chunkCache } = useChunkStreaming({
    worldSeed,
    chunkSize,
    maxLoadedChunks,
    telemetry,
    onChunkEvicted,
  });

  const updateVisibleChunks = useCallback(async () => {
    if (!viewport) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const visible = collectVisibleChunks(viewport, chunkSize, tileWidth, tileHeight);
    const visibleKeys = new Set(visible.map((chunk) => chunk.key));

    await Promise.all(
      visible.map(async ({ chunkX, chunkY, key }) => {
        const result = await ensureChunkLoaded(chunkX, chunkY);
        if (rendererRef.current !== renderer) return;
        if (result.renderPayload && !renderer.hasChunk(key)) {
          renderer.renderChunk(key, result.renderPayload);
        }
      }),
    );

    renderer.getRenderedChunkKeys().forEach((key) => {
      if (!visibleKeys.has(key)) {
        renderer.destroyChunk(key);
        releaseChunk(key);
      }
    });

    renderer.updateVisibility(viewport, true);
  }, [viewport, chunkSize, tileWidth, tileHeight, ensureChunkLoaded, releaseChunk]);

  useEffect(() => {
    if (!viewport || !app?.renderer) {
      return;
    }

    const renderer = createChunkRenderer({
      viewport,
      renderer: app.renderer,
      ticker: app.ticker ?? null,
      chunkSize,
      tileWidth,
      tileHeight,
      chunkCache,
      onTileHover: handleTileHover,
      onTileClick: handleTileClick,
      telemetry,
    });

    rendererRef.current = renderer;
    void updateVisibleChunks();

    return () => {
      const keys = renderer.getRenderedChunkKeys();
      keys.forEach((key) => releaseChunk(key));
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [
    app,
    viewport,
    chunkSize,
    tileWidth,
    tileHeight,
    chunkCache,
    handleTileHover,
    handleTileClick,
    telemetry,
    updateVisibleChunks,
    releaseChunk,
  ]);

  useEffect(() => {
    if (!viewport) return;

    let updateTimeout: ReturnType<typeof setTimeout> | null = null;
    let isUpdating = false;

    const scheduleUpdate = () => {
      if (isUpdating) return;
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(async () => {
        isUpdating = true;
        try {
          await updateVisibleChunks();
        } finally {
          isUpdating = false;
        }
      }, 250);
    };

    viewport.on("moved", scheduleUpdate);
    viewport.on("zoomed", scheduleUpdate);

    void updateVisibleChunks();

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      viewport.off("moved", scheduleUpdate);
      viewport.off("zoomed", scheduleUpdate);
    };
  }, [viewport, updateVisibleChunks]);

  return null;
}

export default ChunkedIsometricGrid;
export type { ChunkedIsometricGridProps };
export { ChunkedIsometricGrid };

