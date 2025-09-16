"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";
import { worldToGrid } from "@/lib/isometric";
import { createTileSprite, type GridTile } from "./grid/TileRenderer";
import { TileOverlay } from "./grid/TileOverlay";

interface ChunkData {
  chunk: string[][];
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  biome: string;
  metadata: {
    hasVillage: boolean;
    hasRuins: boolean;
    hasSpecialResources: boolean;
    waterCoverage: number;
    forestCoverage: number;
  };
}

interface LoadedChunk {
  data: ChunkData;
  container: PIXI.Container;
  tiles: Map<string, GridTile>;
  lastAccessed: number;
}

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
  maxLoadedChunks = 6, // Reduced from 9 to 6 to prevent memory issues
  onTileHover,
  onTileClick,
}: ChunkedIsometricGridProps) {
  const { viewport, app } = useGameContext();
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const loadedChunksRef = useRef<Map<string, LoadedChunk>>(new Map());
  const overlayManagerRef = useRef<TileOverlay | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const loadingChunksRef = useRef<Set<string>>(new Set());
  const lastViewportUpdateRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMemoryCleanupRef = useRef<number>(0);
  const memoryStatsRef = useRef({ totalSprites: 0, totalTextures: 0, totalContainers: 0 });
  const renderStatsRef = useRef({ chunksLoaded: 0, chunksUnloaded: 0, spritesCreated: 0, spritesDestroyed: 0 });
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

  // Convert world coordinates to chunk coordinates (via inverse isometric transform)
  const worldToChunk = useCallback((worldX: number, worldY: number) => {
    const gridCoords = worldToGrid(worldX, worldY, tileWidth, tileHeight);
    const chunkX = Math.floor(gridCoords.gridX / chunkSize);
    const chunkY = Math.floor(gridCoords.gridY / chunkSize);
    return { chunkX, chunkY };
  }, [chunkSize, tileWidth, tileHeight]);

  // Load chunk data from API
  const loadChunkData = useCallback(async (chunkX: number, chunkY: number): Promise<ChunkData | null> => {
    try {
      const response = await fetch(
        `/api/map/chunk?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}&seed=${worldSeed}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load chunk (${chunkX}, ${chunkY}): ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      logger.error(`Error loading chunk (${chunkX}, ${chunkY}):`, error);
      return null;
    }
  }, [chunkSize, worldSeed]);

  // Create visual representation of a chunk
  const createChunkContainer = useCallback((chunkData: ChunkData): { container: PIXI.Container; tiles: Map<string, GridTile> } => {
    const container = new PIXI.Container();
    container.name = `chunk-${chunkData.chunkX}-${chunkData.chunkY}`;
    container.sortableChildren = true;

    const tiles = new Map<string, GridTile>();

    if (!app?.renderer) {
      logger.warn(`[GRAPHICS] Renderer unavailable while creating chunk ${chunkData.chunkX},${chunkData.chunkY}`);
      return { container, tiles };
    }

    // Create tiles for this chunk
    for (let localY = 0; localY < chunkData.chunkSize; localY++) {
      for (let localX = 0; localX < chunkData.chunkSize; localX++) {
        const globalX = chunkData.chunkX * chunkData.chunkSize + localX;
        const globalY = chunkData.chunkY * chunkData.chunkSize + localY;
        const tileType = chunkData.chunk[localY]?.[localX] || 'grass';

        // Create tile sprite with global coordinates
        const tile = createTileSprite(
          globalX,
          globalY,
          container,
          tileWidth,
          tileHeight,
          [[tileType]],
          app.renderer,
        );
        tile.tileType = tileType;

        const key = `${globalX},${globalY}`;
        tiles.set(key, tile);
        container.addChild(tile.sprite);
      }
    }
    
    return { container, tiles };
  }, [app, tileWidth, tileHeight]);

  // Load and render a chunk
  const loadChunk = useCallback(async (chunkX: number, chunkY: number) => {
    const chunkKey = `${chunkX},${chunkY}`;
    const loadedChunks = loadedChunksRef.current;

    if (!app?.renderer) {
      logger.warn(`[MEMORY] Skipping load for chunk ${chunkKey} - renderer unavailable`);
      return;
    }

    // Skip if already loaded or loading
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
      
      const { container, tiles } = createChunkContainer(chunkData);
      
      // Update memory stats
      memoryStatsRef.current.totalContainers++;
      memoryStatsRef.current.totalSprites += tiles.size;
      renderStatsRef.current.chunksLoaded++;
      renderStatsRef.current.spritesCreated += tiles.size;
      logger.debug(`🔍 [MEMORY TRACKING] Chunk ${chunkKey} loaded - Total sprites: ${memoryStatsRef.current.totalSprites}, Containers: ${memoryStatsRef.current.totalContainers}`);
      logger.debug(`🎮 [RENDER TRACKING] Chunks loaded: ${renderStatsRef.current.chunksLoaded}, Sprites created: ${renderStatsRef.current.spritesCreated}`);
      
      worldContainerRef.current.addChild(container);
      logger.debug(`[GRAPHICS] Added chunk container ${chunkKey} to world container. World children: ${worldContainerRef.current.children.length}`);
      
      const loadedChunk: LoadedChunk = {
        data: chunkData,
        container,
        tiles,
        lastAccessed: Date.now(),
      };
      
      loadedChunks.set(chunkKey, loadedChunk);
      
      const loadTime = performance.now() - startTime;
      const memoryAfter = memoryStatsRef.current;
      logger.info(`[MEMORY] Loaded chunk ${chunkKey} in ${loadTime.toFixed(2)}ms. Tiles: ${tiles.size}. New stats: sprites=${memoryAfter.totalSprites}, containers=${memoryAfter.totalContainers}`);
      
      // Log detailed tile information
      logger.debug(`[GRAPHICS] Chunk ${chunkKey} tiles breakdown:`, Array.from(tiles.entries()).map(([key, tile]) => ({
        position: key,
        spriteExists: !!tile.sprite,
        spriteParent: tile.sprite?.parent?.constructor.name,
        spriteDestroyed: tile.sprite?.destroyed
      })));
      
    } catch (error) {
      logger.error(`[MEMORY] Failed to load chunk (${chunkX}, ${chunkY}):`, error);
    } finally {
      loadingChunksRef.current.delete(chunkKey);
    }
  }, [app, loadChunkData, createChunkContainer]);

  // Unload a chunk to free memory
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
      // Log each tile disposal
      let disposedCount = 0;
      chunk.tiles.forEach((tile, tileKey) => {
        try {
          logger.debug(`[GRAPHICS] Disposing tile ${tileKey} in chunk ${chunkKey}. Sprite destroyed: ${tile.sprite?.destroyed}`);
          tile.dispose();
          disposedCount++;
          renderStatsRef.current.spritesDestroyed++;
        } catch (error) {
          logger.error(`[MEMORY] Error disposing tile ${tileKey}:`, error);
        }
      });
      
      // Remove and destroy container
      try {
        if (chunk.container.parent) {
          worldContainerRef.current.removeChild(chunk.container);
          logger.debug(`[GRAPHICS] Removed chunk container ${chunkKey} from world container. Remaining children: ${worldContainerRef.current.children.length}`);
        }
        
        const containerChildren = chunk.container.children.length;
        chunk.container.destroy({ children: true, texture: true });
        logger.debug(`[GRAPHICS] Destroyed chunk container ${chunkKey} with ${containerChildren} children`);
        
      } catch (error) {
        logger.error(`[MEMORY] Error destroying container for chunk ${chunkKey}:`, error);
      }
      
      // Update memory stats
      memoryStatsRef.current.totalSprites -= tileCount;
      memoryStatsRef.current.totalContainers--;
      renderStatsRef.current.chunksUnloaded++;
      
      chunk.tiles.clear();
      loadedChunks.delete(chunkKey);
      
      const unloadTime = performance.now() - startTime;
      const memoryAfter = memoryStatsRef.current;
      logger.info(`[MEMORY] Unloaded chunk ${chunkKey} in ${unloadTime.toFixed(2)}ms. Disposed ${disposedCount}/${tileCount} tiles. New stats: sprites=${memoryAfter.totalSprites}, containers=${memoryAfter.totalContainers}`);
      logger.debug(`🧹 [MEMORY CLEANUP] Chunk ${chunkKey} unloaded - Disposed ${disposedCount} sprites, Remaining: ${memoryAfter.totalSprites}`);
      
      // Log render stats summary
      const renderStats = renderStatsRef.current;
      logger.debug(`[RENDER_STATS] Total - Loaded: ${renderStats.chunksLoaded}, Unloaded: ${renderStats.chunksUnloaded}, Sprites Created: ${renderStats.spritesCreated}, Sprites Destroyed: ${renderStats.spritesDestroyed}`);
      logger.debug(`🗑️ [RENDER CLEANUP] Chunks unloaded: ${renderStats.chunksUnloaded}, Sprites destroyed: ${renderStats.spritesDestroyed}`);
    }
  }, []);



  // Get chunks that should be visible based on viewport (compute in grid space)
  const getVisibleChunks = useCallback(() => {
    if (!viewport) return [];
    
    const bounds = viewport.getVisibleBounds();

    // Project viewport world-space corners back to grid indices
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

    // Add a one-chunk padding in all directions
    const minChunkX = Math.floor(minGridX / chunkSize) - 1;
    const maxChunkX = Math.floor(maxGridX / chunkSize) + 1;
    const minChunkY = Math.floor(minGridY / chunkSize) - 1;
    const maxChunkY = Math.floor(maxGridY / chunkSize) + 1;
    
    const visibleChunks: { chunkX: number; chunkY: number }[] = [];
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
        visibleChunks.push({ chunkX, chunkY });
      }
    }
    
    return visibleChunks;
  }, [viewport, chunkSize, tileWidth, tileHeight]);

  // Manage chunk loading/unloading based on viewport
  const updateChunks = useCallback(async () => {
    if (!viewport || !worldContainerRef.current) return;
    
    const visibleChunks = getVisibleChunks();
    const loadedChunks = loadedChunksRef.current;
    const currentTime = Date.now();
    
    // Load visible chunks
    const loadPromises = visibleChunks.map(({ chunkX, chunkY }) => {
      const chunkKey = `${chunkX},${chunkY}`;
      if (loadedChunks.has(chunkKey)) {
        // Update access time
        loadedChunks.get(chunkKey)!.lastAccessed = currentTime;
      } else {
        // Load new chunk
        return loadChunk(chunkX, chunkY);
      }
    });
    
    await Promise.all(loadPromises.filter(Boolean));
    
    // Unload chunks that are too far away or exceed max limit
    const visibleChunkKeys = new Set(visibleChunks.map(({ chunkX, chunkY }) => `${chunkX},${chunkY}`));
    const chunksToUnload: string[] = [];
    
    loadedChunks.forEach((chunk, chunkKey) => {
      if (!visibleChunkKeys.has(chunkKey)) {
        chunksToUnload.push(chunkKey);
      }
    });
    
    // If we have too many chunks, unload the least recently accessed ones
    if (loadedChunks.size > maxLoadedChunks) {
      const sortedChunks = Array.from(loadedChunks.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const excessCount = loadedChunks.size - maxLoadedChunks;
      for (let i = 0; i < excessCount; i++) {
        chunksToUnload.push(sortedChunks[i][0]);
      }
    }
    
    // Unload chunks
    chunksToUnload.forEach(chunkKey => unloadChunk(chunkKey));
    
  }, [viewport, getVisibleChunks, loadChunk, unloadChunk, maxLoadedChunks]);

  // Initialize world container
  useEffect(() => {
    if (!viewport || worldContainerRef.current) return;

    const worldContainer = new PIXI.Container();
    worldContainer.name = 'chunked-world';
    worldContainer.sortableChildren = true;
    worldContainer.zIndex = 100;
    (worldContainer as unknown as { eventMode: string }).eventMode = 'static';
    
    viewport.addChild(worldContainer);
    worldContainerRef.current = worldContainer;
    
    // Initialize overlay manager
    overlayManagerRef.current = new TileOverlay(worldContainer, {
      tileWidth,
      tileHeight,
      getTileType: (x, y) => {
        // Find the chunk containing this tile
        const chunkX = Math.floor(x / chunkSize);
        const chunkY = Math.floor(y / chunkSize);
        const chunkKey = `${chunkX},${chunkY}`;
        const chunk = loadedChunksRef.current.get(chunkKey);
        
        if (chunk) {
          const localX = x - chunkX * chunkSize;
          const localY = y - chunkY * chunkSize;
          return chunk.data.chunk[localY]?.[localX] || 'grass';
        }
        return 'grass';
      },
      onTileHover: handleTileHover,
      onTileClick: handleTileClick,
    });
    
    // Set initial viewport position and zoom
    viewport.setZoom(1.5);
    viewport.moveCenter(0, 0);
    
    setIsInitialized(true);
    
    // Start memory monitoring with inline cleanup
    memoryCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastMemoryCleanupRef.current < 30000) return;
      
      const loadedChunks = loadedChunksRef.current;
      const CHUNK_TIMEOUT = 60000; // 1 minute
      
      const chunksToRemove: string[] = [];
      loadedChunks.forEach((chunk, chunkKey) => {
        if (now - chunk.lastAccessed > CHUNK_TIMEOUT) {
          chunksToRemove.push(chunkKey);
        }
      });
      
      chunksToRemove.forEach(chunkKey => {
        const chunk = loadedChunks.get(chunkKey);
        if (chunk && worldContainerRef.current) {
          chunk.tiles.forEach((tile) => {
            tile.dispose();
          });
          worldContainerRef.current.removeChild(chunk.container);
          chunk.container.destroy({ children: true, texture: true });
          chunk.tiles.clear();
          loadedChunks.delete(chunkKey);
        }
      });
      
      lastMemoryCleanupRef.current = now;
      if (chunksToRemove.length > 0) {
        logger.debug(`Memory cleanup completed. Removed ${chunksToRemove.length} old chunks.`);
      }
    }, 30000); // Every 30 seconds
    
    return () => {
      // Clear memory monitoring interval
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
        memoryCheckIntervalRef.current = null;
      }
      overlayManagerRef.current?.destroy();
      overlayManagerRef.current = null;
      
      if (worldContainer.parent) {
        worldContainer.parent.removeChild(worldContainer);
      }
      worldContainer.destroy({ children: true });
      worldContainerRef.current = null;
      
      // Properly dispose of all loaded chunks
      loadedChunksRef.current.forEach((chunk, chunkKey) => {
        chunk.tiles.forEach((tile) => {
          tile.dispose(); // Use the proper dispose method from GridTile
        });
        chunk.container.destroy({ children: true, texture: true });
        chunk.tiles.clear();
      });
      loadedChunksRef.current.clear();
      loadingChunksRef.current.clear();

      // NOTE: Do not set state in cleanup to avoid triggering re-renders during effect teardown
      // setIsInitialized(false);
    };
  }, [viewport, tileWidth, tileHeight, chunkSize, handleTileHover, handleTileClick]);

  // Handle viewport changes with throttling
  useEffect(() => {
    if (!viewport || !isInitialized) return;
    
    let updateTimeout: NodeJS.Timeout;
    let isUpdating = false;
    
    const handleViewportChange = () => {
      if (isUpdating) return; // Prevent concurrent updates
      
      const center = viewport.center;
      const scale = viewport.scale?.x || 1;
      const lastUpdate = lastViewportUpdateRef.current;
      
      // Only update if viewport moved significantly or scale changed (increased thresholds to reduce flickering)
      const moved = Math.abs(center.x - lastUpdate.x) > tileWidth * 3 || 
                   Math.abs(center.y - lastUpdate.y) > tileHeight * 3;
      const scaleChanged = Math.abs(scale - lastUpdate.scale) > 0.3; // Less sensitive
      
      // Increased minimum update interval to reduce flickering
      if (moved || scaleChanged) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
          isUpdating = true;
          try {
            await updateChunks();
            lastViewportUpdateRef.current = { x: center.x, y: center.y, scale };
          } finally {
            isUpdating = false;
          }
        }, 300); // Increased throttle time further
      }
    };
    
    viewport.on('moved', handleViewportChange);
    viewport.on('zoomed', handleViewportChange);
    
    // Initial chunk loading
    updateChunks();
    
    return () => {
      clearTimeout(updateTimeout);
      viewport.off('moved', handleViewportChange);
      viewport.off('zoomed', handleViewportChange);
    };
    // Only depend on primitives; updateChunks is stable via useCallback and viewport is stable from context
  }, [viewport, isInitialized, tileWidth, tileHeight]);

  // Performance optimization: Viewport culling and LOD
  useEffect(() => {
    if (!viewport || !worldContainerRef.current || !app?.ticker) return;
    
    let lastScale = viewport.scale?.x || 1;
    let lastUpdateTime = 0;
    let t = 0;
    
    const updateVisibilityAndLOD = (force = false) => {
      const now = Date.now();
      if (!force && now - lastUpdateTime < 200) return; // Throttle to 5fps to reduce flickering
      
      if (!viewport || !viewport.scale) return;
      
      const scale = viewport.scale.x;
      const bounds = viewport.getVisibleBounds();
      const padding = Math.max(tileWidth, tileHeight) * 4; // Increased padding for stability
      
      const visibleLeft = bounds.x - padding;
      const visibleRight = bounds.x + bounds.width + padding;
      const visibleTop = bounds.y - padding;
      const visibleBottom = bounds.y + bounds.height + padding;
      
      const scaleChanged = Math.abs(scale - lastScale) > 0.3; // Less sensitive to prevent flickering
      
      // Update visibility for all loaded chunks (less frequently)
      loadedChunksRef.current.forEach((chunk) => {
        chunk.tiles.forEach((tile) => {
          const isInViewport = tile.worldX >= visibleLeft && 
                             tile.worldX <= visibleRight && 
                             tile.worldY >= visibleTop && 
                             tile.worldY <= visibleBottom;
          
          const shouldShowTile = scale > 0.1 && isInViewport; // Lower threshold for better visibility
          
          // Only update visibility if there's a significant change to prevent flickering
          if (tile.sprite.visible !== shouldShowTile) {
            tile.sprite.visible = shouldShowTile;
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
      
      // Update selection overlay animation only
      const sel = overlayManagerRef.current?.selectOverlay;
      if (sel && sel.visible) {
        const base = 0.35;
        const amp = 0.1;
        const w = 0.002;
        sel.alpha = base + amp * (0.5 + 0.5 * Math.sin(t * w));
      }
      
      // Only update visibility occasionally, not every frame
      if (t % 100 < app.ticker.deltaMS) {
        updateVisibilityAndLOD();
      }
    };
    
    // Initial visibility update
    updateVisibilityAndLOD(true);
    
    app.ticker.add(tick);
    
    return () => {
      app.ticker.remove(tick);
    };
  }, [viewport, app, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { ChunkedIsometricGridProps };
export { ChunkedIsometricGrid };