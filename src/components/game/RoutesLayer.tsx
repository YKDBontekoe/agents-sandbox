"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

export interface RouteDef {
  id: string;
  fromId: string;
  toId: string;
}

export interface RouteBuildingRef {
  id: string;
  x: number;
  y: number;
}

interface RoutesLayerProps {
  routes: RouteDef[];
  buildings: RouteBuildingRef[];
  tileWidth?: number;
  tileHeight?: number;
}

export default function RoutesLayer({ routes, buildings, tileWidth = 64, tileHeight = 32 }: RoutesLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'routes-layer';
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
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.removeChildren();

    const byId = new Map(buildings.map(b => [b.id, b] as const));
    routes.forEach(r => {
      const a = byId.get(r.fromId);
      const b = byId.get(r.toId);
      if (!a || !b) return;
      const aw = gridToWorld(a.x, a.y, tileWidth, tileHeight);
      const bw = gridToWorld(b.x, b.y, tileWidth, tileHeight);

      const g = new PIXI.Graphics();
      g.zIndex = 300;
      g.lineStyle(2, 0x1d4ed8, 0.8);
      g.moveTo(aw.worldX, aw.worldY);
      g.lineTo(bw.worldX, bw.worldY);
      container.addChild(g);

      const mid = new PIXI.Text({
        text: '⇄',
        style: { fill: 0x1e293b, fontSize: 12, fontWeight: '600' },
      });
      mid.anchor.set(0.5);
      mid.position.set((aw.worldX + bw.worldX) / 2, (aw.worldY + bw.worldY) / 2 - 6);
      container.addChild(mid);
    });
  }, [JSON.stringify(routes), JSON.stringify(buildings), tileWidth, tileHeight]);

  return null;
}

export type { RoutesLayerProps };

