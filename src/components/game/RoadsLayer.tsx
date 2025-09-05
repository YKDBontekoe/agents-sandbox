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
    for (const r of roads) {
      const { worldX, worldY } = gridToWorld(r.x, r.y, tileWidth, tileHeight);
      const g = new PIXI.Graphics();
      g.position.set(worldX, worldY);
      g.zIndex = 405;
      // simple paved diamond with center line
      g.beginFill(0x9ca3af, 0.7);
      g.drawPolygon([
        0, -tileHeight/4,
        tileWidth/4, 0,
        0, tileHeight/4,
        -tileWidth/4, 0,
      ]);
      g.endFill();
      g.lineStyle(1, 0xf8fafc, 0.8);
      g.moveTo(0, -tileHeight/6);
      g.lineTo(0, tileHeight/6);
      container.addChild(g);
    }
  }, [JSON.stringify(roads), tileWidth, tileHeight]);

  return null;
}

export type { RoadsLayerProps };
