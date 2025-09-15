import { PerformanceMonitor } from './monitoring';
import type { Ticker } from 'pixi.js';

/**
 * Adaptive quality manager that adjusts rendering settings based on performance
 */
export class AdaptiveQualityManager {
  private performanceMonitor: PerformanceMonitor;
  private currentQuality: 'high' | 'medium' | 'low' = 'high';
  private onQualityChange?: (quality: 'high' | 'medium' | 'low') => void;
  private framesSinceLastCheck = 0;
  private readonly checkFrequency = 120; // evaluate every ~2s at 60fps

  // Hysteresis/debounce to avoid rapid oscillation
  private lastChangeAt = 0;
  private readonly minChangeIntervalMs = 5000; // at least 5s between quality changes
  private stableGoodFrames = 0;
  private stableBadFrames = 0;
  private readonly stableFramesThreshold = 180; // require ~3s of stability

  constructor(onQualityChange?: (quality: 'high' | 'medium' | 'low') => void) {
    this.onQualityChange = onQualityChange;
    this.performanceMonitor = new PerformanceMonitor(this.handleFpsUpdate);
  }

  start(ticker?: Ticker): void {
    this.performanceMonitor.start(ticker);
  }

  stop(): void {
    this.performanceMonitor.stop();
  }

  private handleFpsUpdate = (fps: number): void => {
    this.framesSinceLastCheck++;

    // Track stability windows
    if (fps < 50) {
      this.stableBadFrames++;
      this.stableGoodFrames = 0;
    } else if (fps > 56) {
      this.stableGoodFrames++;
      this.stableBadFrames = 0;
    } else {
      // within neutral band, decay counters slowly
      this.stableGoodFrames = Math.max(0, this.stableGoodFrames - 1);
      this.stableBadFrames = Math.max(0, this.stableBadFrames - 1);
    }

    if (this.framesSinceLastCheck >= this.checkFrequency) {
      this.framesSinceLastCheck = 0;
      this.adjustQuality(fps);
    }
  };

  private adjustQuality(fps: number): void {
    let newQuality = this.currentQuality;
    const now = performance.now();

    // Respect debounce interval between changes
    const canChange = (now - this.lastChangeAt) >= this.minChangeIntervalMs;

    // Downgrade quality if performance is persistently poor
    if (canChange) {
      if (this.currentQuality === 'high' && (fps < 45 || this.stableBadFrames >= this.stableFramesThreshold)) {
        newQuality = 'medium';
      } else if (this.currentQuality === 'medium' && (fps < 30 || this.stableBadFrames >= this.stableFramesThreshold)) {
        newQuality = 'low';
      }

      // Upgrade quality if performance is persistently good with hysteresis
      if (this.currentQuality === 'low' && (fps > 58 && this.stableGoodFrames >= this.stableFramesThreshold)) {
        newQuality = 'medium';
      } else if (this.currentQuality === 'medium' && (fps > 59 && this.stableGoodFrames >= this.stableFramesThreshold)) {
        newQuality = 'high';
      }
    }

    if (newQuality !== this.currentQuality) {
      this.currentQuality = newQuality;
      this.lastChangeAt = now;
      // reset stability counters after a change to avoid flip-flop
      this.stableGoodFrames = 0;
      this.stableBadFrames = 0;
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
        } as const;
      case 'medium':
        return {
          resolution: 0.8,
          antialias: true,
          maxTiles: 5000,
          lodThreshold: 0.7,
          animationQuality: 'medium'
        } as const;
      case 'low':
        return {
          resolution: 0.6,
          antialias: false,
          maxTiles: 2500,
          lodThreshold: 1.0,
          animationQuality: 'low'
        } as const;
    }
  }
}
