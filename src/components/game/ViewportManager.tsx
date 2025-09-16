"use client";

import { useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewportManagerProps {
  children?: React.ReactNode;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  worldWidth?: number;
  worldHeight?: number;
  onViewportChange?: (bounds: ViewportBounds, scale: number) => void;
}

export default function ViewportManager({
  children,
  initialZoom = 1.0,
  minZoom = 0.1,
  maxZoom = 4.0,
  worldWidth = 10000,
  worldHeight = 10000,
  onViewportChange,
}: ViewportManagerProps) {
  const { viewport, app } = useGameContext();
  const lastBoundsRef = useRef<ViewportBounds>({ x: 0, y: 0, width: 0, height: 0 });
  const lastScaleRef = useRef<number>(1);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled viewport change handler
  const handleViewportChange = useCallback(() => {
    if (!viewport || !onViewportChange) return;

    const bounds = {
      x: viewport.left,
      y: viewport.top,
      width: viewport.worldScreenWidth,
      height: viewport.worldScreenHeight
    };
    const scale = viewport.scale?.x || 1;
    const lastBounds = lastBoundsRef.current;
    const lastScale = lastScaleRef.current;

    // Check if viewport changed significantly
    const boundsChanged = 
      Math.abs(bounds.x - lastBounds.x) > 50 ||
      Math.abs(bounds.y - lastBounds.y) > 50 ||
      Math.abs(bounds.width - lastBounds.width) > 100 ||
      Math.abs(bounds.height - lastBounds.height) > 100;
    
    const scaleChanged = Math.abs(scale - lastScale) > 0.05;

    if (boundsChanged || scaleChanged) {
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Throttle updates to avoid excessive calls
      updateTimeoutRef.current = setTimeout(() => {
        onViewportChange(bounds, scale);
        lastBoundsRef.current = bounds;
        lastScaleRef.current = scale;
      }, 150);
    }
  }, [viewport, onViewportChange]);

  // Initialize viewport settings
  useEffect(() => {
    if (!viewport) return;

    // Set initial zoom and position
    viewport.setZoom(initialZoom, true);
    viewport.moveCenter(0, 0);

    // Configure viewport constraints
    viewport.clamp({
      left: -worldWidth / 2,
      top: -worldHeight / 2,
      right: worldWidth / 2,
      bottom: worldHeight / 2,
    });

    viewport.clampZoom({
      minScale: minZoom,
      maxScale: maxZoom,
    });

    // Enable smooth interactions
    viewport.drag({ mouseButtons: 'left' });
    viewport.pinch();
    viewport.wheel({ smooth: 3 });
    viewport.decelerate({ friction: 0.88 });

    logger.debug('Viewport initialized with bounds:', {
      world: { width: worldWidth, height: worldHeight },
      zoom: { initial: initialZoom, min: minZoom, max: maxZoom },
    });

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [viewport, initialZoom, minZoom, maxZoom, worldWidth, worldHeight]);

  // Set up viewport event listeners
  useEffect(() => {
    if (!viewport) return;

    viewport.on('moved', handleViewportChange);
    viewport.on('zoomed', handleViewportChange);
    viewport.on('moved-end', handleViewportChange);
    viewport.on('zoomed-end', handleViewportChange);

    // Initial viewport change call
    handleViewportChange();

    return () => {
      viewport.off('moved', handleViewportChange);
      viewport.off('zoomed', handleViewportChange);
      viewport.off('moved-end', handleViewportChange);
      viewport.off('zoomed-end', handleViewportChange);
    };
  }, [viewport, handleViewportChange]);

  // Optimized performance monitoring with throttling
  useEffect(() => {
    if (!app?.ticker) return;

    let frameCount = 0;
    let lastTime = performance.now();
    const fpsHistory: number[] = [];
    let monitoringCounter = 0;
    const MONITORING_INTERVAL = 60; // Only check every 60 frames (~1 second at 60fps)

    const monitorPerformance = () => {
      frameCount++;
      monitoringCounter++;
      
      // Only perform expensive calculations periodically
      if (monitoringCounter >= MONITORING_INTERVAL) {
        const currentTime = performance.now();
        const timeDiff = currentTime - lastTime;
        
        if (timeDiff >= 1000) {
          const fps = Math.round((frameCount * 1000) / timeDiff);
          fpsHistory.push(fps);
          
          // Keep only last 5 FPS measurements for efficiency
          if (fpsHistory.length > 5) {
            fpsHistory.shift();
          }
          
          // Only calculate average and log if we have performance issues
          if (fps < 30) {
            const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
            logger.warn(`Low FPS detected: ${fps} (avg: ${avgFps.toFixed(1)})`);
          }
          
          frameCount = 0;
          lastTime = currentTime;
        }
        monitoringCounter = 0;
      }
    };

    app.ticker.add(monitorPerformance);

    return () => {
      app.ticker.remove(monitorPerformance);
    };
  }, [app]);

  return <>{children}</>;
}

export type { ViewportManagerProps, ViewportBounds };
export { ViewportManager };