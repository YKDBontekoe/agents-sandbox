import type { PerformanceMetrics } from './types';

export class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    totalUpdates: 0,
    averageUpdateTime: 0,
    systemLoad: 0,
    memoryUsage: 0,
  };

  track(startTime: number): void {
    const updateTime = performance.now() - startTime;
    this.metrics.totalUpdates += 1;
    this.metrics.averageUpdateTime =
      (this.metrics.averageUpdateTime + updateTime) / 2;
    this.metrics.systemLoad = Math.min(100, (updateTime / 16.67) * 100);
    const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
    const memory =
      perf.memory?.usedJSHeapSize ??
      (typeof process !== 'undefined'
        ? process.memoryUsage().heapUsed
        : 0);
    this.metrics.memoryUsage = Math.round(memory / 1024 / 1024);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

