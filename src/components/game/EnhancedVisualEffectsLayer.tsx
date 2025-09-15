"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { useTrafficFlows } from "./effects/useTrafficFlows";
import { useConstructionAnimations } from "./effects/useConstructionAnimations";
import { useActivityIndicators } from "./effects/useActivityIndicators";
import { useDayNightCycle } from "./effects/useDayNightCycle";

interface EnhancedVisualEffectsLayerProps {
  buildings: Array<{
    id: string;
    typeId: string;
    x: number;
    y: number;
    workers?: number;
    level?: number;
  }>;
  citizens: Array<{
    id: string;
    x: number;
    y: number;
    activity: string;
    speed: number;
  }>;
  roads: Array<{ x: number; y: number }>;
  gameTime: {
    hour: number;
    minute: number;
    day: number;
  };
  cityMetrics: {
    traffic: number;
    pollution: number;
    happiness: number;
    population: number;
  };
  constructionEvents?: Array<{
    id: string;
    buildingId: string;
    position: { x: number; y: number };
    type: "building" | "upgrading" | "demolishing";
    timestamp: number;
  }>;
  tileWidth?: number;
  tileHeight?: number;
  enableParticles?: boolean;
  enableDayNight?: boolean;
  enableTraffic?: boolean;
  enableConstruction?: boolean;
}

export default function EnhancedVisualEffectsLayer({
  buildings,
  gameTime,
  cityMetrics,
  constructionEvents = [],
  tileWidth = 64,
  tileHeight = 32,
  enableParticles = true,
  enableDayNight = true,
  enableTraffic = true,
  enableConstruction = true,
}: EnhancedVisualEffectsLayerProps) {
  const { viewport, app } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const particleSystem = useRef<PIXI.Container | null>(null);
  const dayNightOverlay = useRef<PIXI.Graphics | null>(null);

  useEffect(() => {
    if (!viewport || !app) return;

    const container = new PIXI.Container();
    container.name = "enhanced-visual-effects-layer";
    container.sortableChildren = true;
    container.zIndex = 150;
    viewport.addChild(container);
    containerRef.current = container;

    if (enableParticles) {
      const particles = new PIXI.Container();
      particles.zIndex = 151;
      container.addChild(particles);
      particleSystem.current = particles;
    }

    if (enableDayNight) {
      const overlay = new PIXI.Graphics();
      overlay.zIndex = 152;
      container.addChild(overlay);
      dayNightOverlay.current = overlay;
    }

    return () => {
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      particleSystem.current = null;
      dayNightOverlay.current = null;
    };
  }, [viewport, app, enableParticles, enableDayNight]);

  useTrafficFlows({
    buildings,
    enable: enableTraffic,
    particleSystem: particleSystem.current,
    tileWidth,
    tileHeight,
    app,
  });

  useConstructionAnimations({
    buildings,
    events: constructionEvents,
    enable: enableConstruction,
    particleSystem: particleSystem.current,
    tileWidth,
    tileHeight,
    app,
  });

  useActivityIndicators({
    buildings,
    cityMetrics,
    particleSystem: particleSystem.current,
    tileWidth,
    tileHeight,
    app,
  });

  useDayNightCycle({
    gameTime,
    buildings,
    overlay: dayNightOverlay.current,
    enable: enableDayNight,
    tileWidth,
    tileHeight,
  });

  return null;
}
