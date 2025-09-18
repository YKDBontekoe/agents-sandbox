"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";
import { SIM_BUILDINGS, BUILDABLE_TILES, type BuildTypeId, type BuildingAvailability } from "./simCatalog";
import type { BuildPlacementHint } from "./layers/types";

interface TileTooltipProps {
  hoverTile: { x: number; y: number; tileType?: string } | null;
  selectedTile: { x: number; y: number; tileType?: string } | null;
  previewTypeId: BuildTypeId | null;
  tileTypes: string[][];
  buildings: { x: number; y: number }[];
  locked: boolean;
  onUnlock: () => void;
  tileWidth?: number;
  tileHeight?: number;
  buildingAvailability: Record<BuildTypeId, BuildingAvailability>;
  buildHint?: BuildPlacementHint;
}

export default function TileTooltip({
  hoverTile,
  selectedTile,
  previewTypeId,
  tileTypes,
  buildings,
  locked,
  onUnlock,
  tileWidth = 64,
  tileHeight = 32,
  buildingAvailability,
  buildHint,
}: TileTooltipProps) {
  const { viewport } = useGameContext();
  const target = useMemo(() => (locked ? selectedTile : (hoverTile || selectedTile)), [locked, hoverTile, selectedTile]);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!viewport || !target) { setPos(null); return; }
    const { worldX, worldY } = gridToWorld(target.x, target.y, tileWidth, tileHeight);
    const worldPoint = new PIXI.Point(worldX, worldY);
    const p = viewport.toGlobal(worldPoint);
    setPos({ left: p.x + 12, top: p.y - 12 });
  }, [viewport, target?.x, target?.y, target?.tileType]);

  if (!target || !pos) return null;

  const occupied = buildings.some(b => b.x === target.x && b.y === target.y);
  const tt = target.tileType ?? tileTypes[target.y]?.[target.x];
  const placeableTerrain = previewTypeId ? (!!tt && (BUILDABLE_TILES[previewTypeId] || []).includes(tt)) : !occupied;
  const availability = previewTypeId ? buildingAvailability[previewTypeId] : undefined;
  const prerequisitesMet = previewTypeId ? (availability?.meetsPrerequisites ?? true) : true;
  const placeable = previewTypeId ? placeableTerrain && prerequisitesMet && !occupied : !occupied;
  const reasons = availability?.reasons ?? [];
  const primaryReason = buildHint?.valid === false ? buildHint.reason : reasons[0];

  return (
    <div
      className="absolute z-20 pointer-events-auto"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="bg-gray-800/95 border border-gray-700 rounded shadow-sm px-2 py-1 text-[11px] text-gray-200 min-w-[160px]">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-100">Tile {target.x},{target.y}</div>
          {locked && (
            <button className="text-gray-400 hover:text-gray-200" onClick={onUnlock} title="Unlock tooltip">✕</button>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tt === 'water' ? '#60a5fa' : tt === 'forest' ? '#16a34a' : tt === 'mountain' ? '#6b7280' : '#94a3b8' }} />
            <span>{tt || 'unknown'}</span>
          </span>
          <span className={`ml-auto ${occupied ? 'text-rose-400' : 'text-emerald-300'}`}>{occupied ? 'Occupied' : 'Free'}</span>
        </div>
        {previewTypeId && (
          <div className="mt-1 flex items-center gap-2">
            <span>Preview:</span>
            <span className={`px-1 rounded ${placeable ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'}`}>
              {placeable ? 'Placeable' : 'Blocked'}
            </span>
          </div>
        )}
        {!placeable && (primaryReason || reasons.length > 0) && (
          <div className="mt-1 text-[11px] text-rose-300">
            {primaryReason}
            {reasons.length > 1 && (
              <ul className="mt-0.5 list-disc list-inside space-y-0.5 text-rose-200">
                {reasons.slice(primaryReason ? 1 : 0).map(reason => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type { TileTooltipProps };
