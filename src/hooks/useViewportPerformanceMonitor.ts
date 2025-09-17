import { useEffect } from "react";
import type { Ticker } from "pixi.js";

export interface PerformanceMonitorLogger {
  warn: (message: string) => void;
}

export interface UseViewportPerformanceMonitorOptions {
  ticker: Ticker | null | undefined;
  enabled?: boolean;
  monitoringInterval?: number;
  sampleSize?: number;
  fpsWarningThreshold?: number;
  logger?: PerformanceMonitorLogger;
  onSample?: (fps: number, averageFps: number) => void;
}

const DEFAULT_MONITORING_INTERVAL = 60;
const DEFAULT_SAMPLE_SIZE = 5;
const DEFAULT_WARNING_THRESHOLD = 30;

export function useViewportPerformanceMonitor({
  ticker,
  enabled = true,
  monitoringInterval = DEFAULT_MONITORING_INTERVAL,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  fpsWarningThreshold = DEFAULT_WARNING_THRESHOLD,
  logger,
  onSample,
}: UseViewportPerformanceMonitorOptions): void {
  useEffect(() => {
    if (!enabled || !ticker) {
      return undefined;
    }

    let frameCount = 0;
    let lastTime = performance.now();
    const fpsHistory: number[] = [];

    const recordSample = (fps: number) => {
      fpsHistory.push(fps);
      if (fpsHistory.length > sampleSize) {
        fpsHistory.shift();
      }
      const total = fpsHistory.reduce((sum, value) => sum + value, 0);
      const average = fpsHistory.length > 0 ? total / fpsHistory.length : fps;
      onSample?.(fps, average);
      if (fps < fpsWarningThreshold) {
        logger?.warn(`Low FPS detected: ${fps} (avg: ${average.toFixed(1)})`);
      }
    };

    const monitorPerformance = () => {
      frameCount += 1;
      if (frameCount < monitoringInterval) {
        return;
      }

      const now = performance.now();
      const elapsed = now - lastTime;
      if (elapsed <= 0) {
        return;
      }

      const fps = Math.round((frameCount * 1000) / elapsed);
      recordSample(fps);

      frameCount = 0;
      lastTime = now;
    };

    ticker.add(monitorPerformance);

    return () => {
      ticker.remove(monitorPerformance);
    };
  }, [ticker, enabled, monitoringInterval, sampleSize, fpsWarningThreshold, logger, onSample]);
}
