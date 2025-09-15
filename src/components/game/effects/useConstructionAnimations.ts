"use client";

import { useCallback, useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";
import { ConstructionAnimation } from "./types";

interface ConstructionEvent {
  id: string;
  buildingId: string;
  position: { x: number; y: number };
  type: ConstructionAnimation["type"];
}

interface UseConstructionAnimationsOptions {
  buildings: Array<{ id: string; x: number; y: number; workers?: number }>;
  events: ConstructionEvent[];
  enable: boolean;
  particleSystem: PIXI.Container | null;
  tileWidth: number;
  tileHeight: number;
  app?: PIXI.Application | null;
}

export function useConstructionAnimations({
  buildings,
  events,
  enable,
  particleSystem,
  tileWidth,
  tileHeight,
  app,
}: UseConstructionAnimationsOptions) {
  const animations = useRef<Map<string, ConstructionAnimation>>(new Map());
  const isAnimating = useRef<boolean>(false);

  const createConstructionAnimation = useCallback(
    (
      buildingId: string,
      position: { x: number; y: number },
      type: ConstructionAnimation["type"],
    ) => {
      if (!particleSystem) return;
      const id = `construction_${buildingId}_${Date.now()}`;
      if (animations.current.has(id)) return;

    const { worldX, worldY } = gridToWorld(position.x, position.y, tileWidth, tileHeight);

    const dust: PIXI.Graphics[] = [];
    for (let i = 0; i < 8; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, 1 + Math.random());
      particle.fill(0x8b7355);
      particle.alpha = 0.6;
      particle.x = worldX + (Math.random() - 0.5) * 20;
      particle.y = worldY + (Math.random() - 0.5) * 20;
      particleSystem.addChild(particle);
      dust.push(particle);
    }

    const sparks: PIXI.Graphics[] = [];
    if (type === "building" || type === "upgrading") {
      for (let i = 0; i < 5; i++) {
        const spark = new PIXI.Graphics();
        spark.circle(0, 0, 0.5);
        spark.fill(0xffd700);
        spark.alpha = 0.9;
        spark.x = worldX + (Math.random() - 0.5) * 15;
        spark.y = worldY + (Math.random() - 0.5) * 15;
        particleSystem.addChild(spark);
        sparks.push(spark);
      }
    }

    const machinery = new PIXI.Graphics();
    machinery.rect(-3, -3, 6, 6);
    machinery.fill(0x64748b);
    machinery.alpha = 0.8;
    machinery.x = worldX;
    machinery.y = worldY - 10;
    particleSystem.addChild(machinery);

    const workers: PIXI.Graphics[] = [];
    const workerCount = Math.floor(1 + Math.random() * 3);
    for (let i = 0; i < workerCount; i++) {
      const worker = new PIXI.Graphics();
      worker.circle(0, 0, 1.5);
      worker.fill(0x1d4ed8);
      worker.alpha = 0.8;
      worker.x = worldX + (Math.random() - 0.5) * 25;
      worker.y = worldY + (Math.random() - 0.5) * 25;
      particleSystem.addChild(worker);
      workers.push(worker);
    }

      animations.current.set(id, {
        id,
        buildingId,
        position,
        type,
        progress: 0,
        effects: { dust, sparks, machinery, workers },
        duration: 5000 + Math.random() * 5000,
        startTime: Date.now(),
      });
    },
    [particleSystem, tileWidth, tileHeight],
  );

  const animate = useCallback(() => {
    const now = Date.now();
    animations.current.forEach((anim, key) => {
      const elapsed = now - anim.startTime;
      const p = elapsed / anim.duration;
      anim.progress = p;
      if (p >= 1) {
        [...anim.effects.dust, ...anim.effects.sparks, anim.effects.machinery, ...anim.effects.workers].forEach(el => {
          if (!el) return;
          el.parent?.removeChild(el);
          el.destroy();
        });
        animations.current.delete(key);
        return;
      }

      anim.effects.dust.forEach(d => {
        d.y -= 0.5;
        d.alpha = Math.max(0, 0.6 - p);
      });
      anim.effects.sparks.forEach(s => {
        s.x += (Math.random() - 0.5) * 2;
        s.y += (Math.random() - 0.5) * 2;
        s.alpha = Math.max(0, 0.9 - p * 1.5);
      });
      if (anim.effects.machinery) {
        anim.effects.machinery.rotation += 0.1;
        anim.effects.machinery.alpha = 0.8 - p * 0.3;
      }
      anim.effects.workers.forEach((w, i) => {
        w.x += Math.sin(now * 0.005 + i) * 0.5;
        w.y += Math.cos(now * 0.005 + i) * 0.5;
      });
    });

    // Use PIXI ticker instead of requestAnimationFrame
    if (app?.ticker && !isAnimating.current) {
      isAnimating.current = true;
      app.ticker.add(animate);
    }
  }, [app]);

  useEffect(() => {
    if (!enable || !particleSystem) return;

    buildings.forEach(b => {
      if ((b.workers || 0) > 0 && Math.random() < 0.05) {
        createConstructionAnimation(b.id, b, "upgrading");
      }
    });

    events.forEach(ev => {
      if (!animations.current.has(ev.id)) {
        createConstructionAnimation(ev.buildingId, ev.position, ev.type);
      }
    });

    if (!isAnimating.current && app?.ticker) {
      isAnimating.current = true;
      app.ticker.add(animate);
    }

    return () => {
      if (isAnimating.current && app?.ticker) {
        app.ticker.remove(animate);
        isAnimating.current = false;
      }
    };
  }, [buildings, events, enable, particleSystem, createConstructionAnimation, animate]);

  return { createConstructionAnimation };
}
