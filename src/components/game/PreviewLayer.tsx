"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";
import { SIM_BUILDINGS, BUILDABLE_TILES, type BuildTypeId } from "./simCatalog";

interface PreviewLayerProps {
  hoverTile: { x: number; y: number; tileType?: string } | null;
  selectedTile: { x: number; y: number; tileType?: string } | null;
  tileTypes: string[][];
  buildings: { id: string; typeId: string; x: number; y: number }[];
  previewTypeId: BuildTypeId | null;
  tileWidth?: number;
  tileHeight?: number;
  buildHint?: { valid: boolean; reason?: string };
  highlightAllPlaceable?: boolean;
  hasCouncil?: boolean;
  affordable?: boolean;
}

export default function PreviewLayer({ hoverTile, selectedTile, tileTypes, buildings, previewTypeId, tileWidth = 64, tileHeight = 32, buildHint, highlightAllPlaceable, hasCouncil, affordable }: PreviewLayerProps) {
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

    // Optional: highlight all placeable tiles for current preview type
    if (previewTypeId && highlightAllPlaceable) {
      const allowedTerrain = BUILDABLE_TILES;
      const needsCouncil = (previewTypeId === 'trade_post' || previewTypeId === 'automation_workshop');
      const councilOk = !needsCouncil || !!hasCouncil;
      const globallyOk = councilOk && (affordable !== false);
      if (globallyOk) {
        const occ = new Set(buildings.map(b => `${b.x},${b.y}`));
        for (let yy = 0; yy < tileTypes.length; yy++) {
          const row = tileTypes[yy] || [];
          for (let xx = 0; xx < row.length; xx++) {
            const tt = row[xx];
            const terrainOk = (allowedTerrain[previewTypeId] || []).includes(tt);
            if (!terrainOk) continue;
            if (occ.has(`${xx},${yy}`)) continue;
            const p = gridToWorld(xx, yy, tileWidth, tileHeight);
            const hl = new PIXI.Graphics();
            hl.position.set(p.worldX, p.worldY);
            hl.zIndex = 900;
            hl.beginFill(0x10b981, 0.12);
            hl.drawPolygon([
              0, -tileHeight / 2,
              tileWidth / 2, 0,
              0, tileHeight / 2,
              -tileWidth / 2, 0,
            ]);
            hl.endFill();
            container.addChild(hl);
          }
        }
      }
    }

    // Determine preview tile: prefer hover; fall back to selected
    const tile = hoverTile || selectedTile;
    if (!tile) return;
    const { x, y } = tile;
    const { worldX, worldY } = gridToWorld(x, y, tileWidth, tileHeight);

    // Occupied?
    const occupied = buildings.some(b => b.x === x && b.y === y);

    // Terrain validity for current preview type
    const allowedTerrain = BUILDABLE_TILES;
    let terrainOk = true;
    if (previewTypeId && tile.tileType) {
      terrainOk = (allowedTerrain[previewTypeId] || []).includes(tile.tileType);
    }

    const isValid = buildHint ? buildHint.valid : (!occupied && terrainOk);
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

    // If invalid and reason provided, show a small label above
    if (!isValid && buildHint?.reason) {
      const label = new PIXI.Text({
        text: buildHint.reason,
        style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: 'ui-sans-serif, system-ui', stroke: { color: 0x000000, width: 3 } }),
      });
      label.anchor.set(0.5, 1);
      label.position.set(worldX, worldY - tileHeight * 0.7);
      label.zIndex = 970;
      container.addChild(label);
    }

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

    // Compact potential tooltip (at full staffing, level 1)
    if (previewTypeId) {
      const def = SIM_BUILDINGS[previewTypeId];
      if (def) {
        // compute adjacency modifiers roughly matching engine
        const dirs = [ [1,0], [-1,0], [0,1], [0,-1] ];
        let waterAdj = 0, mountainAdj = 0, forestAdj = 0;
        dirs.forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          if (ny >= 0 && ny < tileTypes.length && nx >= 0 && nx < (tileTypes[ny]?.length || 0)) {
            const tt = tileTypes[ny][nx];
            if (tt === 'water') waterAdj++;
            if (tt === 'mountain') mountainAdj++;
            if (tt === 'forest') forestAdj++;
          }
        });
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        waterAdj = clamp(waterAdj, 0, 2);
        mountainAdj = clamp(mountainAdj, 0, 2);
        forestAdj = clamp(forestAdj, 0, 3);

        // ratio 1 (full staffing if applicable), levelOutScale 1
        const deltas: Record<string, number> = {};
        // inputs are negative
        Object.entries(def.inputs || {}).forEach(([k, v]: any) => {
          const need = Math.round(Number(v || 0));
          if (need) deltas[k] = (deltas[k] || 0) - need;
        });
        // outputs with adjacency tweaks
        Object.entries(def.outputs || {}).forEach(([k, v]: any) => {
          let out = Number(v || 0);
          if (previewTypeId === 'trade_post' && k === 'coin') out += 2 * waterAdj;
          if (previewTypeId === 'farm' && k === 'grain') out += 3 * waterAdj;
          if (previewTypeId === 'lumber_camp' && k === 'wood') out += 2 * forestAdj;
          if (previewTypeId === 'shrine' && k === 'favor') out += 1 * mountainAdj;
          if (out) deltas[k] = (deltas[k] || 0) + Math.round(out);
        });
        // Build summary: pick two most significant entries
        const sorted = Object.entries(deltas).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0,2);
        if (sorted.length) {
          const text = sorted.map(([k,v]) => `${k} ${v>=0?'+':''}${v}`).join('  ');
          const label = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x0f172a, fontFamily: 'ui-sans-serif, system-ui', stroke: { color: 0xffffff, width: 3 } })
          });
          label.anchor.set(0.5, 0);
          label.position.set(worldX, worldY + tileHeight * 0.6);
          label.zIndex = 970;
          container.addChild(label);
        }
      }
    }
  }, [hoverTile?.x, hoverTile?.y, hoverTile?.tileType, selectedTile?.x, selectedTile?.y, selectedTile?.tileType, previewTypeId, tileTypes.length]);

  return null;
}

export type { PreviewLayerProps };
