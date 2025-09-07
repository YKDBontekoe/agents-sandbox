"use client";

import { useCallback, useEffect } from "react";
import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";
import { DayNightCycle } from "./types";

interface UseDayNightCycleOptions {
  gameTime: { hour: number; minute: number };
  buildings: Array<{ x: number; y: number; workers?: number }>;
  overlay: PIXI.Graphics | null;
  enable: boolean;
  tileWidth: number;
  tileHeight: number;
}

export function useDayNightCycle({
  gameTime,
  buildings,
  overlay,
  enable,
  tileWidth,
  tileHeight,
}: UseDayNightCycleOptions) {
  const calculateDayNightCycle = (time: { hour: number; minute: number }): DayNightCycle => {
    const totalMinutes = time.hour * 60 + time.minute;
    let timeOfDay: DayNightCycle["timeOfDay"];
    let lightingIntensity: number;
    let ambientColor: number;
    let shadowLength: number;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const smoothstep = (t: number) => t * t * (3 - 2 * t);

    if (totalMinutes < 300) {
      timeOfDay = "night";
      lightingIntensity = 0.15;
      ambientColor = 0x0f0f23;
      shadowLength = 0.2;
    } else if (totalMinutes < 420) {
      timeOfDay = "dawn";
      const t = smoothstep((totalMinutes - 300) / 120);
      lightingIntensity = lerp(0.15, 0.6, t);
      ambientColor = totalMinutes < 360 ? 0x2d1b69 : 0xff6b35;
      shadowLength = lerp(0.2, 0.9, t);
    } else if (totalMinutes < 600) {
      timeOfDay = "morning";
      const t = smoothstep((totalMinutes - 420) / 180);
      lightingIntensity = lerp(0.6, 0.9, t);
      ambientColor = 0xffd700;
      shadowLength = lerp(0.9, 0.6, t);
    } else if (totalMinutes < 900) {
      timeOfDay = "midday";
      const t = Math.abs((totalMinutes - 750) / 150);
      lightingIntensity = lerp(0.9, 1.0, 1 - t);
      ambientColor = 0xffffff;
      shadowLength = lerp(0.6, 0.1, 1 - t);
    } else if (totalMinutes < 1080) {
      timeOfDay = "afternoon";
      const t = smoothstep((totalMinutes - 900) / 180);
      lightingIntensity = lerp(1.0, 0.7, t);
      ambientColor = totalMinutes > 1020 ? 0xffa500 : 0xffffff;
      shadowLength = lerp(0.1, 0.6, t);
    } else if (totalMinutes < 1260) {
      timeOfDay = "evening";
      const t = smoothstep((totalMinutes - 1080) / 180);
      lightingIntensity = lerp(0.7, 0.25, t);
      ambientColor = totalMinutes < 1200 ? 0xff4500 : 0x4a148c;
      shadowLength = lerp(0.6, 0.8, t);
    } else {
      timeOfDay = "night";
      const t = smoothstep((totalMinutes - 1260) / 180);
      lightingIntensity = lerp(0.25, 0.15, t);
      ambientColor = 0x191970;
      shadowLength = lerp(0.8, 0.2, t);
    }

    return {
      timeOfDay,
      hour: time.hour,
      minute: time.minute,
      lightingIntensity,
      ambientColor,
      shadowLength,
    };
  };

  const updateOverlay = useCallback(
    (cycle: DayNightCycle) => {
      if (!overlay) return;
      overlay.removeChildren();
      overlay.clear();

      const alpha = 1 - cycle.lightingIntensity;
      if (alpha > 0.1) {
        overlay.rect(-2000, -2000, 4000, 4000);
        overlay.fill(cycle.ambientColor);
        overlay.alpha = alpha * 0.4;
      }

      if (cycle.timeOfDay === "night" || cycle.timeOfDay === "evening") {
        buildings.forEach(b => {
          if ((b.workers || 0) > 0) {
            const { worldX, worldY } = gridToWorld(b.x, b.y, tileWidth, tileHeight);
            const light = new PIXI.Graphics();
            light.circle(0, 0, 8 + Math.random() * 4);
            light.fill(0xffd700);
            light.alpha = 0.3 + Math.random() * 0.2;
            light.x = worldX;
            light.y = worldY - 5;
            overlay.addChild(light);
            if (Math.random() < 0.1) {
              light.alpha *= 0.7;
            }
          }
        });
      }

      if (cycle.timeOfDay === "night") {
        for (let i = 0; i < 20; i++) {
          const star = new PIXI.Graphics();
          star.circle(0, 0, 0.5 + Math.random() * 0.5);
          star.fill(0xffffff);
          star.alpha = 0.6 + Math.random() * 0.4;
          star.x = -1000 + Math.random() * 2000;
          star.y = -1000 + Math.random() * 500;
          overlay.addChild(star);
        }
      } else if (cycle.timeOfDay === "dawn" || cycle.timeOfDay === "evening") {
        const glow = new PIXI.Graphics();
        glow.rect(-2000, -1000, 4000, 500);
        glow.fill(cycle.ambientColor);
        glow.alpha = 0.2;
        overlay.addChild(glow);
      }
    },
    [overlay, buildings, tileWidth, tileHeight],
  );

  const cycle = calculateDayNightCycle(gameTime);

  useEffect(() => {
    if (!enable) return;
    updateOverlay(cycle);
  }, [cycle, enable, updateOverlay]);

  return cycle;
}
