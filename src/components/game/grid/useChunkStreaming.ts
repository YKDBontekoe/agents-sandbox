import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import type { Viewport } from "pixi-viewport";
import logger from "@/lib/logger";
import { worldToGrid } from "@/lib/isometric";
import {
  createChunkContainer,
  disposeChunkTiles,
  type ChunkApiResponse,
  type LoadedChunk,
} from "./chunkRenderer";

interface MemoryStats {
  totalSprites: number;
  totalTextures: number;
  totalContainers: number;
}

interface RenderStats {
  chunksLoaded: number;
  chunksUnloaded: number;
  spritesCreated: number;
  spritesDestroyed: number;
}

export interface UseChunkStreamingOptions {
  app: PIXI.Application | null;
  viewport: Viewport | null;
  worldSeed: number;
  chunkSize: number;
  tileWidth: number;
  tileHeight: number;
  maxLoadedChunks: number;
}

export interface UseChunkStreamingResult {
  worldContainer: PIXI.Container | null;
  isInitialized: boolean;
  loadedChunks: Map<string, LoadedChunk>;
  memoryStats: MemoryStats;
  renderStats: RenderStats;
  getTileType: (x: number, y: number) => string;
}

export function useChunkStreaming({
  app,
  viewport,
  worldSeed,
  chunkSize,
  tileWidth,
  tileHeight,
  maxLoadedChunks,
}: UseChunkStreamingOptions): UseChunkStreamingResult {
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const loadedChunksRef = useRef<Map<string, LoadedChunk>>(new Map());
  const loadingChunksRef = useRef<Set<string>>(new Set());
  const lastViewportUpdateRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMemoryCleanupRef = useRef<number>(0);
  const memoryStatsRef = useRef<MemoryStats>({ totalSprites: 0, totalTextures: 0, totalContainers: 0 });
  const renderStatsRef = useRef<RenderStats>({ chunksLoaded: 0, chunksUnloaded: 0, spritesCreated: 0, spritesDestroyed: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  const loadChunkData = useCallback(async (chunkX: number, chunkY: number): Promise<ChunkApiResponse | null> => {
    try {
      const response = await fetch(
        `/api/map/chunk?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}&seed=${worldSeed}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to load chunk (${chunkX}, ${chunkY}): ${response.statusText}`);
      }
      const payload = (await response.json()) as ChunkApiResponse;
      return payload;
    } catch (error) {
      logger.error(`Error loading chunk (${chunkX}, ${chunkY}):`, error);
      return null;
    }
  }, [chunkSize, worldSeed]);

  const loadChunk = useCallback(async (chunkX: number, chunkY: number) => {
    const chunkKey = `${chunkX},${chunkY}`;
    const loadedChunks = loadedChunksRef.current;

    if (!app?.renderer) {
      logger.warn(`[MEMORY] Skipping load for chunk ${chunkKey} - renderer unavailable`);
      return;
    }

    if (loadedChunks.has(chunkKey) || loadingChunksRef.current.has(chunkKey)) {
      logger.debug(`[MEMORY] Skipping chunk ${chunkKey} - already loaded/loading`);
      return;
    }

    const startTime = performance.now();
    const memoryBefore = memoryStatsRef.current;
    logger.info(`[MEMORY] Starting to load chunk ${chunkKey}. Current stats: sprites=${memoryBefore.totalSprites}, containers=${memoryBefore.totalContainers}`);

    loadingChunksRef.current.add(chunkKey);

    try {
      const chunkData = await loadChunkData(chunkX, chunkY);
      if (!chunkData || !worldContainerRef.current) {
        logger.error(`[MEMORY] Failed to load chunk data for (${chunkX}, ${chunkY})`);
        return;
      }

      const { container, tiles } = createChunkContainer(chunkData, {
        renderer: app.renderer,
        tileWidth,
        tileHeight,
      });
      const { fields: _fields, ...persistable } = chunkData;
      void _fields;

      memoryStatsRef.current.totalContainers++;
      memoryStatsRef.current.totalSprites += tiles.size;
      renderStatsRef.current.chunksLoaded++;
      renderStatsRef.current.spritesCreated += tiles.size;

      worldContainerRef.current.addChild(container);

      const loadedChunk: LoadedChunk = {
        data: {
          chunkX: persistable.chunkX,
          chunkY: persistable.chunkY,
          chunkSize: persistable.chunkSize,
          tiles: persistable.tiles,
          biomes: persistable.biomes,
          features: persistable.features,
          metadata: persistable.metadata,
        },
        container,
        tiles,
        lastAccessed: Date.now(),
      };

      loadedChunks.set(chunkKey, loadedChunk);

      const loadTime = performance.now() - startTime;
      const memoryAfter = memoryStatsRef.current;
      logger.info(`[MEMORY] Loaded chunk ${chunkKey} in ${loadTime.toFixed(2)}ms. Tiles: ${tiles.size}. New stats: sprites=${memoryAfter.totalSprites}, containers=${memoryAfter.totalContainers}`);
    } catch (error) {
      logger.error(`[MEMORY] Failed to load chunk (${chunkX}, ${chunkY}):`, error);
    } finally {
      loadingChunksRef.current.delete(chunkKey);
    }
  }, [app, loadChunkData, tileHeight, tileWidth]);

  const unloadChunk = useCallback((chunkKey: string) => {
    const loadedChunks = loadedChunksRef.current;
    const chunk = loadedChunks.get(chunkKey);

    if (!chunk) {
      logger.warn(`[MEMORY] Attempted to unload non-existent chunk ${chunkKey}`);
      return;
    }

    const startTime = performance.now();
    const memoryBefore = memoryStatsRef.current;
    const tileCount = chunk.tiles.size;

    logger.info(`[MEMORY] Starting to unload chunk ${chunkKey}. Tiles to dispose: ${tileCount}. Current stats: sprites=${memoryBefore.totalSprites}, containers=${memoryBefore.totalContainers}`);

    if (worldContainerRef.current) {
      let disposedCount = 0;
      disposedCount += disposeChunkTiles(chunk);
      renderStatsRef.current.spritesDestroyed += disposedCount;

      try {
        if (chunk.container.parent) {
          worldContainerRef.current.removeChild(chunk.container);
        }
        const containerChildren = chunk.container.children.length;
        chunk.container.destroy({ children: true, texture: true });
        logger.debug(`[GRAPHICS] Destroyed chunk container ${chunkKey} with ${containerChildren} children`);
      } catch (error) {
        logger.error(`[MEMORY] Error destroying container for chunk ${chunkKey}:`, error);
      }

      memoryStatsRef.current.totalSprites -= tileCount;
      memoryStatsRef.current.totalContainers--;
      renderStatsRef.current.chunksUnloaded++;

      loadedChunks.delete(chunkKey);

      const unloadTime = performance.now() - startTime;
      const memoryAfter = memoryStatsRef.current;
      logger.info(`[MEMORY] Unloaded chunk ${chunkKey} in ${unloadTime.toFixed(2)}ms. Disposed ${disposedCount}/${tileCount} tiles. New stats: sprites=${memoryAfter.totalSprites}, containers=${memoryAfter.totalContainers}`);
    }
  }, []);

  const getVisibleChunks = useCallback(() => {
    if (!viewport) return [] as Array<{ chunkX: number; chunkY: number }>;

    const bounds = viewport.getVisibleBounds();

    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ];
    const gridCorners = corners.map((c) => worldToGrid(c.x, c.y, tileWidth, tileHeight));

    const minGridX = Math.min(...gridCorners.map((g) => g.gridX));
    const maxGridX = Math.max(...gridCorners.map((g) => g.gridX));
    const minGridY = Math.min(...gridCorners.map((g) => g.gridY));
    const maxGridY = Math.max(...gridCorners.map((g) => g.gridY));

    const minChunkX = Math.floor(minGridX / chunkSize) - 1;
    const maxChunkX = Math.floor(maxGridX / chunkSize) + 1;
    const minChunkY = Math.floor(minGridY / chunkSize) - 1;
    const maxChunkY = Math.floor(maxGridY / chunkSize) + 1;

    const visibleChunks: Array<{ chunkX: number; chunkY: number }> = [];
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
        visibleChunks.push({ chunkX, chunkY });
      }
    }

    return visibleChunks;
  }, [viewport, chunkSize, tileWidth, tileHeight]);

  const updateChunks = useCallback(async () => {
    if (!viewport || !worldContainerRef.current) return;

    const visibleChunks = getVisibleChunks();
    const loadedChunks = loadedChunksRef.current;
    const currentTime = Date.now();

    const loadPromises = visibleChunks.map(({ chunkX, chunkY }) => {
      const chunkKey = `${chunkX},${chunkY}`;
      if (loadedChunks.has(chunkKey)) {
        loadedChunks.get(chunkKey)!.lastAccessed = currentTime;
        return null;
      }
      return loadChunk(chunkX, chunkY);
    });

    await Promise.all(loadPromises.filter(Boolean));

    const visibleChunkKeys = new Set(visibleChunks.map(({ chunkX, chunkY }) => `${chunkX},${chunkY}`));
    const chunksToUnload: string[] = [];

    loadedChunks.forEach((_, chunkKey) => {
      if (!visibleChunkKeys.has(chunkKey)) {
        chunksToUnload.push(chunkKey);
      }
    });

    if (loadedChunks.size > maxLoadedChunks) {
      const sortedChunks = Array.from(loadedChunks.entries()).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      const excessCount = loadedChunks.size - maxLoadedChunks;
      for (let i = 0; i < excessCount; i++) {
        chunksToUnload.push(sortedChunks[i][0]);
      }
    }

    chunksToUnload.forEach((chunkKey) => unloadChunk(chunkKey));
  }, [viewport, getVisibleChunks, loadChunk, unloadChunk, maxLoadedChunks]);

  useEffect(() => {
    if (!viewport || worldContainerRef.current) return;

    const worldContainer = new PIXI.Container();
    worldContainer.name = "chunked-world";
    worldContainer.sortableChildren = true;
    worldContainer.zIndex = 100;
    (worldContainer as unknown as { eventMode: string }).eventMode = "static";

    viewport.addChild(worldContainer);
    worldContainerRef.current = worldContainer;

    viewport.setZoom(1.5);
    viewport.moveCenter(0, 0);

    setIsInitialized(true);

    const loadedChunks = loadedChunksRef.current;
    const loadingChunks = loadingChunksRef.current;

    memoryCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastMemoryCleanupRef.current < 30000) return;

      const CHUNK_TIMEOUT = 60000;
      const chunksToRemove: string[] = [];

      loadedChunks.forEach((chunk, chunkKey) => {
        if (now - chunk.lastAccessed > CHUNK_TIMEOUT) {
          chunksToRemove.push(chunkKey);
        }
      });

      chunksToRemove.forEach((chunkKey) => unloadChunk(chunkKey));

      lastMemoryCleanupRef.current = now;
      if (chunksToRemove.length > 0) {
        logger.debug(`Memory cleanup completed. Removed ${chunksToRemove.length} old chunks.`);
      }
    }, 30000);

    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
        memoryCheckIntervalRef.current = null;
      }

      if (worldContainer.parent) {
        worldContainer.parent.removeChild(worldContainer);
      }
      worldContainer.destroy({ children: true });
      worldContainerRef.current = null;

      loadedChunks.forEach((chunk, chunkKey) => {
        disposeChunkTiles(chunk);
        try {
          chunk.container.destroy({ children: true, texture: true });
        } catch (error) {
          logger.error(`[MEMORY] Error destroying container during cleanup for chunk ${chunkKey}:`, error);
        }
      });
      loadedChunks.clear();
      loadingChunks.clear();
    };
  }, [viewport, unloadChunk]);

  useEffect(() => {
    if (!viewport || !isInitialized) return;

    let updateTimeout: NodeJS.Timeout | undefined;
    let isUpdating = false;

    const handleViewportChange = () => {
      if (isUpdating) return;

      const center = viewport.center;
      const scale = viewport.scale?.x ?? 1;
      const lastUpdate = lastViewportUpdateRef.current;

      const moved = Math.abs(center.x - lastUpdate.x) > tileWidth * 3 ||
        Math.abs(center.y - lastUpdate.y) > tileHeight * 3;
      const scaleChanged = Math.abs(scale - lastUpdate.scale) > 0.3;

      if (moved || scaleChanged) {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(async () => {
          isUpdating = true;
          try {
            await updateChunks();
            lastViewportUpdateRef.current = { x: center.x, y: center.y, scale };
          } finally {
            isUpdating = false;
          }
        }, 300);
      }
    };

    viewport.on("moved", handleViewportChange);
    viewport.on("zoomed", handleViewportChange);

    updateChunks();

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      viewport.off("moved", handleViewportChange);
      viewport.off("zoomed", handleViewportChange);
    };
  }, [viewport, isInitialized, tileWidth, tileHeight, updateChunks]);

  const getTileType = useCallback((x: number, y: number) => {
    const chunkX = Math.floor(x / chunkSize);
    const chunkY = Math.floor(y / chunkSize);
    const chunkKey = `${chunkX},${chunkY}`;
    const chunk = loadedChunksRef.current.get(chunkKey);
    if (!chunk) {
      return "grass";
    }
    const localX = x - chunkX * chunkSize;
    const localY = y - chunkY * chunkSize;
    return chunk.data.tiles[localY]?.[localX] ?? "grass";
  }, [chunkSize]);

  return useMemo(() => ({
    worldContainer: worldContainerRef.current,
    isInitialized,
    loadedChunks: loadedChunksRef.current,
    memoryStats: memoryStatsRef.current,
    renderStats: renderStatsRef.current,
    getTileType,
  }), [isInitialized, getTileType]);
}
