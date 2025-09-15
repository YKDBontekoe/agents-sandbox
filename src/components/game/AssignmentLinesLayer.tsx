"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

export type AssignLine = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  createdAt: number;
  ttl: number;
};

interface AssignmentLinesLayerProps {
  lines: AssignLine[];
  tileWidth?: number;
  tileHeight?: number;
}

export default function AssignmentLinesLayer({ lines, tileWidth = 64, tileHeight = 32 }: AssignmentLinesLayerProps) {
  const { viewport, app } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'assignment-lines';
    container.sortableChildren = true;
    container.zIndex = 700;
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
    const now = performance.now();
    lines.forEach((ln) => {
      const age = now - ln.createdAt;
      if (age > ln.ttl) return;
      const a = gridToWorld(ln.from.x, ln.from.y, tileWidth, tileHeight);
      const b = gridToWorld(ln.to.x, ln.to.y, tileWidth, tileHeight);
      const t = Math.max(0, 1 - age / ln.ttl);
      const g = new PIXI.Graphics();
      g.zIndex = 705;
      g.lineStyle(2, 0x22c55e, 0.3 + 0.7 * t);
      g.moveTo(a.worldX, a.worldY - 10);
      g.lineTo(b.worldX, b.worldY - 10);
      container.addChild(g);
    });
    // schedule fade updates
    const tick = () => {
      if (!containerRef.current) return;
      containerRef.current.removeChildren();
      const now2 = performance.now();
      lines.forEach((ln) => {
        const age2 = now2 - ln.createdAt;
        if (age2 > ln.ttl) return;
        const a = gridToWorld(ln.from.x, ln.from.y, tileWidth, tileHeight);
        const b = gridToWorld(ln.to.x, ln.to.y, tileWidth, tileHeight);
        const t2 = Math.max(0, 1 - age2 / ln.ttl);
        const g2 = new PIXI.Graphics();
        g2.zIndex = 705;
        g2.lineStyle(2, 0x22c55e, 0.3 + 0.7 * t2);
        g2.moveTo(a.worldX, a.worldY - 10);
        g2.lineTo(b.worldX, b.worldY - 10);
        if (containerRef.current) containerRef.current.addChild(g2);
      });
      if (app && !isAnimatingRef.current) {
        isAnimatingRef.current = true;
        app.ticker.add(tick);
      }
    };
    if (app && lines.length > 0) {
      tick();
    }
    return () => {
      if (app && isAnimatingRef.current) {
        app.ticker.remove(tick);
        isAnimatingRef.current = false;
      }
    };
  }, [JSON.stringify(lines), tileWidth, tileHeight]);

  return null;
}

export type { AssignmentLinesLayerProps };

