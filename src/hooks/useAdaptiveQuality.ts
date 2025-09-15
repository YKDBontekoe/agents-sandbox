import { useEffect, useRef, useState } from "react";
import type { Application } from "pixi.js";
import { AdaptiveQualityManager } from "@/utils/performance/adaptiveQuality";

interface AdaptiveQualityResult {
  quality: "high" | "medium" | "low";
  fps: number;
}

/**
 * Manages adaptive quality adjustments and FPS tracking for a PIXI application.
 */
export function useAdaptiveQuality(app: Application | null): AdaptiveQualityResult {
  const managerRef = useRef<AdaptiveQualityManager | null>(null);
  const [quality, setQuality] = useState<"high" | "medium" | "low">("high");
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (!app) return;

    const manager = new AdaptiveQualityManager((newQuality) => {
      setQuality(newQuality);
      const settings = manager.getQualitySettings();
      app.renderer.resolution = settings.resolution;
      app.renderer.resize(app.canvas.width, app.canvas.height);
    });
    managerRef.current = manager;
    manager.start(app.ticker);

    let lastTime = performance.now();
    let frameCount = 0;
    const fpsMonitor = () => {
      const currentTime = performance.now();
      frameCount++;
      if (frameCount % 60 === 0) {
        setFps(Math.round(1000 / ((currentTime - lastTime) / 60)));
        lastTime = currentTime;
      }
    };
    app.ticker.add(fpsMonitor);

    return () => {
      manager.stop();
      app.ticker.remove(fpsMonitor);
      managerRef.current = null;
    };
  }, [app]);

  return { quality, fps };
}

export type { AdaptiveQualityResult };
