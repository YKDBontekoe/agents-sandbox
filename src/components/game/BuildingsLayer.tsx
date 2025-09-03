"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

export interface SimpleBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
}

interface BuildingsLayerProps {
  buildings: SimpleBuilding[];
  tileWidth?: number;
  tileHeight?: number;
}

function drawIcon(g: PIXI.Graphics, typeId: string, tw: number, th: number) {
  g.clear();
  // subtle base shadow
  g.beginFill(0x111827, 0.08);
  g.drawPolygon([
    0, -th / 2,
    tw / 2, 0,
    0, th / 2,
    -tw / 2, 0,
  ]);
  g.endFill();

  switch (typeId) {
    case 'council_hall': {
      // stone hall with roof
      g.beginFill(0x9ca3af);
      g.drawRect(-tw * 0.22, -th * 0.05, tw * 0.44, th * 0.28);
      g.endFill();
      g.beginFill(0xb45309);
      g.moveTo(0, -th * 0.22);
      g.lineTo(tw * 0.26, -th * 0.05);
      g.lineTo(-tw * 0.26, -th * 0.05);
      g.closePath();
      g.endFill();
      break;
    }
    case 'trade_post': {
      // tent + banner
      g.beginFill(0xf59e0b);
      g.moveTo(-tw * 0.18, 0);
      g.lineTo(0, -th * 0.18);
      g.lineTo(tw * 0.18, 0);
      g.lineTo(-tw * 0.18, 0);
      g.endFill();
      g.lineStyle(2, 0x92400e, 1);
      g.moveTo(0, -th * 0.18);
      g.lineTo(0, -th * 0.32);
      g.beginFill(0x2563eb);
      g.drawPolygon([
        0, -th * 0.32,
        tw * 0.12, -th * 0.28,
        0, -th * 0.24,
      ]);
      g.endFill();
      break;
    }
    case 'automation_workshop': {
      // cog-like gear
      g.beginFill(0x6b7280);
      const r = Math.min(tw, th) * 0.18;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * (r * 1.2);
        const y = Math.sin(a) * (r * 1.2);
        g.drawRect(x - 2, y - 2, 4, 4);
      }
      g.drawCircle(0, 0, r);
      g.endFill();
      g.beginFill(0xfcd34d);
      g.drawCircle(0, 0, r * 0.35);
      g.endFill();
      break;
    }
    case 'farm': {
      g.beginFill(0x16a34a);
      g.drawRect(-tw * 0.2, -th * 0.02, tw * 0.4, th * 0.18);
      g.endFill();
      break;
    }
    case 'shrine': {
      g.beginFill(0x7c3aed);
      g.drawCircle(0, 0, Math.min(tw, th) * 0.18);
      g.endFill();
      break;
    }
    case 'house': {
      g.beginFill(0x9f1239);
      g.drawRect(-tw * 0.16, -th * 0.02, tw * 0.32, th * 0.16);
      g.endFill();
      break;
    }
    default: {
      g.beginFill(0x334155);
      g.drawCircle(0, 0, Math.min(tw, th) * 0.12);
      g.endFill();
      break;
    }
  }
}

export default function BuildingsLayer({ buildings, tileWidth = 64, tileHeight = 32 }: BuildingsLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'buildings-layer';
    container.sortableChildren = true;
    viewport.addChild(container);
    containerRef.current = container;

    return () => {
      if (container.parent) {
        container.parent.removeChild(container);
      }
      container.destroy({ children: true });
      containerRef.current = null;
    };
  }, [viewport]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.removeChildren();

    buildings.forEach((b) => {
      const { worldX, worldY } = gridToWorld(b.x, b.y, tileWidth, tileHeight);
      const g = new PIXI.Graphics();
      g.position.set(worldX, worldY);
      g.zIndex = 500; // above tiles
      drawIcon(g, b.typeId, tileWidth, tileHeight);
      container.addChild(g);
    });
  }, [JSON.stringify(buildings), tileWidth, tileHeight]);

  return null;
}

export type { BuildingsLayerProps };

