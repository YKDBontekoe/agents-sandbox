import * as PIXI from "pixi.js";
import type { Renderer } from "pixi.js";
import logger from "@/lib/logger";
import { createTileSprite, type GridTile } from "./TileRenderer";
import type { RegionFeatures } from "@engine";

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

export interface ChunkApiResponse {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  seed: number;
  tiles: string[][];
  biomes?: string[][];
  fields?: ChunkFieldMaps;
  features?: RegionFeatures;
  metadata?: ChunkMetadata;
}

export interface ChunkData {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  tiles: string[][];
  biomes?: string[][];
  features?: RegionFeatures;
  metadata?: ChunkMetadata;
}

export interface LoadedChunk {
  data: ChunkData;
  container: PIXI.Container;
  tiles: Map<string, GridTile>;
  lastAccessed: number;
}

interface CreateChunkContainerOptions {
  renderer: Renderer;
  tileWidth: number;
  tileHeight: number;
}

export function createChunkContainer(
  chunkData: ChunkApiResponse,
  { renderer, tileWidth, tileHeight }: CreateChunkContainerOptions,
): { container: PIXI.Container; tiles: Map<string, GridTile> } {
  const container = new PIXI.Container();
  container.name = `chunk-${chunkData.chunkX}-${chunkData.chunkY}`;
  container.sortableChildren = true;

  const tiles = new Map<string, GridTile>();

  const heightMap = chunkData.fields?.height;
  const temperatureMap = chunkData.fields?.temperature;
  const moistureMap = chunkData.fields?.moisture;
  const climateMap = chunkData.fields?.climate;

  for (let localY = 0; localY < chunkData.chunkSize; localY++) {
    for (let localX = 0; localX < chunkData.chunkSize; localX++) {
      const globalX = chunkData.chunkX * chunkData.chunkSize + localX;
      const globalY = chunkData.chunkY * chunkData.chunkSize + localY;
      const tileType = chunkData.tiles[localY]?.[localX] ?? "grass";
      const biome = chunkData.biomes?.[localY]?.[localX];
      const heightValue = heightMap?.[localY]?.[localX];
      const temperatureValue = temperatureMap?.[localY]?.[localX];
      const moistureValue = moistureMap?.[localY]?.[localX];
      const climateValue = climateMap?.[localY]?.[localX];

      const tile = createTileSprite(
        globalX,
        globalY,
        container,
        tileWidth,
        tileHeight,
        chunkData.tiles,
        renderer,
        { tileTypeOverride: tileType },
      );

      tile.tileType = tileType;
      tile.biome = biome;
      tile.height = heightValue;
      tile.temperature = temperatureValue;
      tile.moisture = moistureValue;
      tile.climate = climateValue;

      if (typeof heightValue === "number" && !["water", "deep_water", "river", "coast"].includes(tileType)) {
        const shade = Math.max(0.65, Math.min(1, 0.72 + heightValue * 0.28));
        const shadeChannel = Math.round(shade * 255);
        const tintHex = (shadeChannel << 16) | (shadeChannel << 8) | shadeChannel;
        tile.sprite.tint = tintHex;
      }

      if (tileType === "river") {
        tile.sprite.alpha = 0.95;
      }

      const key = `${globalX},${globalY}`;
      tiles.set(key, tile);
      container.addChild(tile.sprite);
    }
  }

  return { container, tiles };
}

export function disposeChunkTiles(chunk: LoadedChunk): number {
  let disposedCount = 0;
  chunk.tiles.forEach((tile, tileKey) => {
    try {
      tile.dispose();
      disposedCount++;
    } catch (error) {
      logger.error(`[MEMORY] Error disposing tile ${tileKey}:`, error);
    }
  });
  chunk.tiles.clear();
  return disposedCount;
}
