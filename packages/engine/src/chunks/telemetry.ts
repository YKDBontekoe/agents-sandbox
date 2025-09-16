import type { ChunkCacheEntry } from "./types";

export interface ChunkTelemetryStats {
  loads: number;
  releases: number;
  tilesLoaded: number;
  tilesReleased: number;
  lastCacheSize: number;
  renderCreates: number;
  renderDisposes: number;
}

export interface ChunkTelemetry {
  stats: ChunkTelemetryStats;
  logLoadStart: (chunkKey: string) => void;
  logLoadSuccess: (
    chunkKey: string,
    details: { durationMs: number; tileCount: number; cacheSize: number }
  ) => void;
  logLoadError: (chunkKey: string, error: unknown) => void;
  logRelease: (
    chunkKey: string,
    details: { durationMs: number; tileCount: number; cacheSize: number; reason: string }
  ) => void;
  logRenderCreate: (chunkKey: string, details: { tileCount: number }) => void;
  logRenderDispose: (chunkKey: string, details: { tileCount: number }) => void;
  scheduleCleanup: (
    snapshot: () => Iterable<[string, ChunkCacheEntry]>,
    evict: (chunkKey: string) => void,
  ) => (() => void) | undefined;
  dispose: () => void;
}

const noop = () => {
  // no-op
};

const noopCleanup = () => undefined;

export function createNullChunkTelemetry(): ChunkTelemetry {
  return {
    stats: {
      loads: 0,
      releases: 0,
      tilesLoaded: 0,
      tilesReleased: 0,
      lastCacheSize: 0,
      renderCreates: 0,
      renderDisposes: 0,
    },
    logLoadStart: noop,
    logLoadSuccess: noop,
    logLoadError: noop,
    logRelease: noop,
    logRenderCreate: noop,
    logRenderDispose: noop,
    scheduleCleanup: noopCleanup,
    dispose: noop,
  };
}
