"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";
import { gridToWorld, TILE_COLORS } from "@/lib/isometric";
import { createTileSprite, type GridTile } from "./grid/TileRenderer";
import { TileOverlay } from "./grid/TileOverlay";

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
        const tile = createTileSprite(x, y, gridContainer, tileWidth, tileHeight, tileTypes);
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
  }, [viewport, gridSize, tileWidth, tileHeight, tileTypes, onTileHover, onTileClick]);

  // Dynamically add missing tiles when gridSize grows
  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer) return;
    const tiles = tilesRef.current;
    let added = 0;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const key = `${x},${y}`;
        if (!tiles.has(key)) {
          const tile = createTileSprite(x, y, gridContainer, tileWidth, tileHeight, tileTypes);
          tiles.set(key, tile);
          gridContainer.addChild(tile.sprite);
          added++;
        }
      }
    }
    if (added > 0) {
      logger.debug(`IsometricGrid: added ${added} tiles after gridSize changed to ${gridSize}`);
    }
  }, [gridSize, tileWidth, tileHeight, tileTypes]);

  // Refresh tile graphics when tileTypes change
  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer) return;
    const tiles = tilesRef.current;
    let updates = 0;
    tiles.forEach((gridTile, key) => {
      const nextType = tileTypes[gridTile.y]?.[gridTile.x];
      if (nextType && nextType !== gridTile.tileType) {
          const oldSprite = gridTile.sprite as PIXI.Graphics & { __tex?: PIXI.Graphics };
          const oldTex = oldSprite.__tex;
        if (oldTex) {
          try { gridContainer.removeChild(oldTex); } catch {}
        }
        try { gridContainer.removeChild(gridTile.sprite); } catch {}
        const newTile = createTileSprite(gridTile.x, gridTile.y, gridContainer, tileWidth, tileHeight, tileTypes);
        tiles.set(key, newTile);
        gridContainer.addChild(newTile.sprite);
        updates++;
      }
    });
    if (updates > 0) {
      logger.debug(`IsometricGrid: updated ${updates} tiles due to tileTypes change`);
    }
  }, [tileTypes, tileWidth, tileHeight]);

  // Performance optimization: Viewport culling and LOD + lightweight animations
  useEffect(() => {
    if (!viewport || !gridContainerRef.current || !app?.ticker) return;

    let lastScale = viewport.scale?.x || 1;
    let isUpdating = false;
    let t = 0;
    let isTickerActive = false;

    const updateVisibilityAndLOD = () => {
      if (!viewport || !viewport.scale || isUpdating) return;
      
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
      
      // Only update line width if scale changed significantly
      const scaleChanged = Math.abs(scale - lastScale) > 0.1;
      
      tiles.forEach((tile) => {
        // Viewport culling - only show tiles in visible area
        const isInViewport = tile.worldX >= visibleLeft && 
                           tile.worldX <= visibleRight && 
                           tile.worldY >= visibleTop && 
                           tile.worldY <= visibleBottom;
        
        // LOD - hide tiles when zoomed out too far
        const shouldShowTile = scale > 0.15 && isInViewport;
        
        if (tile.sprite.visible !== shouldShowTile) {
          tile.sprite.visible = shouldShowTile;
        }
        
        // Only redraw graphics if scale changed significantly and tile is visible
        if (shouldShowTile && scaleChanged) {
          const lineWidth = Math.max(0.3, Math.min(2.5, scale * 1.2));
          tile.sprite.clear();
          const baseColor = TILE_COLORS[tile.tileType] ?? 0xdde7f7;
          tile.sprite.setStrokeStyle({ width: lineWidth, color: 0x374151, alpha: 0.8 });
          tile.sprite.fill({ color: baseColor, alpha: 0.95 });
          tile.sprite.moveTo(0, -tileHeight / 2);
          tile.sprite.lineTo(tileWidth / 2, 0);
          tile.sprite.lineTo(0, tileHeight / 2);
          tile.sprite.lineTo(-tileWidth / 2, 0);
          tile.sprite.closePath();
          tile.sprite.fill();
          tile.sprite.stroke();
        }

        // Lightweight tile animations via overlay
          const overlay = (tile.sprite as PIXI.Graphics & { __overlay?: PIXI.Graphics }).__overlay;
        if (overlay) {
          overlay.visible = shouldShowTile;
          if (shouldShowTile) {
            overlay.clear();
            if (tile.tileType === 'water') {
              const r = (tileHeight / 4) + Math.sin(t * 0.005 + (tile.x + tile.y)) * 2;
              overlay.fill({ color: 0xffffff, alpha: 0.05 });
              overlay.drawCircle(0, 0, r);
              overlay.fill({ color: 0xffffff, alpha: 0.03 });
              overlay.drawCircle(0, 0, r * 0.6);
            } else if (tile.tileType === 'forest') {
              overlay.setStrokeStyle({ width: 1, color: 0x14532d, alpha: 0.2 });
              const sway = Math.sin(t * 0.006 + (tile.x * 0.1)) * 3;
              overlay.moveTo(-tileWidth/4 + sway, -tileHeight/6);
              overlay.lineTo(-tileWidth/8 + sway, 0);
              overlay.lineTo(-tileWidth/4 + sway, tileHeight/6);
              overlay.stroke();
            }
          }
        }
      });
      
      lastScale = scale;
      isUpdating = false;
    };

    const throttledUpdate = () => {
      // Update will be handled by the ticker
      updateVisibilityAndLOD();
    };

    // Listen to viewport events with throttling
    viewport.on('zoomed', throttledUpdate);
    viewport.on('moved', throttledUpdate);
    // Global animation ticker using PIXI ticker
    const tick = () => {
      t += 16;
      // Subtle pulse on selection overlay
      const sel = overlayManagerRef.current?.selectOverlay;
      if (sel && sel.visible) {
        const base = 0.35;
        const amp = 0.1;
        const w = 0.002;
        sel.alpha = base + amp * (0.5 + 0.5 * Math.sin(t * w));
      }
      throttledUpdate();
    };
    
    if (!isTickerActive) {
      isTickerActive = true;
      app.ticker.add(tick);
    }
    
    // Initial update
    updateVisibilityAndLOD();

    return () => {
      if (isTickerActive && app?.ticker) {
        app.ticker.remove(tick);
        isTickerActive = false;
      }
      viewport.off('zoomed', throttledUpdate);
      viewport.off('moved', throttledUpdate);
    };
  }, [viewport, app, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { IsometricGridProps, GridTile };
export { IsometricGrid };
