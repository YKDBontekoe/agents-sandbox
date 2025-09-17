"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "../GameContext";
import { Citizen } from "./types";

interface CitizensRendererProps {
  citizens: Citizen[];
  toWorld: (gx: number, gy: number) => { worldX: number; worldY: number };
}

export default function CitizensRenderer({ citizens, toWorld }: CitizensRendererProps) {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!app || !viewport) return;
    const container = new PIXI.Container();
    container.name = "citizens-layer";
    container.sortableChildren = true;
    container.zIndex = 550;
    viewport.addChild(container);
    containerRef.current = container;

    const tick = () => {
      const frameTime = app.ticker?.lastTime ?? performance.now();
      citizens.forEach((c) => {
        if (!c.sprite) {
          const s = new PIXI.Graphics();
          s.zIndex = 555;
          s.beginFill(0x1d4ed8, 0.95);
          s.drawCircle(0, 0, 2.2);
          s.endFill();
          container.addChild(s);
          c.sprite = s;
          const { worldX, worldY } = toWorld(c.x, c.y);
          s.position.set(worldX, worldY - 4);
          c.baseWorldY = worldY - 4;
        }
        const g = c.sprite as PIXI.Graphics & { tint: number };
        let tint = 0xffffff;
        switch (c.activity) {
          case "CommuteToWork":
            tint = 0x60a5fa;
            break;
          case "Work":
            tint = 0x34d399;
            break;
          case "CommuteToShop":
            tint = 0xf472b6;
            break;
          case "Shop":
            tint = 0xf59e0b;
            break;
          case "CommuteHome":
            tint = 0xa78bfa;
            break;
          case "Sleep":
            tint = 0x94a3b8;
            break;
        }
        let desiredTint = tint;
        if (c.carrying === "grain") desiredTint = 0x22c55e;
        else if (c.carrying === "wood") desiredTint = 0xb45309;
        else if (c.carrying === "planks") desiredTint = 0xf59e0b;

        if (g.tint !== desiredTint) {
          g.tint = desiredTint;
        }

        const { worldX } = toWorld(c.x, c.y);
        c.sprite.position.set(worldX, c.baseWorldY);
        const off = Math.sin(frameTime / 240 + c.x * 7 + c.y * 11) * 0.2;
        c.sprite.y = c.baseWorldY + off;
      });
    };

    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
      citizens.forEach((c) => {
        if (c.sprite && c.sprite.parent) c.sprite.parent.removeChild(c.sprite);
        c.sprite?.destroy();
      });
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
    };
  }, [app, viewport, citizens, toWorld]);

  return null;
}

