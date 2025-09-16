"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import type { ParticleGraphic } from "./AmbientLayer.types";

interface AmbientLayerProps {
  tileTypes: string[][];
  tileWidth?: number;
  tileHeight?: number;
}

export default function AmbientLayer({ tileTypes, tileWidth = 64, tileHeight = 32 }: AmbientLayerProps) {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const particlesRef = useRef<ParticleGraphic[]>([]);
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
          const baseGraphic = new PIXI.Graphics();
          baseGraphic.position.set(p.wx, p.wy);
          baseGraphic.zIndex = 990;
          let vy: number;
          let fade: number;
          if (pick.type === 'water') {
            baseGraphic.beginFill(0x93c5fd, 0.4);
            baseGraphic.drawCircle(0, 0, 1.5);
            baseGraphic.endFill();
            vy = -0.08;
            fade = 0.007;
          } else {
            baseGraphic.beginFill(0x65a30d, 0.35);
            baseGraphic.drawCircle(0, 0, 1.8);
            baseGraphic.endFill();
            vy = -0.05;
            fade = 0.005;
          }
          const particle: ParticleGraphic = Object.assign(baseGraphic, { vy, fade });
          container.addChild(particle);
          particlesRef.current.push(particle);
        }
      }

      // Animate particles
      particlesRef.current.forEach((particle) => {
        particle.y += particle.vy;
        particle.alpha = Math.max(0, particle.alpha - particle.fade);
      });
      // Cleanup faded
      particlesRef.current = particlesRef.current.filter((particle) => {
        if (particle.alpha <= 0.02) {
          if (particle.parent) particle.parent.removeChild(particle);
          particle.destroy();
          return false;
        }
        return true;
      });
    };

    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
      particlesRef.current.forEach((particle) => {
        if (particle.parent) particle.parent.removeChild(particle);
        particle.destroy();
      });
      particlesRef.current = [];
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
    };
  }, [app, viewport, tileTypes.length]);

  return null;
}

export type { AmbientLayerProps };
