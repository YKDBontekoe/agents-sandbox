"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import type {
  ParticleGraphics,
  SeasonalLayerProps,
} from "./SeasonalLayer.types";

export default function SeasonalLayer({ season }: SeasonalLayerProps) {
  const { app, viewport } = useGameContext();
  const layerRef = useRef<PIXI.Container | null>(null);
  const flakesRef = useRef<ParticleGraphics[]>([]);

  useEffect(() => {
    if (!app || !viewport) return;
    let layer = layerRef.current;
    if (!layer) {
      layer = new PIXI.Container();
      layer.name = 'seasonal-layer';
      layer.sortableChildren = true;
      viewport.addChild(layer);
      layerRef.current = layer;
    }

    // Clear previous visuals when season changes
    layer.removeChildren();
    flakesRef.current.forEach(f => { if (f.parent) f.parent.removeChild(f); f.destroy(); });
    flakesRef.current = [];

    // Minimal, tasteful effects per season
    const tick = () => {
      const bounds = viewport.getVisibleBounds();
      if (season === 'winter') {
        // Snow: spawn gently falling flakes
        if (Math.random() < 0.15) {
          const g = new PIXI.Graphics() as ParticleGraphics;
          g.beginFill(0xffffff, 0.85);
          g.drawCircle(0, 0, 1.2);
          g.endFill();
          g.position.set(bounds.x + Math.random() * bounds.width, bounds.y - 10);
          g.vy = 0.25 + Math.random() * 0.25;
          g.vx = (Math.random() - 0.5) * 0.1;
          g.fade = 0.0005;
          layer!.addChild(g);
          flakesRef.current.push(g);
        }
      } else if (season === 'autumn') {
        // Leaves: slow drifting particles
        if (Math.random() < 0.1) {
          const g = new PIXI.Graphics() as ParticleGraphics;
          g.beginFill(0xf59e0b, 0.8);
          g.drawCircle(0, 0, 1.5);
          g.endFill();
          g.position.set(bounds.x - 10, bounds.y + Math.random() * bounds.height);
          g.vy = (Math.random() - 0.5) * 0.05;
          g.vx = 0.35 + Math.random() * 0.2;
          g.fade = 0.0007;
          layer!.addChild(g);
          flakesRef.current.push(g);
        }
      } else if (season === 'spring') {
        // Pollen motes: subtle rise
        if (Math.random() < 0.08) {
          const g = new PIXI.Graphics() as ParticleGraphics;
          g.beginFill(0xa7f3d0, 0.8);
          g.drawCircle(0, 0, 1.0);
          g.endFill();
          g.position.set(bounds.x + Math.random() * bounds.width, bounds.y + bounds.height + 10);
          g.vy = -0.25 - Math.random() * 0.2;
          g.vx = (Math.random() - 0.5) * 0.08;
          g.fade = 0.0006;
          layer!.addChild(g);
          flakesRef.current.push(g);
        }
      } else {
        // Summer heat shimmer: occasional faint flicker (no particles)
      }

      // Animate
      flakesRef.current.forEach((g) => {
        g.x += g.vx;
        g.y += g.vy;
        g.alpha = Math.max(0, g.alpha - g.fade);
      });
      // Cleanup
      flakesRef.current = flakesRef.current.filter((g) => {
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
      flakesRef.current.forEach(f => { if (f.parent) f.parent.removeChild(f); f.destroy(); });
      flakesRef.current = [];
      if (layer && layer.parent) layer.parent.removeChild(layer);
      layer?.destroy({ children: true });
      layerRef.current = null;
    };
  }, [app, viewport, season]);

  return null;
}

export type { SeasonalLayerProps } from "./SeasonalLayer.types";
