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
