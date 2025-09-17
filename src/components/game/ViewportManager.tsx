"use client";

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";
import { useViewportSetup, type UseViewportSetupOptions } from "@/hooks/useViewportSetup";
import {
  useViewportPerformanceMonitor,
  type UseViewportPerformanceMonitorOptions,
  type PerformanceMonitorLogger,
} from "@/hooks/useViewportPerformanceMonitor";
import {
  createViewportChangeWatcher,
  type ViewportBounds,
  type ViewportChangeWatcherOptions,
} from "./viewport/viewportChangeWatcher";

interface ViewportManagerProps {
  children?: ReactNode;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  worldWidth?: number;
  worldHeight?: number;
  onViewportChange?: (bounds: ViewportBounds, scale: number) => void;
  viewportSetup?: Partial<Omit<UseViewportSetupOptions, "viewport">>;
  viewportWatcher?: Partial<Omit<ViewportChangeWatcherOptions, "viewport" | "onChange">>;
  performanceMonitor?: Partial<Omit<UseViewportPerformanceMonitorOptions, "ticker">>;
}

export default function ViewportManager({
  children,
  initialZoom = 1.0,
  minZoom = 0.1,
  maxZoom = 4.0,
  worldWidth = 10000,
  worldHeight = 10000,
  onViewportChange,
  viewportSetup,
  viewportWatcher,
  performanceMonitor,
}: ViewportManagerProps) {
  const { viewport, app } = useGameContext();

  const setupConfig = useMemo<Omit<UseViewportSetupOptions, "viewport">>(() => {
    const defaultSetup: Omit<UseViewportSetupOptions, "viewport"> = {
      zoom: { value: initialZoom, animate: true },
      center: { x: 0, y: 0 },
      clamp: {
        left: -worldWidth / 2,
        top: -worldHeight / 2,
        right: worldWidth / 2,
        bottom: worldHeight / 2,
      },
      clampZoom: {
        minScale: minZoom,
        maxScale: maxZoom,
      },
      drag: { mouseButtons: "left" },
      pinch: true,
      wheel: { smooth: 3 },
      decelerate: { friction: 0.88 },
    };

    return {
      ...defaultSetup,
      ...viewportSetup,
    };
  }, [initialZoom, minZoom, maxZoom, worldWidth, worldHeight, viewportSetup]);

  useViewportSetup({
    viewport,
    ...setupConfig,
  });

  useEffect(() => {
    if (!viewport) return;

    logger.debug("Viewport initialized with bounds:", {
      world: { width: worldWidth, height: worldHeight },
      zoom: { initial: initialZoom, min: minZoom, max: maxZoom },
    });
  }, [viewport, worldWidth, worldHeight, initialZoom, minZoom, maxZoom]);

  useEffect(() => {
    if (!viewport || !onViewportChange) return;

    const cleanup = createViewportChangeWatcher({
      viewport,
      onChange: onViewportChange,
      ...(viewportWatcher ?? {}),
    });

    return () => {
      cleanup();
    };
  }, [viewport, onViewportChange, viewportWatcher]);

  const monitorEnabled = performanceMonitor?.enabled ?? true;
  const monitorLogger: PerformanceMonitorLogger | undefined =
    performanceMonitor?.logger ?? { warn: (message: string) => logger.warn(message) };

  useViewportPerformanceMonitor({
    ticker: app?.ticker ?? null,
    enabled: monitorEnabled,
    monitoringInterval: performanceMonitor?.monitoringInterval,
    sampleSize: performanceMonitor?.sampleSize,
    fpsWarningThreshold: performanceMonitor?.fpsWarningThreshold,
    logger: monitorLogger,
    onSample: performanceMonitor?.onSample,
  });

  return <>{children}</>;
}

export type { ViewportManagerProps };
export type { ViewportBounds } from "./viewport/viewportChangeWatcher";
export { ViewportManager };
