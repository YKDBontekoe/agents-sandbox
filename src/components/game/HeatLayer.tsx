"use client";

import { useEffect, useRef, useMemo } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";

interface HeatLayerProps {
  gridSize: number;
  tileWidth?: number;
  tileHeight?: number;
  unrest: number;  // 0..100+
  threat: number;  // 0..100+
}

export default function HeatLayer({ gridSize, tileWidth = 64, tileHeight = 32, unrest, threat }: HeatLayerProps) {
  const { viewport } = useGameContext();
  const layerRef = useRef<PIXI.Container | null>(null);

  const gridToWorld = (gx: number, gy: number) => {
    const wx = (gx - gy) * (tileWidth / 2);
    const wy = (gx + gy) * (tileHeight / 2);
    return { wx, wy };
  };

  // Memoize alpha calculations to prevent unnecessary re-renders
  const { unrestAlpha, threatAlpha, shouldRender } = useMemo(() => {
    const unrestAlpha = Math.min(Math.max(unrest, 0), 100) / 100 * 0.12;
    const threatAlpha = Math.min(Math.max(threat, 0), 100) / 100 * 0.12;
    const shouldRender = unrestAlpha > 0.01 || threatAlpha > 0.01;
    return { unrestAlpha, threatAlpha, shouldRender };
  }, [unrest, threat]);

  useEffect(() => {
    if (!viewport || !shouldRender) {
      // Hide layer if no heat to display
      if (layerRef.current) {
        layerRef.current.visible = false;
      }
      return;
    }

    // Create or reuse container
    let layer = layerRef.current;
    if (!layer) {
      layer = new PIXI.Container();
      layer.name = 'heat-layer';
      viewport.addChild(layer);
      layerRef.current = layer;
    }
    layer.visible = true;
    layer.removeChildren();

    // Draw per-tile semi-transparent overlays
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const { wx, wy } = gridToWorld(gx, gy);
        const g = new PIXI.Graphics();
        g.position.set(wx, wy);
        let drawn = false;

        // Unrest (red)
        if (unrestAlpha > 0.01) {
          g.beginFill(0xef4444, unrestAlpha);
          g.drawPolygon([
            0, -tileHeight / 2,
            tileWidth / 2, 0,
            0, tileHeight / 2,
            -tileWidth / 2, 0,
          ]);
          g.endFill();
          drawn = true;
        }
        // Threat (indigo overlay)
        if (threatAlpha > 0.01) {
          g.beginFill(0x6366f1, threatAlpha);
          g.drawPolygon([
            0, -tileHeight / 2,
            tileWidth / 2, 0,
            0, tileHeight / 2,
            -tileWidth / 2, 0,
          ]);
          g.endFill();
          drawn = true;
        }

        if (drawn) {
          layer.addChild(g);
        } else {
          g.destroy();
        }
      }
    }

    return () => {
      // keep layer; contents get rebuilt on prop change
    };
  }, [viewport, gridSize, tileWidth, tileHeight, unrestAlpha, threatAlpha, shouldRender, gridToWorld]);

  useEffect(() => {
    return () => {
      if (layerRef.current && layerRef.current.parent) {
        layerRef.current.parent.removeChild(layerRef.current);
        layerRef.current.destroy({ children: true });
      }
      layerRef.current = null;
    };
  }, []);

  return null;
}

export type { HeatLayerProps };
