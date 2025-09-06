"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

export type Pulse = { id: string; x: number; y: number; createdAt: number; ttl: number };

interface BuildingPulseLayerProps {
  pulses: Pulse[];
  tileWidth?: number;
  tileHeight?: number;
}

export default function BuildingPulseLayer({ pulses, tileWidth = 64, tileHeight = 32 }: BuildingPulseLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'building-pulse-layer';
    container.sortableChildren = true;
    container.zIndex = 560; // slightly above buildings
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
    const tick = () => {
      const container = containerRef.current!;
      container.removeChildren();
      const now = performance.now();
      for (const p of pulses) {
        const age = now - p.createdAt;
        if (age > p.ttl) continue;
        const t = Math.max(0, 1 - age / p.ttl);
        const { worldX, worldY } = gridToWorld(p.x, p.y, tileWidth, tileHeight);
        const g = new PIXI.Graphics();
        g.position.set(worldX, worldY);
        g.zIndex = 561;
        const w = tileWidth / 2 * (1.0 + (1 - t) * 0.3);
        const h = tileHeight / 2 * (1.0 + (1 - t) * 0.3);
        g.setStrokeStyle({ width: 2, color: 0x10b981, alpha: 0.4 + 0.4 * t });
        g.drawPolygon([0, -h, w, 0, 0, h, -w, 0, 0, -h]);
        g.stroke();
        container.addChild(g);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [JSON.stringify(pulses), tileWidth, tileHeight]);

  return null;
}

export type { BuildingPulseLayerProps };
