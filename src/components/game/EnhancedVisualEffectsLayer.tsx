"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";

interface TrafficFlow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number; // 0-1
  type: 'pedestrian' | 'goods' | 'construction' | 'emergency';
  color: number;
  speed: number;
  particles: PIXI.Graphics[];
  duration: number;
  startTime: number;
}

interface ConstructionAnimation {
  id: string;
  buildingId: string;
  position: { x: number; y: number };
  type: 'building' | 'upgrading' | 'repairing' | 'demolishing';
  progress: number; // 0-1
  effects: {
    dust: PIXI.Graphics[];
    sparks: PIXI.Graphics[];
    machinery: PIXI.Graphics | null;
    workers: PIXI.Graphics[];
  };
  duration: number;
  startTime: number;
}

interface ActivityIndicator {
  id: string;
  position: { x: number; y: number };
  type: 'productivity' | 'happiness' | 'trade' | 'growth' | 'maintenance';
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  color: number;
  icon: PIXI.Graphics;
  animation: 'pulse' | 'bounce' | 'glow' | 'float' | 'spin';
  intensity: number; // 0-1
  duration: number;
  startTime: number;
}

interface DayNightCycle {
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  hour: number;
  minute: number;
  lightingIntensity: number; // 0-1
  ambientColor: number;
  shadowLength: number;
}

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
    type: 'building' | 'upgrading' | 'demolishing';
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
  citizens,
  roads,
  gameTime,
  cityMetrics,
  constructionEvents = [],
  tileWidth = 64,
  tileHeight = 32,
  enableParticles = true,
  enableDayNight = true,
  enableTraffic = true,
  enableConstruction = true
}: EnhancedVisualEffectsLayerProps) {
  const { viewport, app } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const trafficFlows = useRef<Map<string, TrafficFlow>>(new Map());
  const constructionAnimations = useRef<Map<string, ConstructionAnimation>>(new Map());
  const activityIndicators = useRef<Map<string, ActivityIndicator>>(new Map());
  const dayNightOverlay = useRef<PIXI.Graphics | null>(null);
  const particleSystem = useRef<PIXI.Container | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);

  // Initialize the effects layer
  useEffect(() => {
    if (!viewport || !app) return;

    const container = new PIXI.Container();
    container.name = 'enhanced-visual-effects-layer';
    container.sortableChildren = true;
    container.zIndex = 150; // Above buildings (100) but below UI (200+)
    viewport.addChild(container);
    containerRef.current = container;

    // Create particle system
    if (enableParticles) {
      const particles = new PIXI.Container();
      particles.zIndex = 151; // Particles above base effects
      container.addChild(particles);
      particleSystem.current = particles;
    }

    // Create day/night overlay
    if (enableDayNight) {
      const overlay = new PIXI.Graphics();
      overlay.zIndex = 152; // Day/night overlay on top of particles
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

  // Calculate day/night cycle with smooth transitions
  const calculateDayNightCycle = (gameTime: { hour: number; minute: number }): DayNightCycle => {
    const totalMinutes = gameTime.hour * 60 + gameTime.minute;
    let timeOfDay: DayNightCycle['timeOfDay'];
    let lightingIntensity: number;
    let ambientColor: number;
    let shadowLength: number;

    // Smooth interpolation function
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const smoothstep = (t: number) => t * t * (3 - 2 * t);

    if (totalMinutes < 300) { // 0:00 - 5:00 (Deep Night)
      timeOfDay = 'night';
      lightingIntensity = 0.15;
      ambientColor = 0x0f0f23;
      shadowLength = 0.2;
    } else if (totalMinutes < 420) { // 5:00 - 7:00 (Dawn)
      timeOfDay = 'dawn';
      const t = smoothstep((totalMinutes - 300) / 120);
      lightingIntensity = lerp(0.15, 0.6, t);
      ambientColor = totalMinutes < 360 ? 0x2d1b69 : 0xff6b35;
      shadowLength = lerp(0.2, 0.9, t);
    } else if (totalMinutes < 600) { // 7:00 - 10:00 (Morning)
      timeOfDay = 'morning';
      const t = smoothstep((totalMinutes - 420) / 180);
      lightingIntensity = lerp(0.6, 0.9, t);
      ambientColor = 0xffd700;
      shadowLength = lerp(0.9, 0.6, t);
    } else if (totalMinutes < 900) { // 10:00 - 15:00 (Midday)
      timeOfDay = 'midday';
      const t = Math.abs((totalMinutes - 750) / 150); // Peak at 12:30
      lightingIntensity = lerp(0.9, 1.0, 1 - t);
      ambientColor = 0xffffff;
      shadowLength = lerp(0.6, 0.1, 1 - t);
    } else if (totalMinutes < 1080) { // 15:00 - 18:00 (Afternoon)
      timeOfDay = 'afternoon';
      const t = smoothstep((totalMinutes - 900) / 180);
      lightingIntensity = lerp(1.0, 0.7, t);
      ambientColor = totalMinutes > 1020 ? 0xffa500 : 0xffffff;
      shadowLength = lerp(0.1, 0.6, t);
    } else if (totalMinutes < 1260) { // 18:00 - 21:00 (Evening)
      timeOfDay = 'evening';
      const t = smoothstep((totalMinutes - 1080) / 180);
      lightingIntensity = lerp(0.7, 0.25, t);
      ambientColor = totalMinutes < 1200 ? 0xff4500 : 0x4a148c;
      shadowLength = lerp(0.6, 0.8, t);
    } else { // 21:00 - 24:00 (Night)
      timeOfDay = 'night';
      const t = smoothstep((totalMinutes - 1260) / 180);
      lightingIntensity = lerp(0.25, 0.15, t);
      ambientColor = 0x191970;
      shadowLength = lerp(0.8, 0.2, t);
    }

    return {
      timeOfDay,
      hour: gameTime.hour,
      minute: gameTime.minute,
      lightingIntensity,
      ambientColor,
      shadowLength
    };
  };

  // Create traffic flow animation
  const createTrafficFlow = (from: { x: number; y: number }, to: { x: number; y: number }, type: TrafficFlow['type']) => {
    const id = `traffic_${Date.now()}_${Math.random()}`;
    const colors = {
      pedestrian: 0x4ade80,
      goods: 0xfbbf24,
      construction: 0xf97316,
      emergency: 0xef4444
    };

    const particles: PIXI.Graphics[] = [];
    const particleCount = Math.floor(3 + Math.random() * 5);

    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, 1 + Math.random() * 2);
      particle.fill(colors[type]);
      particle.alpha = 0.8;
      particles.push(particle);
      particleSystem.current?.addChild(particle);
    }

    const flow: TrafficFlow = {
      id,
      from,
      to,
      intensity: 0.5 + Math.random() * 0.5,
      type,
      color: colors[type],
      speed: 0.02 + Math.random() * 0.03,
      particles,
      duration: 3000 + Math.random() * 2000,
      startTime: Date.now()
    };

    trafficFlows.current.set(id, flow);
  };

  // Create construction animation
  const createConstructionAnimation = (buildingId: string, position: { x: number; y: number }, type: ConstructionAnimation['type']) => {
    const id = `construction_${buildingId}`;
    if (constructionAnimations.current.has(id)) return;

    const { worldX, worldY } = gridToWorld(position.x, position.y, tileWidth, tileHeight);
    
    // Create dust particles
    const dust: PIXI.Graphics[] = [];
    for (let i = 0; i < 8; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, 1 + Math.random());
      particle.fill(0x8b7355);
      particle.alpha = 0.6;
      particle.x = worldX + (Math.random() - 0.5) * 20;
      particle.y = worldY + (Math.random() - 0.5) * 20;
      dust.push(particle);
      particleSystem.current?.addChild(particle);
    }

    // Create sparks for certain types
    const sparks: PIXI.Graphics[] = [];
    if (type === 'building' || type === 'upgrading') {
      for (let i = 0; i < 5; i++) {
        const spark = new PIXI.Graphics();
        spark.circle(0, 0, 0.5);
        spark.fill(0xffd700);
        spark.alpha = 0.9;
        spark.x = worldX + (Math.random() - 0.5) * 15;
        spark.y = worldY + (Math.random() - 0.5) * 15;
        sparks.push(spark);
        particleSystem.current?.addChild(spark);
      }
    }

    // Create machinery indicator
    const machinery = new PIXI.Graphics();
    machinery.rect(-3, -3, 6, 6);
    machinery.fill(0x64748b);
    machinery.alpha = 0.8;
    machinery.x = worldX;
    machinery.y = worldY - 10;
    particleSystem.current?.addChild(machinery);

    // Create worker indicators
    const workers: PIXI.Graphics[] = [];
    const workerCount = Math.floor(1 + Math.random() * 3);
    for (let i = 0; i < workerCount; i++) {
      const worker = new PIXI.Graphics();
      worker.circle(0, 0, 1.5);
      worker.fill(0x1d4ed8);
      worker.alpha = 0.8;
      worker.x = worldX + (Math.random() - 0.5) * 25;
      worker.y = worldY + (Math.random() - 0.5) * 25;
      workers.push(worker);
      particleSystem.current?.addChild(worker);
    }

    const animation: ConstructionAnimation = {
      id,
      buildingId,
      position,
      type,
      progress: 0,
      effects: { dust, sparks, machinery, workers },
      duration: 5000 + Math.random() * 5000,
      startTime: Date.now()
    };

    constructionAnimations.current.set(id, animation);
  };

  // Create activity indicator
  const createActivityIndicator = (position: { x: number; y: number }, type: ActivityIndicator['type'], value: number) => {
    const id = `activity_${position.x}_${position.y}_${type}`;
    if (activityIndicators.current.has(id)) return;

    const { worldX, worldY } = gridToWorld(position.x, position.y, tileWidth, tileHeight);
    
    const colors = {
      productivity: 0x10b981,
      happiness: 0xf59e0b,
      trade: 0x3b82f6,
      growth: 0x8b5cf6,
      maintenance: 0xef4444
    };

    const icon = new PIXI.Graphics();
    icon.circle(0, 0, 3);
    icon.fill(colors[type]);
    icon.alpha = 0.8;
    icon.x = worldX;
    icon.y = worldY - 15;
    particleSystem.current?.addChild(icon);

    const indicator: ActivityIndicator = {
      id,
      position,
      type,
      value,
      trend: value > 0.5 ? 'increasing' : value < 0.3 ? 'decreasing' : 'stable',
      color: colors[type],
      icon,
      animation: 'pulse',
      intensity: Math.abs(value - 0.5) * 2,
      duration: 4000 + Math.random() * 3000,
      startTime: Date.now()
    };

    activityIndicators.current.set(id, indicator);
  };

  // Update day/night overlay
  const updateDayNightOverlay = (cycle: DayNightCycle) => {
    if (!dayNightOverlay.current || !viewport) return;

    const overlay = dayNightOverlay.current;
    overlay.clear();

    // Create ambient lighting overlay
    const alpha = 1 - cycle.lightingIntensity;
    if (alpha > 0.1) {
      overlay.rect(-2000, -2000, 4000, 4000);
      overlay.fill(cycle.ambientColor);
      overlay.alpha = alpha * 0.4;
    }

    // Add building lights during night/evening
    if (cycle.timeOfDay === 'night' || cycle.timeOfDay === 'evening') {
      buildings.forEach(building => {
        if ((building.workers || 0) > 0) {
          const { worldX, worldY } = gridToWorld(building.x, building.y, tileWidth, tileHeight);
          
          // Create warm building light
          const light = new PIXI.Graphics();
          light.circle(0, 0, 8 + Math.random() * 4);
          light.fill(0xffd700);
          light.alpha = 0.3 + Math.random() * 0.2;
          light.x = worldX;
          light.y = worldY - 5;
          overlay.addChild(light);
          
          // Add flickering effect
          if (Math.random() < 0.1) {
            light.alpha *= 0.7;
          }
        }
      });
    }

    // Add atmospheric particles (stars, fog, etc.)
    if (cycle.timeOfDay === 'night') {
      // Add stars
      for (let i = 0; i < 20; i++) {
        const star = new PIXI.Graphics();
        star.circle(0, 0, 0.5 + Math.random() * 0.5);
        star.fill(0xffffff);
        star.alpha = 0.6 + Math.random() * 0.4;
        star.x = -1000 + Math.random() * 2000;
        star.y = -1000 + Math.random() * 500;
        overlay.addChild(star);
      }
    } else if (cycle.timeOfDay === 'dawn' || cycle.timeOfDay === 'evening') {
      // Add atmospheric glow
      const glow = new PIXI.Graphics();
      glow.rect(-2000, -1000, 4000, 500);
      glow.fill(cycle.ambientColor);
      glow.alpha = 0.2;
      overlay.addChild(glow);
    }
  };

  // Animation loop
  const animate = () => {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastUpdateTime.current;
    lastUpdateTime.current = currentTime;

    if (!containerRef.current) return;

    // Update traffic flows
    trafficFlows.current.forEach((flow, id) => {
      const elapsed = currentTime - flow.startTime;
      const progress = elapsed / flow.duration;

      if (progress >= 1) {
        // Remove completed flow
        flow.particles.forEach(particle => {
          if (particle.parent) particle.parent.removeChild(particle);
          particle.destroy();
        });
        trafficFlows.current.delete(id);
        return;
      }

      // Animate particles along path
      const fromWorld = gridToWorld(flow.from.x, flow.from.y, tileWidth, tileHeight);
      const toWorld = gridToWorld(flow.to.x, flow.to.y, tileWidth, tileHeight);
      
      flow.particles.forEach((particle, index) => {
        const particleProgress = Math.max(0, progress - (index * 0.1));
        const x = fromWorld.worldX + (toWorld.worldX - fromWorld.worldX) * particleProgress;
        const y = fromWorld.worldY + (toWorld.worldY - fromWorld.worldY) * particleProgress;
        
        particle.x = x + Math.sin(currentTime * 0.01 + index) * 2;
        particle.y = y + Math.cos(currentTime * 0.01 + index) * 2;
        particle.alpha = Math.sin(particleProgress * Math.PI) * 0.8;
      });
    });

    // Update construction animations
    constructionAnimations.current.forEach((animation, id) => {
      const elapsed = currentTime - animation.startTime;
      const progress = elapsed / animation.duration;

      if (progress >= 1) {
        // Remove completed animation
        [...animation.effects.dust, ...animation.effects.sparks, ...animation.effects.workers].forEach(effect => {
          if (effect.parent) effect.parent.removeChild(effect);
          effect.destroy();
        });
        if (animation.effects.machinery) {
          if (animation.effects.machinery.parent) animation.effects.machinery.parent.removeChild(animation.effects.machinery);
          animation.effects.machinery.destroy();
        }
        constructionAnimations.current.delete(id);
        return;
      }

      animation.progress = progress;

      // Animate dust particles
      animation.effects.dust.forEach((dust, index) => {
        dust.y -= 0.5;
        dust.alpha = Math.max(0, 0.6 - progress);
        dust.scale.set(1 + progress * 0.5);
      });

      // Animate sparks
      animation.effects.sparks.forEach((spark, index) => {
        spark.x += (Math.random() - 0.5) * 2;
        spark.y += (Math.random() - 0.5) * 2;
        spark.alpha = Math.max(0, 0.9 - progress * 1.5);
      });

      // Animate machinery
      if (animation.effects.machinery) {
        animation.effects.machinery.rotation += 0.1;
        animation.effects.machinery.alpha = 0.8 - progress * 0.3;
      }

      // Animate workers
      animation.effects.workers.forEach((worker, index) => {
        worker.x += Math.sin(currentTime * 0.005 + index) * 0.5;
        worker.y += Math.cos(currentTime * 0.005 + index) * 0.5;
      });
    });

    // Update activity indicators
    activityIndicators.current.forEach((indicator, id) => {
      const elapsed = currentTime - indicator.startTime;
      const progress = elapsed / indicator.duration;

      if (progress >= 1) {
        // Remove completed indicator
        if (indicator.icon.parent) indicator.icon.parent.removeChild(indicator.icon);
        indicator.icon.destroy();
        activityIndicators.current.delete(id);
        return;
      }

      // Animate based on type
      switch (indicator.animation) {
        case 'pulse':
          indicator.icon.scale.set(1 + Math.sin(currentTime * 0.01) * 0.2 * indicator.intensity);
          break;
        case 'bounce':
          indicator.icon.y += Math.sin(currentTime * 0.02) * 2 * indicator.intensity;
          break;
        case 'float':
          indicator.icon.y -= progress * 20;
          indicator.icon.alpha = 1 - progress;
          break;
      }
    });

    animationFrame.current = requestAnimationFrame(animate);
  };

  // Main update effect
  useEffect(() => {
    if (!containerRef.current) return;

    // Generate traffic flows based on city activity
    if (enableTraffic && Math.random() < 0.1) {
      const activeBuildings = buildings.filter(b => (b.workers || 0) > 0);
      if (activeBuildings.length >= 2) {
        const from = activeBuildings[Math.floor(Math.random() * activeBuildings.length)];
        const to = activeBuildings[Math.floor(Math.random() * activeBuildings.length)];
        if (from.id !== to.id) {
          createTrafficFlow(from, to, 'pedestrian');
        }
      }
    }

    // Generate construction animations
    if (enableConstruction) {
      buildings.forEach(building => {
        if ((building.workers || 0) > 0 && Math.random() < 0.05) {
          createConstructionAnimation(building.id, building, 'upgrading');
        }
      });
    }

    // Generate activity indicators based on city metrics
    if (Math.random() < 0.2) {
      const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
      if (randomBuilding) {
        const indicatorType = cityMetrics.happiness > 70 ? 'happiness' : 
                             cityMetrics.traffic > 50 ? 'maintenance' : 'productivity';
        createActivityIndicator(randomBuilding, indicatorType, Math.random());
      }
    }

    // Update day/night cycle
    if (enableDayNight) {
      const cycle = calculateDayNightCycle(gameTime);
      updateDayNightOverlay(cycle);
    }

    // Start animation loop if not already running
    if (!animationFrame.current) {
      lastUpdateTime.current = Date.now();
      animate();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = 0;
      }
    };
  }, [buildings, citizens, roads, gameTime, cityMetrics, enableTraffic, enableConstruction, enableDayNight]);

  // Process construction events
  useEffect(() => {
    if (!enableConstruction || !containerRef.current) return;

    constructionEvents.forEach(event => {
      // Check if animation already exists
      if (constructionAnimations.current.has(event.id)) return;

      // Create construction animation
      createConstructionAnimation(
        event.buildingId,
        event.position,
        event.type as 'building' | 'upgrading' | 'repairing' | 'demolishing'
      );
    });
  }, [constructionEvents, enableConstruction]);

  return null; // This component only manages PIXI objects
}

export type { TrafficFlow, ConstructionAnimation, ActivityIndicator, DayNightCycle };