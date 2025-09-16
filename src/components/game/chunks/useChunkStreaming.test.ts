import { describe, expect, it, vi } from "vitest";
import { ChunkStreamingManager, type ChunkPayload } from "@engine/chunks";

const createPayload = (chunkX: number, chunkY: number): ChunkPayload => ({
  chunkX,
  chunkY,
  chunkSize: 2,
  seed: 1,
  tiles: [
    ["grass", "grass"],
    ["grass", "grass"],
  ],
});

const telemetryStub = () => ({
  stats: {
    loads: 0,
    releases: 0,
    tilesLoaded: 0,
    tilesReleased: 0,
    lastCacheSize: 0,
    renderCreates: 0,
    renderDisposes: 0,
  },
  logLoadStart: vi.fn(),
  logLoadSuccess: vi.fn(),
  logLoadError: vi.fn(),
  logRelease: vi.fn(),
  logRenderCreate: vi.fn(),
  logRenderDispose: vi.fn(),
  scheduleCleanup: vi.fn(() => () => undefined),
  dispose: vi.fn(),
});

describe("ChunkStreamingManager", () => {
  it("evicts least recently used chunks when capacity is exceeded", async () => {
    const evicted: string[] = [];
    const loadChunkData = vi.fn(async (chunkX: number, chunkY: number) => createPayload(chunkX, chunkY));
    const manager = new ChunkStreamingManager({
      worldSeed: 7,
      chunkSize: 2,
      maxLoadedChunks: 2,
      telemetry: telemetryStub(),
      onChunkEvicted: (chunkKey) => evicted.push(chunkKey),
      loadChunkData,
    });

    await manager.ensureChunkLoaded(0, 0);
    await manager.ensureChunkLoaded(1, 0);
    expect(manager.chunkCache.size).toBe(2);

    await manager.ensureChunkLoaded(2, 0);

    expect(manager.chunkCache.size).toBe(2);
    expect(evicted).toContain("0,0");
    expect(loadChunkData).toHaveBeenCalledTimes(3);

    manager.dispose();
  });

  it("does not refetch chunks already cached", async () => {
    const loadChunkData = vi.fn(async (chunkX: number, chunkY: number) => createPayload(chunkX, chunkY));
    const manager = new ChunkStreamingManager({
      worldSeed: 11,
      chunkSize: 2,
      maxLoadedChunks: 3,
      telemetry: telemetryStub(),
      loadChunkData,
    });

    const first = await manager.ensureChunkLoaded(0, 0);
    expect(first.isNew).toBe(true);

    const second = await manager.ensureChunkLoaded(0, 0);
    expect(second.isNew).toBe(false);
    expect(loadChunkData).toHaveBeenCalledTimes(1);

    manager.dispose();
  });
});

