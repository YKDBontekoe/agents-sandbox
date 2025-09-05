"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

export interface RoadTile { x: number; y: number }

interface RoadsLayerProps {
  roads: RoadTile[];
  tileWidth?: number;
  tileHeight?: number;
}

export default function RoadsLayer({ roads, tileWidth = 64, tileHeight = 32 }: RoadsLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const lastScaleRef = useRef(1);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'roads-layer';
    container.sortableChildren = true;
    container.zIndex = 400; // above grid, below buildings
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
    const roadSet = new Set(roads.map(r=>`${r.x},${r.y}`));
    const has = (x:number,y:number)=> roadSet.has(`${x},${y}`);
    const scale = viewport?.scale?.x ?? 1;
    lastScaleRef.current = scale;
    for (const r of roads) {
      const { worldX, worldY } = gridToWorld(r.x, r.y, tileWidth, tileHeight);
      const g = new PIXI.Graphics();
      g.position.set(worldX, worldY);
      g.zIndex = 405;
      // paved diamond with soft shadow and connection hints
      const w = tileWidth/4, h = tileHeight/4;
      // shadow
      g.beginFill(0x000000, 0.06);
      g.drawPolygon([0, -h-1, w, 0-1, 0, h-1, -w, 0-1]);
      g.endFill();
      // base
      g.beginFill(0x9aa0a6, 0.8);
      g.drawPolygon([0, -h, w, 0, 0, h, -w, 0]);
      g.endFill();
      // outline for low-zoom readability
      if (scale <= 0.9) {
        g.lineStyle(1.5, 0x64748b, 0.9);
        g.drawPolygon([0, -h, w, 0, 0, h, -w, 0, 0, -h]);
      }
      // connection stubs
      const st = 6; // stub length in px
      g.lineStyle(2, 0x9aa0a6, 0.78);
      if (has(r.x+1, r.y)) g.lineTo(w,0), g.moveTo(0,0), g.lineTo(w+st,0);
      g.moveTo(0,0);
      if (has(r.x-1, r.y)) g.lineTo(-w,0), g.moveTo(0,0), g.lineTo(-w-st,0);
      g.moveTo(0,0);
      if (has(r.x, r.y+1)) g.lineTo(0,h), g.moveTo(0,0), g.lineTo(0,h+st);
      g.moveTo(0,0);
      if (has(r.x, r.y-1)) g.lineTo(0,-h), g.moveTo(0,0), g.lineTo(0,-h-st);
      // dashed center line
      g.lineStyle(1, 0xf8fafc, 0.85);
      const dash = 4, gap = 3;
      for (let yy=-h+2; yy<h-2; yy += dash+gap) {
        g.moveTo(0, yy);
        g.lineTo(0, Math.min(h-2, yy+dash));
      }
      container.addChild(g);
    }
  }, [JSON.stringify(roads), tileWidth, tileHeight]);

  return null;
}

export type { RoadsLayerProps };
