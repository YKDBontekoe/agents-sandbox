"use client";

import { useCallback, useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";
import { TrafficFlow } from "./types";

interface UseTrafficFlowsOptions {
  buildings: Array<{ id: string; x: number; y: number; workers?: number }>; 
  enable: boolean;
  particleSystem: PIXI.Container | null;
  tileWidth: number;
  tileHeight: number;
}

export function useTrafficFlows({
  buildings,
  enable,
  particleSystem,
  tileWidth,
  tileHeight,
}: UseTrafficFlowsOptions) {
  const flows = useRef<Map<string, TrafficFlow>>(new Map());
  const frame = useRef<number>(0);
  const lastTime = useRef<number>(0);

  const createTrafficFlow = useCallback(
    (
      from: { x: number; y: number },
      to: { x: number; y: number },
      type: TrafficFlow["type"],
    ) => {
      if (!particleSystem) return;
      const id = `traffic_${Date.now()}_${Math.random()}`;
      const colors: Record<TrafficFlow["type"], number> = {
        pedestrian: 0x4ade80,
        goods: 0xfbbf24,
        construction: 0xf97316,
        emergency: 0xef4444,
      };

      const particles: PIXI.Graphics[] = [];
      const count = Math.floor(3 + Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const particle = new PIXI.Graphics();
        particle.circle(0, 0, 1 + Math.random() * 2);
        particle.fill(colors[type]);
        particle.alpha = 0.8;
        particleSystem.addChild(particle);
        particles.push(particle);
      }

      flows.current.set(id, {
        id,
        from,
        to,
        intensity: 0.5 + Math.random() * 0.5,
        type,
        color: colors[type],
        speed: 0.02 + Math.random() * 0.03,
        particles,
        duration: 3000 + Math.random() * 2000,
        startTime: Date.now(),
      });
    },
    [particleSystem],
  );

  const animate = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTime.current;
    lastTime.current = now;

    flows.current.forEach((flow, id) => {
      const elapsed = now - flow.startTime;
      const progress = elapsed / flow.duration;
      if (progress >= 1) {
        flow.particles.forEach(p => {
          p.parent?.removeChild(p);
          p.destroy();
        });
        flows.current.delete(id);
        return;
      }

      const fromWorld = gridToWorld(flow.from.x, flow.from.y, tileWidth, tileHeight);
      const toWorld = gridToWorld(flow.to.x, flow.to.y, tileWidth, tileHeight);
      const dx = toWorld.worldX - fromWorld.worldX;
      const dy = toWorld.worldY - fromWorld.worldY;

      flow.particles.forEach((particle, index) => {
        const offset = (index / flow.particles.length) * flow.speed * delta;
        particle.x = fromWorld.worldX + dx * progress + offset;
        particle.y = fromWorld.worldY + dy * progress + offset;
        particle.alpha = 1 - progress;
      });
    });

    frame.current = requestAnimationFrame(animate);
  }, [tileWidth, tileHeight]);

  useEffect(() => {
    if (!enable || !particleSystem) return;

    if (Math.random() < 0.1) {
      const active = buildings.filter(b => (b.workers || 0) > 0);
      if (active.length >= 2) {
        const from = active[Math.floor(Math.random() * active.length)];
        const to = active[Math.floor(Math.random() * active.length)];
        if (from.id !== to.id) {
          createTrafficFlow(from, to, "pedestrian");
        }
      }
    }

    if (!frame.current) {
      lastTime.current = Date.now();
      frame.current = requestAnimationFrame(animate);
    }

    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
    };
  }, [buildings, enable, particleSystem, createTrafficFlow, animate]);

  return { createTrafficFlow };
}
