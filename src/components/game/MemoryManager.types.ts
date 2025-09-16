export interface MemoryStats {
  totalTextures: number;
  totalGeometries: number;
  totalDrawCalls: number;
  memoryUsage: number;
  loadedChunks: number;
  // Additional diagnostics
  heapLimitMB?: number;
  percentUsed?: number; // 0-100
}

export interface MemoryManagerProps {
  maxMemoryMB?: number;
  maxTextures?: number;
  cleanupInterval?: number;
  onMemoryWarning?: (stats: MemoryStats) => void;
  onMemoryCleanup?: (freedMB: number) => void;
  // New optional controls (backward-compatible)
  warnAtPercent?: number; // warn when used/limit exceeds this percent
  warningCooldownMs?: number; // minimum time between warnings
}

export interface PerformanceMemoryInfo {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
  totalJSHeapSize?: number;
}

export interface MemoryManagerAPI {
  getStats: () => MemoryStats;
  cleanup: () => Promise<number>;
  checkUsage: () => boolean;
}

declare global {
  interface Performance {
    memory?: PerformanceMemoryInfo;
  }

  interface Window {
    gc?: () => void;
    memoryManager?: MemoryManagerAPI;
  }
}

