"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useGameContext } from "./GameContext";

interface GridTile {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  sprite: PIXI.Graphics;
}

interface IsometricGridProps {
  gridSize: number;
  tileWidth: number;
  tileHeight: number;
  onTileHover?: (x: number, y: number) => void;
  onTileClick?: (x: number, y: number) => void;
}

export default function IsometricGrid({
  gridSize,
  tileWidth = 64,
  tileHeight = 32,
  onTileHover,
  onTileClick,
}: IsometricGridProps) {
  const { viewport } = useGameContext();
  const gridContainerRef = useRef<PIXI.Container | null>(null);
  const tilesRef = useRef<Map<string, GridTile>>(new Map());
  const hoveredTileRef = useRef<GridTile | null>(null);
  const selectedTileRef = useRef<GridTile | null>(null);

  // Convert grid coordinates to world coordinates (isometric)
  const gridToWorld = (gridX: number, gridY: number) => {
    const worldX = (gridX - gridY) * (tileWidth / 2);
    const worldY = (gridX + gridY) * (tileHeight / 2);
    return { worldX, worldY };
  };

  // Convert world coordinates to grid coordinates
  const worldToGrid = (worldX: number, worldY: number) => {
    const gridX = Math.floor((worldX / (tileWidth / 2) + worldY / (tileHeight / 2)) / 2);
    const gridY = Math.floor((worldY / (tileHeight / 2) - worldX / (tileWidth / 2)) / 2);
    return { gridX, gridY };
  };

  // Create a tile sprite
  const createTileSprite = (gridX: number, gridY: number) => {
    const { worldX, worldY } = gridToWorld(gridX, gridY);
    
    const tile = new PIXI.Graphics();
    
    // Draw isometric tile shape
    tile.fill({ color: 0x2a2a3e, alpha: 0.3 });
    tile.setStrokeStyle({ width: 1, color: 0x4a4a6e, alpha: 0.8 });
    
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
      
      hoveredTileRef.current = { x: gridX, y: gridY, worldX, worldY, sprite: tile };
      tile.tint = 0x88ccff;
      
      onTileHover?.(gridX, gridY);
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
      
      selectedTileRef.current = { x: gridX, y: gridY, worldX, worldY, sprite: tile };
      tile.tint = 0xffaa44;
      
      onTileClick?.(gridX, gridY);
    });
    
    return { x: gridX, y: gridY, worldX, worldY, sprite: tile };
  };

  // Initialize grid
  useEffect(() => {
    console.log('IsometricGrid useEffect triggered, viewport:', viewport);
    if (!viewport) {
      console.warn('IsometricGrid: No viewport available');
      return;
    }

    console.log('Creating grid container and tiles...');
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
    
    console.log(`Created ${tiles.size} tiles for ${gridSize}x${gridSize} grid`);
    console.log('Grid container children count:', gridContainer.children.length);
    tilesRef.current = tiles;

    // Cleanup function
    return () => {
      if (gridContainer.parent) {
        gridContainer.parent.removeChild(gridContainer);
      }
      gridContainer.destroy({ children: true });
      tilesRef.current.clear();
      hoveredTileRef.current = null;
      selectedTileRef.current = null;
    };
  }, [viewport, gridSize, tileWidth, tileHeight]);

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
          tile.sprite.clear();
          
          tile.sprite.fill({ color: 0x2a2a3e, alpha: 0.3 });
          tile.sprite.setStrokeStyle({ width: lineWidth, color: 0x4a4a6e, alpha: 0.8 });
          
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
    viewport.on('moved', updateLOD);
    
    // Initial LOD update
    updateLOD();

    return () => {
      viewport.off('zoomed', updateLOD);
      viewport.off('moved', updateLOD);
    };
  }, [viewport, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { IsometricGridProps, GridTile };
export { IsometricGrid };