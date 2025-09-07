import { PerformanceMonitor } from './monitoring';

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
