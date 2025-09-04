"use client";

import { useCallback, useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";
import { gridToWorld, TILE_COLORS } from "@/lib/isometric";

interface GridTile {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  tileType: string;
  sprite: PIXI.Graphics;
}

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
  const { viewport } = useGameContext();
  const gridContainerRef = useRef<PIXI.Container | null>(null);
  const tilesRef = useRef<Map<string, GridTile>>(new Map());
  const hoveredTileRef = useRef<GridTile | null>(null);
  const selectedTileRef = useRef<GridTile | null>(null);
  const centeredRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const hoverOverlayRef = useRef<PIXI.Graphics | null>(null);
  const selectOverlayRef = useRef<PIXI.Graphics | null>(null);
  const lastHoverIndexRef = useRef<{ x: number; y: number } | null>(null);
  const hoverDebounceRef = useRef<number | null>(null);
  // no extra refs needed for min zoom snapping; we prevent underflow by clamping minScale to fit

  // Create a tile sprite
  const createTileSprite = useCallback((gridX: number, gridY: number) => {
    const { worldX, worldY } = gridToWorld(gridX, gridY, tileWidth, tileHeight);
    const tileType = tileTypes[gridY]?.[gridX] || "grass";
    
    const tile = new PIXI.Graphics();
    
    const color = TILE_COLORS[tileType] ?? 0xdde7f7;
    tile.fill({ color, alpha: 0.9 });
    tile.setStrokeStyle({ width: 1, color: 0x374151, alpha: 0.9 });
    
    // Isometric diamond shape
    tile.moveTo(0, -tileHeight / 2);
    tile.lineTo(tileWidth / 2, 0);
    tile.lineTo(0, tileHeight / 2);
    tile.lineTo(-tileWidth / 2, 0);
    tile.closePath();
    tile.fill();
    tile.stroke();
    
    tile.x = worldX;
    tile.y = worldY;
    // Enable pointer events on v8
    (tile as any).eventMode = 'static';
    // Shrink hit area slightly to avoid edge flicker when moving across tile borders
    const hx = (tileWidth / 2) * 0.95;
    const hy = (tileHeight / 2) * 0.95;
    tile.hitArea = new PIXI.Polygon([
      0, -hy,
      hx, 0,
      0, hy,
      -hx, 0,
    ]);
    tile.cursor = 'pointer';
    
    // Per-tile hover/selection handled centrally on the grid container to avoid flicker

    return { x: gridX, y: gridY, worldX, worldY, tileType, sprite: tile };
  }, [tileHeight, tileTypes, tileWidth, onTileHover, onTileClick]);

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
    // enable leave detection for hover overlay
    (gridContainer as any).eventMode = 'static';
    viewport.addChild(gridContainer);
    gridContainerRef.current = gridContainer;

    // Create initial grid tiles
    const tiles = new Map<string, GridTile>();
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const tile = createTileSprite(x, y);
        const key = `${x},${y}`;
        tiles.set(key, tile);
        gridContainer.addChild(tile.sprite);
      }
    }
    
    logger.debug(`Created ${tiles.size} tiles for ${gridSize}x${gridSize} grid`);
    logger.debug('Grid container children count:', gridContainer.children.length);
    tilesRef.current = tiles;

    // Build shared hover and selection overlays
    const makeOverlay = (color: number, alpha: number) => {
      const g = new PIXI.Graphics();
      g.zIndex = 9999;
      (g as any).eventMode = 'none';
      g.clear();
      g.fill({ color, alpha });
      g.moveTo(0, -tileHeight / 2);
      g.lineTo(tileWidth / 2, 0);
      g.lineTo(0, tileHeight / 2);
      g.lineTo(-tileWidth / 2, 0);
      g.closePath();
      g.fill();
      g.visible = false;
      return g;
    };

    const hoverOverlay = makeOverlay(0x4f46e5, 0.25); // indigo
    const selectOverlay = makeOverlay(0x10b981, 0.3); // emerald
    hoverOverlayRef.current = hoverOverlay;
    selectOverlayRef.current = selectOverlay;
    gridContainer.addChild(hoverOverlay);
    gridContainer.addChild(selectOverlay);

    // Hide hover overlay when leaving grid container
    const onPointerLeave = () => {
      const hover = hoverOverlayRef.current;
      if (hover) hover.visible = false;
      lastHoverIndexRef.current = null;
    };
    gridContainer.on('pointerleave', onPointerLeave);

    // Compute tile index from local world coordinates
    const toTileIndex = (wx: number, wy: number) => {
      const tw2 = tileWidth / 2;
      const th2 = tileHeight / 2;
      const fx = wy / th2 + wx / tw2; // equals 2*gx ideally
      const fy = wy / th2 - wx / tw2; // equals 2*gy ideally
      const gx = Math.round(fx / 2);
      const gy = Math.round(fy / 2);
      return { gx, gy };
    };

    const onPointerMove = (e: PIXI.FederatedPointerEvent) => {
      const local = gridContainer.toLocal({ x: e.globalX, y: e.globalY } as any);
      const { gx, gy } = toTileIndex(local.x, local.y);
      if (gx < 0 || gy < 0 || gx >= gridSize || gy >= gridSize) {
        const hover = hoverOverlayRef.current;
        if (hover) hover.visible = false;
        lastHoverIndexRef.current = null;
        return;
      }
      const last = lastHoverIndexRef.current;
      if (!last || last.x !== gx || last.y !== gy) {
        // Debounce hover switch to avoid border flicker
        if (hoverDebounceRef.current) {
          clearTimeout(hoverDebounceRef.current);
          hoverDebounceRef.current = null;
        }
        const targetX = gx, targetY = gy;
        hoverDebounceRef.current = window.setTimeout(() => {
          lastHoverIndexRef.current = { x: targetX, y: targetY };
          const { worldX, worldY } = gridToWorld(targetX, targetY, tileWidth, tileHeight);
          const hover = hoverOverlayRef.current;
          if (hover) {
            hover.visible = true;
            hover.position.set(worldX, worldY);
          }
          onTileHover?.(targetX, targetY, tileTypes[targetY]?.[targetX]);
        }, 20);
      }
    };

    const onPointerTap = (e: PIXI.FederatedPointerEvent) => {
      const local = gridContainer.toLocal({ x: e.globalX, y: e.globalY } as any);
      const { gx, gy } = toTileIndex(local.x, local.y);
      if (gx < 0 || gy < 0 || gx >= gridSize || gy >= gridSize) return;
      const { worldX, worldY } = gridToWorld(gx, gy, tileWidth, tileHeight);
      selectedTileRef.current = { x: gx, y: gy, worldX, worldY, tileType: tileTypes[gy]?.[gx] || 'grass', sprite: new PIXI.Graphics() } as any;
      const select = selectOverlayRef.current;
      if (select) {
        select.visible = true;
        select.position.set(worldX, worldY);
      }
      onTileClick?.(gx, gy, tileTypes[gy]?.[gx]);
    };

    gridContainer.on('pointermove', onPointerMove);
    gridContainer.on('pointertap', onPointerTap);

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
      if (gridContainer.parent) {
        gridContainer.parent.removeChild(gridContainer);
      }
      gridContainer.destroy({ children: true });
      viewport.off('zoomed', updateClamp);
      window.removeEventListener('resize', onResize);
      gridContainer.off('pointerleave', onPointerLeave);
      gridContainer.off('pointermove', onPointerMove);
      gridContainer.off('pointertap', onPointerTap);
      if (hoverDebounceRef.current) {
        clearTimeout(hoverDebounceRef.current);
        hoverDebounceRef.current = null;
      }
      tilesRef.current.clear();
      hoveredTileRef.current = null;
      selectedTileRef.current = null;
      centeredRef.current = false;
      initializedRef.current = false;
    };
  }, [viewport, gridSize, tileWidth, tileHeight, tileTypes]);

  // Performance optimization: Viewport culling and LOD
  useEffect(() => {
    if (!viewport || !gridContainerRef.current) return;

    let lastScale = viewport.scale?.x || 1;
    let animationFrameId: number | null = null;
    let isUpdating = false;

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
          tile.sprite.fill({ color: baseColor, alpha: 0.9 });
          tile.sprite.setStrokeStyle({ width: lineWidth, color: 0x374151, alpha: 0.8 });
          
          tile.sprite.moveTo(0, -tileHeight / 2);
          tile.sprite.lineTo(tileWidth / 2, 0);
          tile.sprite.lineTo(0, tileHeight / 2);
          tile.sprite.lineTo(-tileWidth / 2, 0);
          tile.sprite.closePath();
          tile.sprite.fill();
          tile.sprite.stroke();
        }
      });
      
      lastScale = scale;
      isUpdating = false;
    };

    const throttledUpdate = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(updateVisibilityAndLOD);
    };

    // Listen to viewport events with throttling
    viewport.on('zoomed', throttledUpdate);
    viewport.on('moved', throttledUpdate);
    
    // Initial update
    updateVisibilityAndLOD();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      viewport.off('zoomed', throttledUpdate);
      viewport.off('moved', throttledUpdate);
    };
  }, [viewport, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { IsometricGridProps, GridTile };
export { IsometricGrid };
