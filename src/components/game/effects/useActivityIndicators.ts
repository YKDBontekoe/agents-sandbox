"use client";

import { useCallback, useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";
import { ActivityIndicator } from "./types";

interface UseActivityIndicatorsOptions {
  buildings: Array<{ id: string; x: number; y: number }>;
  cityMetrics: {
    traffic: number;
    pollution: number;
    happiness: number;
    population: number;
  };
  particleSystem: PIXI.Container | null;
  tileWidth: number;
  tileHeight: number;
}

export function useActivityIndicators({
  buildings,
  cityMetrics,
  particleSystem,
  tileWidth,
  tileHeight,
}: UseActivityIndicatorsOptions) {
  const indicators = useRef<Map<string, ActivityIndicator>>(new Map());
  const frame = useRef<number>(0);

  const createActivityIndicator = useCallback(
    (
      position: { x: number; y: number },
      type: ActivityIndicator["type"],
      value: number,
    ) => {
      if (!particleSystem) return;
      const id = `activity_${position.x}_${position.y}_${type}_${Date.now()}`;
      if (indicators.current.has(id)) return;

    const { worldX, worldY } = gridToWorld(position.x, position.y, tileWidth, tileHeight);

    const colors: Record<ActivityIndicator["type"], number> = {
      productivity: 0x10b981,
      happiness: 0xf59e0b,
      trade: 0x3b82f6,
      growth: 0x8b5cf6,
      maintenance: 0xef4444,
    };

    const icon = new PIXI.Graphics();
    icon.circle(0, 0, 3);
    icon.fill(colors[type]);
    icon.alpha = 0.8;
    icon.x = worldX;
    icon.y = worldY - 15;
    particleSystem.addChild(icon);

      indicators.current.set(id, {
        id,
        position,
        type,
        value,
        trend: value > 0.5 ? "increasing" : value < 0.3 ? "decreasing" : "stable",
        color: colors[type],
        icon,
        animation: "pulse",
        intensity: Math.abs(value - 0.5) * 2,
        duration: 4000 + Math.random() * 3000,
        startTime: Date.now(),
      });
    },
    [particleSystem, tileWidth, tileHeight],
  );

  const animate = useCallback(() => {
    const now = Date.now();
    indicators.current.forEach((indicator, key) => {
      const elapsed = now - indicator.startTime;
      const p = elapsed / indicator.duration;
      if (p >= 1) {
        indicator.icon.parent?.removeChild(indicator.icon);
        indicator.icon.destroy();
        indicators.current.delete(key);
        return;
      }

      switch (indicator.animation) {
        case "pulse":
          indicator.icon.scale.set(1 + Math.sin(now * 0.01) * 0.2 * indicator.intensity);
          break;
        case "bounce":
          indicator.icon.y += Math.sin(now * 0.02) * 2 * indicator.intensity;
          break;
        case "float":
          indicator.icon.y -= p * 20;
          indicator.icon.alpha = 1 - p;
          break;
        case "glow":
          indicator.icon.alpha = 0.5 + Math.sin(now * 0.02) * 0.5 * indicator.intensity;
          break;
        case "spin":
          indicator.icon.rotation += 0.1 * indicator.intensity;
          break;
      }
    });

    frame.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!particleSystem) return;

    if (Math.random() < 0.2) {
      const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
      if (randomBuilding) {
        const type = cityMetrics.happiness > 70
          ? "happiness"
          : cityMetrics.traffic > 50
            ? "maintenance"
            : "productivity";
        createActivityIndicator(randomBuilding, type, Math.random());
      }
    }

    if (!frame.current) {
      frame.current = requestAnimationFrame(animate);
    }

    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
    };
  }, [buildings, cityMetrics, particleSystem, createActivityIndicator, animate]);

  return { createActivityIndicator };
}
