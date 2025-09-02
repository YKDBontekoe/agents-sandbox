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
    tile.interactive = true;
    tile.cursor = 'pointer';
    
    // Add hover effects
    tile.on('pointerover', () => {
      if (hoveredTileRef.current && hoveredTileRef.current !== selectedTileRef.current) {
        hoveredTileRef.current.sprite.tint = 0xffffff;
      }
      
      hoveredTileRef.current = { x: gridX, y: gridY, worldX, worldY, tileType, sprite: tile };
      tile.tint = 0x4f46e5; // indigo highlight

      onTileHover?.(gridX, gridY, tileType);
    });
    
    tile.on('pointerout', () => {
      if (hoveredTileRef.current === selectedTileRef.current) return;
      
      tile.tint = 0xffffff;
      hoveredTileRef.current = null;
    });
    
    tile.on('pointerdown', () => {
      // Clear previous selection
      if (selectedTileRef.current && selectedTileRef.current.sprite !== tile) {
        selectedTileRef.current.sprite.tint = 0xffffff;
      }
      
      selectedTileRef.current = { x: gridX, y: gridY, worldX, worldY, tileType, sprite: tile };
      tile.tint = 0x10b981; // emerald for selection

      onTileClick?.(gridX, gridY, tileType);
    });

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
      if (!viewport?.scale) return;
      const scale = viewport.scale.x || 1;
      const screenHalfW = (viewport.screenWidth || 0) / Math.max(scale, 0.0001) / 2;
      const screenHalfH = (viewport.screenHeight || 0) / Math.max(scale, 0.0001) / 2;
      const padX = Math.max(basePadX, screenHalfW);
      const padY = Math.max(basePadY, screenHalfH);
      const minX = worldMinX - padX;
      const maxX = worldMaxX + padX;
      const minY = worldMinY - padY;
      const maxY = worldMaxY + padY;
      viewport.clamp({ left: minX, right: maxX, top: minY, bottom: maxY, underflow: 'none' });
    };

    updateClamp();
    viewport.on('zoomed', updateClamp);
    // Removed 'moved' listener to prevent feedback loops and flicker

    // Cleanup function
    return () => {
      if (gridContainer.parent) {
        gridContainer.parent.removeChild(gridContainer);
      }
      gridContainer.destroy({ children: true });
      viewport.off('zoomed', updateClamp);
      // No 'moved' off needed since not attached
      tilesRef.current.clear();
      hoveredTileRef.current = null;
      selectedTileRef.current = null;
      centeredRef.current = false;
      initializedRef.current = false;
    };
  }, [viewport, gridSize, tileWidth, tileHeight, createTileSprite]);

  // Performance optimization: Level of Detail (LOD)
  useEffect(() => {
    if (!viewport || !gridContainerRef.current) return;

    const updateLOD = () => {
      if (!viewport || !viewport.scale) return;
      const scale = viewport.scale.x;
      const tiles = tilesRef.current;
      
      // Hide tiles when zoomed out too far for performance
      const shouldShowTiles = scale > 0.2;
      
      tiles.forEach((tile) => {
        tile.sprite.visible = shouldShowTiles;
        
        // Adjust line thickness based on zoom
        if (shouldShowTiles) {
          const lineWidth = Math.max(0.5, Math.min(2, scale * 1.5));
          // Only redraw on zoom changes (this effect listens to 'zoomed' only now)
          tile.sprite.clear();

          const baseColor = TILE_COLORS[tile.tileType] ?? 0xdde7f7;
          tile.sprite.fill({ color: baseColor, alpha: 0.9 });
          tile.sprite.setStrokeStyle({ width: lineWidth, color: 0x374151, alpha: 0.9 });
          
          tile.sprite.moveTo(0, -tileHeight / 2);
          tile.sprite.lineTo(tileWidth / 2, 0);
          tile.sprite.lineTo(0, tileHeight / 2);
          tile.sprite.lineTo(-tileWidth / 2, 0);
          tile.sprite.closePath();
          tile.sprite.fill();
          tile.sprite.stroke();
        }
      });
    };

    // Listen to viewport events for LOD updates
    viewport.on('zoomed', updateLOD);
    // Removed 'moved' listener to prevent redraws while panning (reduces flicker)
    
    // Initial LOD update
    updateLOD();

    return () => {
      viewport.off('zoomed', updateLOD);
    };
  }, [viewport, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { IsometricGridProps, GridTile };
export { IsometricGrid };