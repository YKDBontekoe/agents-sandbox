export interface ChunkFieldMaps {
  height: number[][];
  temperature: number[][];
  moisture: number[][];
  climate: string[][];
  isRiver: boolean[][];
  isWater: boolean[][];
}

export interface ChunkMetadata {
  dominantClimate: string | null;
  dominantBiome: string | null;
  riverCount: number;
  coastlineTiles: number;
  elevation: { min: number; max: number; mean: number };
}

export interface ChunkPayload {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  seed: number;
  tiles: string[][];
  biomes?: string[][];
  fields?: ChunkFieldMaps;
  features?: unknown;
  metadata?: ChunkMetadata;
}

export interface ChunkData {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  tiles: string[][];
  biomes?: string[][];
  features?: unknown;
  metadata?: ChunkMetadata;
}

export interface ChunkCacheEntry {
  key: string;
  data: ChunkData;
  tileCount: number;
  lastAccessed: number;
}

export interface EnsureChunkResult {
  key: string;
  data: ChunkData;
  isNew: boolean;
  renderPayload?: ChunkPayload;
}

export interface ReleaseResult {
  key: string;
  entry: ChunkCacheEntry;
}

export type ChunkCache = Map<string, ChunkCacheEntry>;

export function getChunkKey(chunkX: number, chunkY: number) {
  return `${chunkX},${chunkY}`;
}
