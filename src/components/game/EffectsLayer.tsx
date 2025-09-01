"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";

interface EffectsTrigger {
  eventKey: string;
  deltas: Record<string, number>;
  gridX?: number;
  gridY?: number;
  worldX?: number;
  worldY?: number;
}

interface EffectsLayerProps {
  trigger?: EffectsTrigger;
  tileWidth?: number;
  tileHeight?: number;
}

export default function EffectsLayer({ trigger, tileWidth = 64, tileHeight = 32 }: EffectsLayerProps) {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  // Convert grid to world coordinates (iso)
  const gridToWorld = (gx: number, gy: number) => {
    const wx = (gx - gy) * (tileWidth / 2);
    const wy = (gx + gy) * (tileHeight / 2);
    return { wx, wy };
  };

  useEffect(() => {
    if (!app || !viewport) return;
    if (!trigger) return;

    // Resolve target position
    let wx = trigger.worldX ?? 0;
    let wy = trigger.worldY ?? 0;
    if (trigger.gridX != null && trigger.gridY != null) {
      const p = gridToWorld(trigger.gridX, trigger.gridY);
      wx = p.wx; wy = p.wy;
    }

    const layer = new PIXI.Container();
    layer.name = `effects-${trigger.eventKey}`;
    viewport.addChild(layer);
    containerRef.current = layer;

    // Pulse ring
    const ring = new PIXI.Graphics();
    ring.position.set(wx, wy);
    layer.addChild(ring);

    // Delta popups
    const entries = Object.entries(trigger.deltas || {});
    const texts: PIXI.Text[] = [];
    entries.slice(0, 6).forEach(([key, val], idx) => {
      const sign = Number(val) >= 0 ? "+" : "";
      const fill = Number(val) >= 0 ? 0x059669 : 0xdc2626; // emerald/red
      const txt = new PIXI.Text({
        text: `${key}: ${sign}${val}`,
        style: {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
          fontSize: 12,
          fontWeight: "700",
          fill,
          align: "right",
        },
      });
      txt.anchor.set(0.5, 1);
      txt.position.set(wx, wy - 10 - idx * 16);
      txt.alpha = 0.0;
      layer.addChild(txt);
      texts.push(txt);
    });

    // Animation
    let t = 0; // ms
    const duration = 900;
    const textDuration = 1200;

    const tick = (ticker: PIXI.Ticker) => {
      // deltaMS provides elapsed milliseconds since last frame
      const dt = ticker.deltaMS;
      t += dt;
      const p = Math.min(1, t / duration);

      // Ring: grows and fades
      const radius = 8 + p * 26;
      const alpha = 0.35 * (1 - p);
      ring.clear();
      ring.lineStyle(2, 0x22c55e, alpha);
      ring.drawCircle(0, 0, radius);

      // Texts: fade in and float
      const tp = Math.min(1, t / textDuration);
      texts.forEach((txt, i) => {
        txt.alpha = Math.min(1, tp * 1.2);
        txt.y = wy - 10 - i * 16 - tp * 8;
      });

      if (t >= Math.max(duration, textDuration)) {
        app.ticker.remove(tick);
        // cleanup later to allow final frame
        setTimeout(() => {
          if (layer.parent) layer.parent.removeChild(layer);
          layer.destroy({ children: true });
        }, 0);
      }
    };

    app.ticker.add(tick);
    cleanupRef.current = () => {
      app.ticker.remove(tick);
      if (layer.parent) layer.parent.removeChild(layer);
      layer.destroy({ children: true });
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [app, viewport, trigger?.eventKey]);

  return null;
}

export type { EffectsLayerProps, EffectsTrigger };
