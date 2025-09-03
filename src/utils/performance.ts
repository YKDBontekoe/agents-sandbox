/**
 * Performance monitoring and optimization utilities
 */

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameHistory: number[] = [];
  private readonly maxHistorySize = 60; // Track last 60 frames
  private onFpsUpdate?: (fps: number) => void;
  private animationId?: number;
  private isRunning = false;

  constructor(onFpsUpdate?: (fps: number) => void) {
    this.onFpsUpdate = onFpsUpdate;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameHistory = [];
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.frameCount++;
    this.frameHistory.push(deltaTime);
    
    // Keep history size manageable
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory.shift();
    }

    // Calculate FPS every 10 frames
    if (this.frameCount % 10 === 0) {
      const avgDelta = this.frameHistory.reduce((sum, delta) => sum + delta, 0) / this.frameHistory.length;
      this.fps = Math.round(1000 / avgDelta);
      this.onFpsUpdate?.(this.fps);
    }

    this.lastTime = currentTime;
    this.animationId = requestAnimationFrame(this.tick);
  };

  getFPS(): number {
    return this.fps;
  }

  getAverageFrameTime(): number {
    if (this.frameHistory.length === 0) return 16.67; // 60fps default
    return this.frameHistory.reduce((sum, delta) => sum + delta, 0) / this.frameHistory.length;
  }

  isPerformanceGood(): boolean {
    return this.fps >= 55; // Allow some tolerance below 60fps
  }

  getPerformanceLevel(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.fps >= 58) return 'excellent';
    if (this.fps >= 45) return 'good';
    if (this.fps >= 30) return 'fair';
    return 'poor';
  }
}

/**
 * Adaptive quality manager that adjusts rendering settings based on performance
 */
export class AdaptiveQualityManager {
  private performanceMonitor: PerformanceMonitor;
  private currentQuality: 'high' | 'medium' | 'low' = 'high';
  private onQualityChange?: (quality: 'high' | 'medium' | 'low') => void;
  private checkInterval?: NodeJS.Timeout;
  private framesSinceLastCheck = 0;
  private readonly checkFrequency = 120; // Check every 2 seconds at 60fps

  constructor(onQualityChange?: (quality: 'high' | 'medium' | 'low') => void) {
    this.onQualityChange = onQualityChange;
    this.performanceMonitor = new PerformanceMonitor(this.handleFpsUpdate);
  }

  start(): void {
    this.performanceMonitor.start();
  }

  stop(): void {
    this.performanceMonitor.stop();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private handleFpsUpdate = (fps: number): void => {
    this.framesSinceLastCheck++;
    
    if (this.framesSinceLastCheck >= this.checkFrequency) {
      this.framesSinceLastCheck = 0;
      this.adjustQuality(fps);
    }
  };

  private adjustQuality(fps: number): void {
    let newQuality = this.currentQuality;

    // Downgrade quality if performance is poor
    if (fps < 45 && this.currentQuality === 'high') {
      newQuality = 'medium';
    } else if (fps < 30 && this.currentQuality === 'medium') {
      newQuality = 'low';
    }
    // Upgrade quality if performance is good
    else if (fps > 55 && this.currentQuality === 'low') {
      newQuality = 'medium';
    } else if (fps > 58 && this.currentQuality === 'medium') {
      newQuality = 'high';
    }

    if (newQuality !== this.currentQuality) {
      this.currentQuality = newQuality;
      this.onQualityChange?.(newQuality);
    }
  }

  getCurrentQuality(): 'high' | 'medium' | 'low' {
    return this.currentQuality;
  }

  getQualitySettings() {
    switch (this.currentQuality) {
      case 'high':
        return {
          resolution: 1,
          antialias: true,
          maxTiles: 10000,
          lodThreshold: 0.5,
          animationQuality: 'high'
        };
      case 'medium':
        return {
          resolution: 0.8,
          antialias: true,
          maxTiles: 5000,
          lodThreshold: 0.7,
          animationQuality: 'medium'
        };
      case 'low':
        return {
          resolution: 0.6,
          antialias: false,
          maxTiles: 2500,
          lodThreshold: 1.0,
          animationQuality: 'low'
        };
    }
  }
}

/**
 * Throttle function calls to improve performance
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this as never, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function calls to reduce unnecessary executions
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this as never, args), delay);
  };
}

/**
 * Request animation frame with fallback
 */
export const requestAnimFrame = (
  callback: FrameRequestCallback
): number => {
  const raf =
    window.requestAnimationFrame ||
    (window as Window & { webkitRequestAnimationFrame?: typeof window.requestAnimationFrame }).webkitRequestAnimationFrame ||
    ((cb: FrameRequestCallback) => window.setTimeout(cb, 1000 / 60));
  return raf(callback);
};

/**
 * Cancel animation frame with fallback
 */
export const cancelAnimFrame = (id: number): void => {
  const caf =
    window.cancelAnimationFrame ||
    (window as Window & { webkitCancelAnimationFrame?: typeof window.cancelAnimationFrame }).webkitCancelAnimationFrame ||
    window.clearTimeout;
  caf(id as unknown as number);
};