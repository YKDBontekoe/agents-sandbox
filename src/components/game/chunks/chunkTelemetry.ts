import logger from "@/lib/logger";
import type {
  ChunkCacheEntry,
  ChunkTelemetry,
  ChunkTelemetryStats,
} from "@engine/chunks";

export interface ChunkTelemetryOptions {
  cleanupIntervalMs?: number;
  chunkTimeoutMs?: number;
}

export function createChunkTelemetry({
  cleanupIntervalMs = 30_000,
  chunkTimeoutMs = 60_000,
}: ChunkTelemetryOptions = {}): ChunkTelemetry {
  const stats: ChunkTelemetryStats = {
    loads: 0,
    releases: 0,
    tilesLoaded: 0,
    tilesReleased: 0,
    lastCacheSize: 0,
    renderCreates: 0,
    renderDisposes: 0,
  };

  let cleanupHandle: ReturnType<typeof setInterval> | null = null;

  const scheduleCleanup = (
    snapshot: () => Iterable<[string, ChunkCacheEntry]>,
    evict: (chunkKey: string) => void,
  ) => {
    if (cleanupHandle) {
      clearInterval(cleanupHandle);
    }

    cleanupHandle = setInterval(() => {
      const now = Date.now();
      const staleKeys: string[] = [];

      for (const [chunkKey, entry] of snapshot()) {
        if (now - entry.lastAccessed > chunkTimeoutMs) {
          staleKeys.push(chunkKey);
        }
      }

      if (staleKeys.length > 0) {
        logger.debug(
          `[CHUNK_TELEMETRY] Cleaning up ${staleKeys.length} stale chunk(s): ${staleKeys.join(",")}`
        );
      }

      staleKeys.forEach(evict);
    }, cleanupIntervalMs);

    return () => {
      if (cleanupHandle) {
        clearInterval(cleanupHandle);
        cleanupHandle = null;
      }
    };
  };

  const telemetry: ChunkTelemetry = {
    stats,
    logLoadStart(chunkKey) {
      logger.info(`[CHUNK_LOAD] Begin loading ${chunkKey}`);
    },
    logLoadSuccess(chunkKey, { durationMs, tileCount, cacheSize }) {
      stats.loads += 1;
      stats.tilesLoaded += tileCount;
      stats.lastCacheSize = cacheSize;
      logger.info(
        `[CHUNK_LOAD] Loaded ${chunkKey} in ${durationMs.toFixed(2)}ms (tiles=${tileCount}, cache=${cacheSize})`
      );
    },
    logLoadError(chunkKey, error) {
      logger.error(`[CHUNK_LOAD] Failed loading ${chunkKey}`, error);
    },
    logRelease(chunkKey, { durationMs, tileCount, cacheSize, reason }) {
      stats.releases += 1;
      stats.tilesReleased += tileCount;
      stats.lastCacheSize = cacheSize;
      logger.info(
        `[CHUNK_RELEASE] Released ${chunkKey} in ${durationMs.toFixed(2)}ms (tiles=${tileCount}, cache=${cacheSize}, reason=${reason})`
      );
    },
    logRenderCreate(chunkKey, { tileCount }) {
      stats.renderCreates += 1;
      logger.debug(`[CHUNK_RENDER] Created container for ${chunkKey} (tiles=${tileCount})`);
    },
    logRenderDispose(chunkKey, { tileCount }) {
      stats.renderDisposes += 1;
      logger.debug(`[CHUNK_RENDER] Disposed container for ${chunkKey} (tiles=${tileCount})`);
    },
    scheduleCleanup,
    dispose() {
      if (cleanupHandle) {
        clearInterval(cleanupHandle);
        cleanupHandle = null;
      }
    },
  };

  return telemetry;
}

export type { ChunkTelemetry, ChunkTelemetryStats } from "@engine/chunks";

