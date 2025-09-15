"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";
import { gridToWorld } from "@/lib/isometric";
import { createTileSprite, type GridTile } from "./grid/TileRenderer";
import { TileOverlay } from "./grid/TileOverlay";

type VisibilityUpdateOptions = { overlayUpdate?: boolean; animationTime?: number };

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
  const gridContainerRef = useRef<PIXI.Container | null>(null);
  const tilesRef = useRef<Map<string, GridTile>>(new Map());
  const centeredRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const overlayManagerRef = useRef<TileOverlay | null>(null);
  const updateVisibilityRef = useRef<((options?: VisibilityUpdateOptions) => void) | null>(null);
  const tileTypesRef = useRef<string[][]>(tileTypes);
  useEffect(() => {
    tileTypesRef.current = tileTypes;
  }, [tileTypes]);
  // no extra refs needed for min zoom snapping; we prevent underflow by clamping minScale to fit

  // Initialize grid
  useEffect(() => {
    logger.debug('IsometricGrid useEffect triggered, viewport:', viewport);
    if (!viewport) {
      logger.warn('IsometricGrid: No viewport available');
      return;
    }
    if (!app?.renderer) {
      logger.warn('IsometricGrid: No renderer available');
      return;
    }
    if (initializedRef.current) {
      // Avoid re-initializing the grid if already set up
      return;
    }
    initializedRef.current = true;

    logger.debug('Creating grid container and tiles...');
    const gridContainer = new PIXI.Container();
    gridContainer.name = 'isometric-grid';
    // ensure overlays can be drawn above tiles in order
    gridContainer.sortableChildren = true;
    gridContainer.zIndex = 100; // base layer under buildings
    // enable leave detection for hover overlay
      (gridContainer as unknown as { eventMode: string }).eventMode = 'static';
    viewport.addChild(gridContainer);
    gridContainerRef.current = gridContainer;

    // Create initial grid tiles
    const tiles = new Map<string, GridTile>();
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const tile = createTileSprite(x, y, gridContainer, tileWidth, tileHeight, tileTypes, app.renderer);
        const key = `${x},${y}`;
        tiles.set(key, tile);
        gridContainer.addChild(tile.sprite);
      }
    }
    
    logger.debug(`Created ${tiles.size} tiles for ${gridSize}x${gridSize} grid`);
    logger.debug('Grid container children count:', gridContainer.children.length);
    tilesRef.current = tiles;

    overlayManagerRef.current = new TileOverlay(gridContainer, {
      tileWidth,
      tileHeight,
      getTileType: (x, y) => tileTypesRef.current[y]?.[x],
      onTileHover,
      onTileClick,
    });

    // Compute world bounds for clamping based on isometric grid extents
    // For an isometric grid, we need to find the actual world bounds of all tiles
    const topLeft = gridToWorld(0, 0, tileWidth, tileHeight);
    const topRight = gridToWorld(gridSize - 1, 0, tileWidth, tileHeight);
    const bottomLeft = gridToWorld(0, gridSize - 1, tileWidth, tileHeight);
    const bottomRight = gridToWorld(gridSize - 1, gridSize - 1, tileWidth, tileHeight);
    
    const allX = [topLeft.worldX, topRight.worldX, bottomLeft.worldX, bottomRight.worldX];
    const allY = [topLeft.worldY, topRight.worldY, bottomLeft.worldY, bottomRight.worldY];
    
    // Center the viewport using the geometric center of the grid bounds
    // This ensures the entire grid is properly centered in view
    const gridCenterX = (Math.min(...allX) + Math.max(...allX)) / 2;
    const gridCenterY = (Math.min(...allY) + Math.max(...allY)) / 2;
    
    // Apply zoom first, then center, and only once
    if (!centeredRef.current) {
      viewport.setZoom(1.5);
      viewport.moveCenter(gridCenterX, gridCenterY);
      centeredRef.current = true;
      logger.debug(`Centered viewport on geometric center at (${gridCenterX}, ${gridCenterY})`);
    }

    const halfW = tileWidth / 2;
    const halfH = tileHeight / 2;
    const basePadX = tileWidth * 1.5;
    const basePadY = tileHeight * 1.5;
    
    const worldMinX = Math.min(...allX) - halfW;
    const worldMaxX = Math.max(...allX) + halfW;
    const worldMinY = Math.min(...allY) - halfH;
    const worldMaxY = Math.max(...allY) + halfH;

    const updateClamp = () => {
      // Static world clamps with a modest padding; independent of scale to avoid jitter
      const minX = worldMinX - basePadX;
      const maxX = worldMaxX + basePadX;
      const minY = worldMinY - basePadY;
      const maxY = worldMaxY + basePadY;
      // Center content when world is smaller than screen to avoid blank quadrants
      viewport.clamp({ left: minX, right: maxX, top: minY, bottom: maxY, underflow: 'center' });

      // Compute a reasonable min zoom once (fit ~50% of grid), adjust on resize only
      const worldW = (worldMaxX - worldMinX + tileWidth);
      const worldH = (worldMaxY - worldMinY + tileHeight);
      const fitScale = Math.min(
        (viewport.screenWidth || 1) / Math.max(worldW, 1),
        (viewport.screenHeight || 1) / Math.max(worldH, 1)
      );
      // Prevent zooming out beyond full fit so the world never underflows the screen
      const minScale = Math.max(0.25, Math.min(2, fitScale));
      viewport.clampZoom({ minScale, maxScale: 3 });
    };

    updateClamp();
    const onResize = () => updateClamp();
    window.addEventListener('resize', onResize);

    // Cleanup function
    return () => {
      overlayManagerRef.current?.destroy();
      overlayManagerRef.current = null;
      if (gridContainer.parent) {
        gridContainer.parent.removeChild(gridContainer);
      }
      gridContainer.destroy({ children: true });
      viewport.off('zoomed', updateClamp);
      window.removeEventListener('resize', onResize);
      tilesRef.current.clear();
      centeredRef.current = false;
      initializedRef.current = false;
    };
  }, [viewport, app, gridSize, tileWidth, tileHeight, tileTypes, onTileHover, onTileClick]);

  // Dynamically add missing tiles when gridSize grows
  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer || !app?.renderer) return;
    const tiles = tilesRef.current;
    let added = 0;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const key = `${x},${y}`;
        if (!tiles.has(key)) {
          const tile = createTileSprite(x, y, gridContainer, tileWidth, tileHeight, tileTypes, app.renderer);
          tiles.set(key, tile);
          gridContainer.addChild(tile.sprite);
          added++;
        }
      }
    }
    if (added > 0) {
      logger.debug(`IsometricGrid: added ${added} tiles after gridSize changed to ${gridSize}`);
      updateVisibilityRef.current?.({ overlayUpdate: true });
    }
  }, [app, gridSize, tileWidth, tileHeight, tileTypes]);

  // Refresh tile graphics when tileTypes change
  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer || !app?.renderer) return;
    const tiles = tilesRef.current;
    let updates = 0;
    tiles.forEach((gridTile, key) => {
      const nextType = tileTypes[gridTile.y]?.[gridTile.x];
      if (nextType && nextType !== gridTile.tileType) {
        gridTile.dispose();
        const newTile = createTileSprite(
          gridTile.x,
          gridTile.y,
          gridContainer,
          tileWidth,
          tileHeight,
          tileTypes,
          app.renderer,
        );
        tiles.set(key, newTile);
        gridContainer.addChild(newTile.sprite);
        updates++;
      }
    });
    if (updates > 0) {
      logger.debug(`IsometricGrid: updated ${updates} tiles due to tileTypes change`);
      updateVisibilityRef.current?.({ overlayUpdate: true });
    }
  }, [app, tileTypes, tileWidth, tileHeight]);

  // Performance optimization: Viewport culling and LOD + lightweight animations
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

      // Get viewport bounds for culling
      const bounds = viewport.getVisibleBounds();
      const padding = Math.max(tileWidth, tileHeight) * 2; // Add padding for smooth scrolling

      const visibleLeft = bounds.x - padding;
      const visibleRight = bounds.x + bounds.width + padding;
      const visibleTop = bounds.y - padding;
      const visibleBottom = bounds.y + bounds.height + padding;

      const frameTime = animationTime ?? overlayAnimationTime;

      tiles.forEach((tile) => {
        // Viewport culling - only show tiles in visible area
        const isInViewport =
          tile.worldX >= visibleLeft &&
          tile.worldX <= visibleRight &&
          tile.worldY >= visibleTop &&
          tile.worldY <= visibleBottom;

        // LOD - hide tiles when zoomed out too far
        const shouldShowTile = scale > 0.15 && isInViewport;

        if (tile.sprite.visible !== shouldShowTile) {
          tile.sprite.visible = shouldShowTile;
        }

        // Lightweight tile animations via overlay
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

    // Initial update to populate overlay textures and visibility states
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
  }, [viewport, app, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { IsometricGridProps, GridTile };
export { IsometricGrid };
