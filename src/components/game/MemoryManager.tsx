"use client";

import { useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import logger from "@/lib/logger";

interface MemoryStats {
  totalTextures: number;
  totalGeometries: number;
  totalDrawCalls: number;
  memoryUsage: number;
  loadedChunks: number;
  // Additional diagnostics
  heapLimitMB?: number;
  percentUsed?: number; // 0-100
}

interface MemoryManagerProps {
  maxMemoryMB?: number;
  maxTextures?: number;
  cleanupInterval?: number;
  onMemoryWarning?: (stats: MemoryStats) => void;
  onMemoryCleanup?: (freedMB: number) => void;
  // New optional controls (backward-compatible)
  warnAtPercent?: number; // warn when used/limit exceeds this percent
  warningCooldownMs?: number; // minimum time between warnings
}

export default function MemoryManager({
  maxMemoryMB = 512, // 512MB limit
  maxTextures = 1000,
  cleanupInterval = 30000, // 30 seconds
  onMemoryWarning,
  onMemoryCleanup,
  warnAtPercent = 85,
  warningCooldownMs = 60000,
}: MemoryManagerProps) {
  const cleanupIntervalRef = useRef<NodeJS.Timeout>();
  const lastCleanupRef = useRef<number>(0);
  const lastWarningRef = useRef<number>(0);
  const memoryStatsRef = useRef<MemoryStats>({
    totalTextures: 0,
    totalGeometries: 0,
    totalDrawCalls: 0,
    memoryUsage: 0,
    loadedChunks: 0,
  });

  // Estimate memory usage of PIXI objects
  const estimateMemoryUsage = useCallback((): MemoryStats => {
    // Simple estimation based on performance.memory if available
    const memoryInfo = (performance as any).memory;

    let estimatedMemoryMB = 0;
    let heapLimitMB: number | undefined;
    let percentUsed: number | undefined;

    if (memoryInfo) {
      estimatedMemoryMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      if (memoryInfo.jsHeapSizeLimit) {
        heapLimitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
        if (heapLimitMB > 0) {
          percentUsed = (estimatedMemoryMB / heapLimitMB) * 100;
        }
      }
    }
    
    const stats: MemoryStats = {
      totalTextures: 0, // Will be tracked manually
      totalGeometries: 0, // Will be tracked manually
      totalDrawCalls: 0, // Will be tracked manually
      memoryUsage: estimatedMemoryMB,
      loadedChunks: 0, // Will be updated by chunk manager
      heapLimitMB,
      percentUsed,
    };
    
    memoryStatsRef.current = stats;
    return stats;
  }, []);

  // Force garbage collection and cleanup unused resources
  const performCleanup = useCallback(async (): Promise<number> => {
    const beforeStats = estimateMemoryUsage();
    let freedMB = 0;
    
    try {
      const currentTime = Date.now();
      
      // Clear PIXI Assets cache if needed
      try {
        await PIXI.Assets.unload([]);
      } catch {
        // Ignore errors if no assets to unload
      }
      
      // Force JavaScript garbage collection if available
      if (typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
      
      const afterStats = estimateMemoryUsage();
      freedMB = Math.max(0, beforeStats.memoryUsage - afterStats.memoryUsage);
      
      if (freedMB > 0) {
        logger.info(`Memory cleanup freed ${freedMB.toFixed(2)}MB`, {
          before: beforeStats,
          after: afterStats,
        });
        
        onMemoryCleanup?.(freedMB);
      }
      
      lastCleanupRef.current = currentTime;
      
    } catch (error) {
      logger.error('Error during memory cleanup:', error);
    }
    
    return freedMB;
  }, [estimateMemoryUsage, onMemoryCleanup]);

  // Check if memory usage is too high
  const checkMemoryUsage = useCallback((): boolean => {
    const stats = estimateMemoryUsage();

    const overAbsolute = stats.memoryUsage > maxMemoryMB;
    const overPercent = typeof stats.percentUsed === 'number' && stats.percentUsed > warnAtPercent;
    const overTextures = stats.totalTextures > maxTextures;

    const isOverLimit = overAbsolute || overPercent || overTextures;
    
    if (isOverLimit) {
      const now = Date.now();
      if (now - lastWarningRef.current >= warningCooldownMs) {
        logger.warn('Memory usage exceeds limits:', {
          current: `${stats.memoryUsage.toFixed(2)}MB`,
          limit: `${maxMemoryMB}MB`,
          percent: typeof stats.percentUsed === 'number' ? `${stats.percentUsed.toFixed(1)}%` : 'n/a',
          textures: `${stats.totalTextures}/${maxTextures}`,
        });
        lastWarningRef.current = now;
        onMemoryWarning?.(stats);
      }
    }
    
    return isOverLimit;
  }, [estimateMemoryUsage, maxMemoryMB, maxTextures, warnAtPercent, warningCooldownMs, onMemoryWarning]);

  // Automatic cleanup based on memory pressure
  const autoCleanup = useCallback(async () => {
    const currentTime = Date.now();
    const timeSinceLastCleanup = currentTime - lastCleanupRef.current;
    
    // Check if we need cleanup
    const needsCleanup = 
      timeSinceLastCleanup > cleanupInterval || 
      checkMemoryUsage();
    
    if (needsCleanup) {
      await performCleanup();
    }
  }, [cleanupInterval, checkMemoryUsage, performCleanup]);

  // Set up automatic cleanup interval
  useEffect(() => {
    // Initial cleanup
    autoCleanup();
    
    // Set up interval for regular cleanup
    cleanupIntervalRef.current = setInterval(autoCleanup, cleanupInterval);
    
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [autoCleanup, cleanupInterval]);

  // Monitor memory usage on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible, check memory usage
        setTimeout(checkMemoryUsage, 1000);
      } else {
        // App became hidden, perform cleanup
        setTimeout(performCleanup, 2000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkMemoryUsage, performCleanup]);

  // Expose memory management functions globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).memoryManager = {
        getStats: estimateMemoryUsage,
        cleanup: performCleanup,
        checkUsage: checkMemoryUsage,
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).memoryManager;
      }
    };
  }, [estimateMemoryUsage, performCleanup, checkMemoryUsage]);

  return null; // This component doesn't render anything
}

// Hook for accessing memory stats
export function useMemoryStats() {
  const getStats = useCallback((): MemoryStats => {
    if (typeof window !== 'undefined' && (window as any).memoryManager) {
      return (window as any).memoryManager.getStats();
    }
    
    return {
      totalTextures: 0,
      totalGeometries: 0,
      totalDrawCalls: 0,
      memoryUsage: 0,
      loadedChunks: 0,
      heapLimitMB: undefined,
      percentUsed: undefined,
    };
  }, []);
  
  const forceCleanup = useCallback(async (): Promise<number> => {
    if (typeof window !== 'undefined' && (window as any).memoryManager) {
      return await (window as any).memoryManager.cleanup();
    }
    return 0;
  }, []);
  
  return { getStats, forceCleanup };
}

export type { MemoryStats, MemoryManagerProps };
export { MemoryManager };