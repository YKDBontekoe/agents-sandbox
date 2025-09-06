"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

export type PathHint = {
  id: string;
  tiles: Array<{ x: number; y: number }>;
  createdAt: number;
  ttl: number;
};

interface PathHintsLayerProps {
  hints: PathHint[];
  tileWidth?: number;
  tileHeight?: number;
}

export default function PathHintsLayer({ hints, tileWidth = 64, tileHeight = 32 }: PathHintsLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'path-hints-layer';
    container.sortableChildren = true;
    container.zIndex = 690; // above roads
    viewport.addChild(container);
    containerRef.current = container;
    return () => {
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [viewport]);

  useEffect(() => {
    if (!containerRef.current) return;
    const redraw = () => {
      const container = containerRef.current!;
      container.removeChildren();
      const now = performance.now();
      for (const hint of hints) {
        const age = now - hint.createdAt;
        if (age > hint.ttl) continue;
        const t = Math.max(0, 1 - age / hint.ttl);
        for (const tile of hint.tiles) {
          const { worldX, worldY } = gridToWorld(tile.x, tile.y, tileWidth, tileHeight);
          const g = new PIXI.Graphics();
          g.position.set(worldX, worldY);
          g.zIndex = 692;
          // glowing diamond
          const w = tileWidth / 4;
          const h = tileHeight / 4;
          g.beginFill(0x22c55e, 0.12 * t + 0.08);
          g.drawPolygon([0, -h, w, 0, 0, h, -w, 0]);
          g.endFill();
          g.lineStyle(1.5, 0x10b981, 0.55 * t + 0.15);
          g.drawPolygon([0, -h, w, 0, 0, h, -w, 0, 0, -h]);
          container.addChild(g);
        }
      }
      rafRef.current = requestAnimationFrame(redraw);
    };
    rafRef.current = requestAnimationFrame(redraw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [JSON.stringify(hints), tileWidth, tileHeight]);

  return null;
}

export type { PathHintsLayerProps };

