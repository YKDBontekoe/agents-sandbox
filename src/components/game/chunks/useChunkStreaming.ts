"use client";

import { useEffect, useMemo } from "react";
import {
  ChunkStreamingManager,
  type ChunkCacheEntry,
  type ChunkPayload,
} from "@engine/chunks";
import { createChunkTelemetry, type ChunkTelemetry } from "./chunkTelemetry";

export interface ChunkStreamingOptions {
  worldSeed: number;
  chunkSize: number;
  maxLoadedChunks: number;
  telemetry?: ChunkTelemetry;
  onChunkEvicted?: (chunkKey: string, entry: ChunkCacheEntry) => void;
  loadChunkData?: (chunkX: number, chunkY: number) => Promise<ChunkPayload>;
}

async function fetchChunkPayload(
  chunkX: number,
  chunkY: number,
  chunkSize: number,
  worldSeed: number,
): Promise<ChunkPayload> {
  const response = await fetch(
    `/api/map/chunk?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}&seed=${worldSeed}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to load chunk (${chunkX}, ${chunkY}): ${response.statusText}`);
  }

  return (await response.json()) as ChunkPayload;
}

export function useChunkStreaming(options: ChunkStreamingOptions) {
  const { worldSeed, chunkSize, maxLoadedChunks, telemetry, onChunkEvicted, loadChunkData } = options;

  const manager = useMemo(() => {
    const chunkTelemetry = telemetry ?? createChunkTelemetry();
    const loader = loadChunkData ?? ((chunkX: number, chunkY: number) =>
      fetchChunkPayload(chunkX, chunkY, chunkSize, worldSeed));

    return new ChunkStreamingManager({
      chunkSize,
      maxLoadedChunks,
      telemetry: chunkTelemetry,
      onChunkEvicted,
      loadChunkData: loader,
    });
  }, [chunkSize, loadChunkData, maxLoadedChunks, onChunkEvicted, telemetry, worldSeed]);

  useEffect(() => () => manager.dispose(), [manager]);

  return useMemo(
    () => ({
      ensureChunkLoaded: manager.ensureChunkLoaded.bind(manager),
      releaseChunk: manager.releaseChunk.bind(manager),
      chunkCache: manager.chunkCache,
    }),
    [manager],
  );
}

export { ChunkStreamingManager } from "@engine/chunks";
export type { ChunkTelemetry, ChunkCacheEntry } from "@engine/chunks";
export type { EnsureChunkResult, ReleaseResult } from "@engine/chunks";
