"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";

interface AmbientLayerProps {
  tileTypes: string[][];
  tileWidth?: number;
  tileHeight?: number;
}

export default function AmbientLayer({ tileTypes, tileWidth = 64, tileHeight = 32 }: AmbientLayerProps) {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const particlesRef = useRef<PIXI.Graphics[]>([]);
  const tRef = useRef(0);

  const gridToWorld = (gx: number, gy: number) => {
    const wx = (gx - gy) * (tileWidth / 2);
    const wy = (gx + gy) * (tileHeight / 2);
    return { wx, wy };
  };

  useEffect(() => {
    if (!app || !viewport) return;
    const container = new PIXI.Container();
    container.name = 'ambient-layer';
    viewport.addChild(container);
    containerRef.current = container;

    const tick = (ticker: PIXI.Ticker) => {
      tRef.current += ticker.deltaMS;
      const t = tRef.current;
      // Every ~500ms, spawn a particle over a random visible water/forest tile
      if (t % 500 < 16) {
        const bounds = viewport.getVisibleBounds();
        const visibleTiles: { gx: number; gy: number; type: string }[] = [];
        for (let y = 0; y < tileTypes.length; y++) {
          for (let x = 0; x < (tileTypes[y]?.length || 0); x++) {
            const tt = tileTypes[y][x];
            if (tt !== 'water' && tt !== 'forest') continue;
            const p = gridToWorld(x, y);
            if (p.wx >= bounds.x - 64 && p.wx <= bounds.x + bounds.width + 64 && p.wy >= bounds.y - 64 && p.wy <= bounds.y + bounds.height + 64) {
              visibleTiles.push({ gx: x, gy: y, type: tt });
            }
          }
        }
        if (visibleTiles.length) {
          const pick = visibleTiles[Math.floor(Math.random() * visibleTiles.length)];
          const p = gridToWorld(pick.gx, pick.gy);
          const g = new PIXI.Graphics();
          g.position.set(p.wx, p.wy);
          g.zIndex = 990;
          if (pick.type === 'water') {
            g.beginFill(0x93c5fd, 0.4);
            g.drawCircle(0, 0, 1.5);
            g.endFill();
            (g as any).__vy = -0.08;
            (g as any).__fade = 0.007;
          } else {
            g.beginFill(0x65a30d, 0.35);
            g.drawCircle(0, 0, 1.8);
            g.endFill();
            (g as any).__vy = -0.05;
            (g as any).__fade = 0.005;
          }
          container.addChild(g);
          particlesRef.current.push(g);
        }
      }

      // Animate particles
      particlesRef.current.forEach((g) => {
        g.y += (g as any).__vy;
        g.alpha = Math.max(0, g.alpha - (g as any).__fade);
      });
      // Cleanup faded
      particlesRef.current = particlesRef.current.filter((g) => {
        if (g.alpha <= 0.02) {
          if (g.parent) g.parent.removeChild(g);
          g.destroy();
          return false;
        }
        return true;
      });
    };

    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
      particlesRef.current.forEach(g => { if (g.parent) g.parent.removeChild(g); g.destroy(); });
      particlesRef.current = [];
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
    };
  }, [app, viewport, tileTypes.length]);

  return null;
}

export type { AmbientLayerProps };
