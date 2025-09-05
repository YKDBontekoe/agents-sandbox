"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";
import { SIM_BUILDINGS } from "./simCatalog";
type BuildTypeId = keyof typeof SIM_BUILDINGS;

interface PreviewLayerProps {
  hoverTile: { x: number; y: number; tileType?: string } | null;
  selectedTile: { x: number; y: number; tileType?: string } | null;
  tileTypes: string[][];
  buildings: { id: string; typeId: string; x: number; y: number }[];
  previewTypeId: BuildTypeId | null;
  tileWidth?: number;
  tileHeight?: number;
}

export default function PreviewLayer({ hoverTile, selectedTile, tileTypes, buildings, previewTypeId, tileWidth = 64, tileHeight = 32 }: PreviewLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'preview-layer';
    container.sortableChildren = true;
    viewport.addChild(container);
    containerRef.current = container;
    return () => {
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
    };
  }, [viewport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.removeChildren();

    // Determine preview tile: prefer hover; fall back to selected
    const tile = hoverTile || selectedTile;
    if (!tile) return;
    const { x, y } = tile;
    const { worldX, worldY } = gridToWorld(x, y, tileWidth, tileHeight);

    // Occupied?
    const occupied = buildings.some(b => b.x === x && b.y === y);

    // Terrain validity for current preview type
    const allowedTerrain: Record<BuildTypeId, string[]> = {
      council_hall: ['grass','mountain'],
      trade_post: ['grass'],
      automation_workshop: ['grass'],
      farm: ['grass'],
      lumber_camp: ['forest'],
      sawmill: ['grass'],
      storehouse: ['grass'],
      house: ['grass'],
      shrine: ['grass']
    };
    let terrainOk = true;
    if (previewTypeId && tile.tileType) {
      terrainOk = (allowedTerrain[previewTypeId] || []).includes(tile.tileType);
    }

    const isValid = !occupied && terrainOk;
    // Ghost diamond overlay
    const ghost = new PIXI.Graphics();
    ghost.position.set(worldX, worldY);
    ghost.zIndex = 950;
    const color = isValid ? 0x10b981 : 0xef4444; // emerald/red
    ghost.lineStyle(2, color, 0.9);
    ghost.beginFill(color, 0.18);
    ghost.drawPolygon([
      0, -tileHeight / 2,
      tileWidth / 2, 0,
      0, tileHeight / 2,
      -tileWidth / 2, 0,
    ]);
    ghost.endFill();
    container.addChild(ghost);

    // Adjacency bonus hints for specific preview types
    if (previewTypeId) {
      const dirs = [ [1,0], [-1,0], [0,1], [0,-1] ];
      const showBonus = (nx: number, ny: number) => {
        if (ny < 0 || ny >= tileTypes.length) return false;
        if (nx < 0 || nx >= (tileTypes[ny]?.length || 0)) return false;
        const tt = tileTypes[ny][nx];
        if (previewTypeId === 'farm') return tt === 'water';
        if (previewTypeId === 'lumber_camp') return tt === 'forest';
        if (previewTypeId === 'shrine') return tt === 'mountain';
        return false;
      };
      dirs.forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (showBonus(nx, ny)) {
          const p = gridToWorld(nx, ny, tileWidth, tileHeight);
          const g = new PIXI.Graphics();
          g.position.set(p.worldX, p.worldY);
          g.zIndex = 960;
          g.beginFill(0x22c55e, 0.9);
          // small plus icon
          const s = Math.max(2, Math.floor(tileHeight * 0.08));
          g.drawRect(-s, -0.5, s*2, 1);
          g.drawRect(-0.5, -s, 1, s*2);
          g.endFill();
          container.addChild(g);
        }
      });
    }
  }, [hoverTile?.x, hoverTile?.y, hoverTile?.tileType, selectedTile?.x, selectedTile?.y, selectedTile?.tileType, previewTypeId, tileTypes.length]);

  return null;
}

export type { PreviewLayerProps };
