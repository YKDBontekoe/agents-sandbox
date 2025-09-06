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
  draftFromId?: string | null;
  draftToId?: string | null;
}

export default function RoutesLayer({ routes, buildings, tileWidth = 64, tileHeight = 32, draftFromId, draftToId }: RoutesLayerProps) {
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
      base.setStrokeStyle({ width: 4, color: 0x334155, alpha: 0.35 });
      base.moveTo(aw.worldX, aw.worldY);
      base.lineTo(bw.worldX, bw.worldY);
      base.stroke();
      container.addChild(base);

      const g = new PIXI.Graphics();
      g.zIndex = 300;
      g.setStrokeStyle({ width: 2, color: 0x1d4ed8, alpha: 0.85 });
      g.moveTo(aw.worldX, aw.worldY);
      g.lineTo(bw.worldX, bw.worldY);
      g.stroke();
      container.addChild(g);

      // Caravan dot
      const c = new PIXI.Graphics();
      c.zIndex = 350;
      c.fill({ color: 0xf59e0b, alpha: 0.95 });
      c.drawCircle(0, 0, 3);
      container.addChild(c);
      caravansRef.current.push({ sprite: c, ax: aw.worldX, ay: aw.worldY, bx: bw.worldX, by: bw.worldY, speed: 0.004 + Math.random() * 0.004, phase: Math.random() });
    });

    // Draft preview (dashed line + cost label)
    if (draftFromId && draftToId) {
      const a = byId.get(draftFromId);
      const b = byId.get(draftToId);
      if (a && b) {
        const aw = gridToWorld(a.x, a.y, tileWidth, tileHeight);
        const bw = gridToWorld(b.x, b.y, tileWidth, tileHeight);
        const dashed = new PIXI.Graphics();
        dashed.zIndex = 310;
        dashed.setStrokeStyle({ width: 2, color: 0x0891b2, alpha: 0.8 });
        // simple dashed approximation
        const segs = 14;
        for (let i=0;i<segs;i++) {
          const t0 = i / segs;
          const t1 = (i+0.5) / segs;
          const x0 = aw.worldX + (bw.worldX - aw.worldX) * t0;
          const y0 = aw.worldY + (bw.worldY - aw.worldY) * t0;
          const x1 = aw.worldX + (bw.worldX - aw.worldX) * t1;
          const y1 = aw.worldY + (bw.worldY - aw.worldY) * t1;
          dashed.moveTo(x0, y0);
          dashed.lineTo(x1, y1);
        }
        dashed.stroke();
        container.addChild(dashed);

        // cost label
        const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        const cost = 5 + 2 * length;
        const midX = (aw.worldX + bw.worldX) / 2;
        const midY = (aw.worldY + bw.worldY) / 2;
        const txt = new PIXI.Text({ text: `cost: ${cost}c`, style: new PIXI.TextStyle({ fontSize: 11, fill: 0x0f172a, fontFamily: 'ui-sans-serif, system-ui', stroke: { color: 0xffffff, width: 3 } }) });
        txt.anchor.set(0.5, 0.5);
        txt.position.set(midX, midY - 8);
        txt.zIndex = 315;
        container.addChild(txt);
      }
    }

    // Draft handles: pulse ring on endpoints
    const drawHandle = (gx: number, gy: number) => {
      const p = gridToWorld(gx, gy, tileWidth, tileHeight);
      const ring = new PIXI.Graphics();
      ring.zIndex = 355;
      ring.position.set(p.worldX, p.worldY);
      ring.setStrokeStyle({ width: 2, color: 0x0891b2, alpha: 0.9 });
      const r = Math.max(6, Math.round(tileHeight * 0.28));
      ring.drawEllipse(0, 0, r, r * 0.6);
      ring.stroke();
      container.addChild(ring);
    };
    if (draftFromId) {
      const a = byId.get(draftFromId);
      if (a) drawHandle(a.x, a.y);
    }
    if (draftToId) {
      const b = byId.get(draftToId);
      if (b) drawHandle(b.x, b.y);
    }
  }, [JSON.stringify(routes), JSON.stringify(buildings), tileWidth, tileHeight]);

  return null;
}

export type { RoutesLayerProps };
