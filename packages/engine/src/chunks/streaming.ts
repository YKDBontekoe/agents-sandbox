import { createNullChunkTelemetry, type ChunkTelemetry } from "./telemetry";
import {
  type ChunkCache,
  type ChunkCacheEntry,
  type ChunkPayload,
  type EnsureChunkResult,
  type ReleaseResult,
  getChunkKey,
} from "./types";

export interface ChunkStreamingOptions {
  chunkSize: number;
  maxLoadedChunks: number;
  loadChunkData: (chunkX: number, chunkY: number) => Promise<ChunkPayload>;
  telemetry?: ChunkTelemetry;
  onChunkEvicted?: (chunkKey: string, entry: ChunkCacheEntry) => void;
  worldSeed?: number;
}

export class ChunkStreamingManager {
  private readonly cache: ChunkCache;
  private readonly loading: Map<string, Promise<ChunkPayload>>;
  private cleanupDisposer: (() => void) | undefined;
  private readonly telemetry: ChunkTelemetry;
  private readonly ownsTelemetry: boolean;

  constructor(private readonly options: ChunkStreamingOptions) {
    this.cache = new Map();
    this.loading = new Map();
    this.telemetry = options.telemetry ?? createNullChunkTelemetry();
    this.ownsTelemetry = options.telemetry === undefined;

    this.cleanupDisposer = this.telemetry.scheduleCleanup(
      () => this.cache.entries(),
      (chunkKey) => {
        const released = this.releaseChunkInternal(chunkKey, "stale");
        if (released) {
          this.options.onChunkEvicted?.(chunkKey, released.entry);
        }
      },
    ) ?? undefined;
  }

  get chunkCache(): ChunkCache {
    return this.cache;
  }

  async ensureChunkLoaded(chunkX: number, chunkY: number): Promise<EnsureChunkResult> {
    const chunkKey = getChunkKey(chunkX, chunkY);
    const existing = this.cache.get(chunkKey);
    const now = Date.now();

    if (existing) {
      existing.lastAccessed = now;
      return { key: chunkKey, data: existing.data, isNew: false };
    }

    const loader = this.getOrCreateLoader(chunkKey, chunkX, chunkY);

    try {
      const start = performance.now();
      this.telemetry.logLoadStart(chunkKey);
      const payload = await loader;

      const result = this.persistChunk(chunkKey, payload, now);
      const durationMs = performance.now() - start;

      this.telemetry.logLoadSuccess(chunkKey, {
        durationMs,
        tileCount: result.entry.tileCount,
        cacheSize: this.cache.size,
      });

      this.enforceCapacity();

      return { key: chunkKey, data: result.entry.data, isNew: true, renderPayload: payload };
    } catch (error) {
      this.telemetry.logLoadError(chunkKey, error);
      this.loading.delete(chunkKey);
      throw error;
    }
  }

  releaseChunk(chunkKey: string, reason = "manual"): ReleaseResult | null {
    const released = this.releaseChunkInternal(chunkKey, reason);
    if (!released) {
      return null;
    }

    return released;
  }

  dispose() {
    if (this.cleanupDisposer) {
      this.cleanupDisposer();
      this.cleanupDisposer = undefined;
    }

    if (this.ownsTelemetry) {
      this.telemetry.dispose();
    }
  }

  private getOrCreateLoader(chunkKey: string, chunkX: number, chunkY: number) {
    if (!this.loading.has(chunkKey)) {
      const promise = this.options
        .loadChunkData(chunkX, chunkY)
        .finally(() => {
          this.loading.delete(chunkKey);
        });

      this.loading.set(chunkKey, promise);
    }

    return this.loading.get(chunkKey)!;
  }

  private persistChunk(chunkKey: string, payload: ChunkPayload, lastAccessed: number) {
    const { fields: _unused, ...data } = payload;
    void _unused;
    const tileCount = payload.tiles.reduce((count, row) => count + row.length, 0);

    const entry: ChunkCacheEntry = {
      key: chunkKey,
      data,
      tileCount,
      lastAccessed,
    };

    this.cache.set(chunkKey, entry);

    return { key: chunkKey, entry };
  }

  private enforceCapacity() {
    if (this.cache.size <= this.options.maxLoadedChunks) {
      return;
    }

    const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    const excess = this.cache.size - this.options.maxLoadedChunks;

    for (let i = 0; i < excess; i++) {
      const [chunkKey] = entries[i];
      const released = this.releaseChunkInternal(chunkKey, "evicted");
      if (released) {
        this.options.onChunkEvicted?.(chunkKey, released.entry);
      }
    }
  }

  private releaseChunkInternal(chunkKey: string, reason: string): ReleaseResult | null {
    const entry = this.cache.get(chunkKey);
    if (!entry) {
      return null;
    }

    const start = performance.now();
    this.cache.delete(chunkKey);

    this.telemetry.logRelease(chunkKey, {
      durationMs: performance.now() - start,
      tileCount: entry.tileCount,
      cacheSize: this.cache.size,
      reason,
    });

    return { key: chunkKey, entry };
  }
}
