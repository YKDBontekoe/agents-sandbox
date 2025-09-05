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
  const caravansRef = useRef<Array<{ sprite: PIXI.Graphics; ax: number; ay: number; bx: number; by: number; speed: number; phase: number }>>([]);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'routes-layer';
    container.sortableChildren = true;
    viewport.addChild(container);
    containerRef.current = container;
    let raf: number | null = null;
    const animate = () => {
      const list = caravansRef.current;
      list.forEach(c => {
        c.phase = (c.phase + c.speed) % 1;
        const t = c.phase;
        const x = c.ax + (c.bx - c.ax) * t;
        const y = c.ay + (c.by - c.ay) * t;
        c.sprite.position.set(x, y);
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [viewport]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.removeChildren();

    const byId = new Map(buildings.map(b => [b.id, b] as const));
    caravansRef.current = [];
    routes.forEach(r => {
      const a = byId.get(r.fromId);
      const b = byId.get(r.toId);
      if (!a || !b) return;
      const aw = gridToWorld(a.x, a.y, tileWidth, tileHeight);
      const bw = gridToWorld(b.x, b.y, tileWidth, tileHeight);

      // Outline then inner line for readability
      const base = new PIXI.Graphics();
      base.zIndex = 295;
      base.lineStyle(4, 0x334155, 0.35);
      base.moveTo(aw.worldX, aw.worldY);
      base.lineTo(bw.worldX, bw.worldY);
      container.addChild(base);

      const g = new PIXI.Graphics();
      g.zIndex = 300;
      g.lineStyle(2, 0x1d4ed8, 0.85);
      g.moveTo(aw.worldX, aw.worldY);
      g.lineTo(bw.worldX, bw.worldY);
      container.addChild(g);

      // Caravan dot
      const c = new PIXI.Graphics();
      c.zIndex = 350;
      c.fill({ color: 0xf59e0b, alpha: 0.95 });
      c.drawCircle(0, 0, 3);
      container.addChild(c);
      caravansRef.current.push({ sprite: c, ax: aw.worldX, ay: aw.worldY, bx: bw.worldX, by: bw.worldY, speed: 0.004 + Math.random() * 0.004, phase: Math.random() });
    });
  }, [JSON.stringify(routes), JSON.stringify(buildings), tileWidth, tileHeight]);

  return null;
}

export type { RoutesLayerProps };
