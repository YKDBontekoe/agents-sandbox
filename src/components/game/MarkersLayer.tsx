"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";

export interface Marker {
  id: string;
  gridX: number;
  gridY: number;
  color?: number;
  label?: string;
}

interface MarkersLayerProps {
  markers: Marker[];
  tileWidth?: number;
  tileHeight?: number;
}

export default function MarkersLayer({ markers, tileWidth = 64, tileHeight = 32 }: MarkersLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);

  const gridToWorld = (gx: number, gy: number) => {
    const wx = (gx - gy) * (tileWidth / 2);
    const wy = (gx + gy) * (tileHeight / 2);
    return { wx, wy };
  };

  useEffect(() => {
    if (!viewport) return;

    // Create container or reuse
    let container = containerRef.current;
    if (!container) {
      container = new PIXI.Container();
      container.name = 'markers-layer';
      viewport.addChild(container);
      containerRef.current = container;
    }

    // Rebuild markers
    container.removeChildren();
    for (const m of markers) {
      const { wx, wy } = gridToWorld(m.gridX, m.gridY);
      const g = new PIXI.Graphics();
      const color = m.color ?? 0x2563eb; // indigo default
      g.position.set(wx, wy);
      // pin: small diamond + mast
      g.lineStyle(2, color, 0.9);
      g.beginFill(color, 0.15);
      g.drawPolygon([
        0, -10,
        8, 0,
        0, 10,
        -8, 0,
      ]);
      g.endFill();
      g.moveTo(0, -14);
      g.lineTo(0, -28);
      container.addChild(g);

      if (m.label) {
        const t = new PIXI.Text({ text: m.label, style: { fill: 0x334155, fontSize: 11, fontWeight: '600' } });
        t.anchor.set(0.5, 1);
        t.position.set(wx, wy - 30);
        container.addChild(t);
      }
    }

    return () => {
      // Do not destroy the container on each update; it belongs to the viewport lifecycle
    };
  }, [viewport, JSON.stringify(markers)]);

  useEffect(() => {
    return () => {
      if (containerRef.current && containerRef.current.parent) {
        containerRef.current.parent.removeChild(containerRef.current);
        containerRef.current.destroy({ children: true });
      }
      containerRef.current = null;
    };
  }, []);

  return null;
}

export type { MarkersLayerProps };
