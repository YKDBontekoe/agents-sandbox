import {
  computeHeight,
  computeTemperature,
  computeMoisture,
  fractalNoise,
} from "./noise";
import {
  classifyBiome,
  getClimateBand,
  biomeToTile,
  DEFAULT_BIOME_THRESHOLDS,
  type BiomeId,
  type ClimateBand,
} from "./biome";
import {
  deriveRiverPaths,
  deriveCoastPoints,
  type RiverPath,
  type CoastPoint,
} from "./features";

/*
 * Procedural world generator that exposes deterministic field sampling and
 * higher-level feature extraction helpers (rivers, coasts, biome mapping).
 */

export interface FieldMaps {
  height: number[][];
  temperature: number[][];
  moisture: number[][];
  climate: ClimateBand[][];
  biomes: BiomeId[][];
  isRiver: boolean[][];
  isWater: boolean[][];
}

export interface ClimateBandCoverage {
  band: ClimateBand;
  coverage: number;
}

export interface BiomeCoverage {
  biome: BiomeId;
  coverage: number;
}

export interface ElevationSummary {
  min: number;
  max: number;
  mean: number;
}

export interface RegionFeatures {
  rivers: RiverPath[];
  coasts: CoastPoint[];
  climateBands: ClimateBandCoverage[];
  biomeDistribution: BiomeCoverage[];
  elevation: ElevationSummary;
}

export interface RegionResult {
  startX: number;
  startY: number;
  width: number;
  height: number;
  tiles: string[][];
  fields: FieldMaps;
  features: RegionFeatures;
}

export interface ChunkResult extends RegionResult {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
}

export interface WorldGenerator {
  sampleTile(x: number, y: number): SampledTile;
  generateRegion(options: { startX: number; startY: number; width: number; height: number }): RegionResult;
  generateChunk(chunkX: number, chunkY: number, chunkSize: number): ChunkResult;
}

export interface SampledTile {
  height: number;
  temperature: number;
  moisture: number;
  climate: ClimateBand;
  biome: BiomeId;
  tileType: string;
  isRiver: boolean;
  isWater: boolean;
}

const BIOME_THRESHOLDS = DEFAULT_BIOME_THRESHOLDS;
const WATER_LEVEL = BIOME_THRESHOLDS.waterLevel;
const DEEP_WATER_LEVEL = BIOME_THRESHOLDS.deepWaterLevel;
const COAST_MARGIN = BIOME_THRESHOLDS.coastMargin;
const RIVER_THRESHOLD = 0.035;

function computeRiverMask(seed: number, x: number, y: number, heightValue: number, moisture: number) {
  if (heightValue <= WATER_LEVEL) return false;
  if (heightValue >= 0.78) return false;
  if (moisture < 0.52) return false;
  const riverNoise = fractalNoise(seed + 331, x, y, {
    frequency: 0.008,
    octaves: 3,
    lacunarity: 2.1,
    gain: 0.55,
  });
  return riverNoise < RIVER_THRESHOLD;
}

export function createWorldGenerator(seed: number): WorldGenerator {
  const baseSeed = seed >>> 0;

  const sampleTile = (x: number, y: number): SampledTile => {
    const heightValue = computeHeight(baseSeed, x, y);
    const temperature = computeTemperature(baseSeed, x, y, heightValue);
    const moisture = computeMoisture(baseSeed, x, y, heightValue, { waterLevel: WATER_LEVEL });
    const climate = getClimateBand(temperature, moisture);
    let biome = classifyBiome(heightValue, temperature, moisture);
    const isRiver = computeRiverMask(baseSeed, x, y, heightValue, moisture);
    const isWater = heightValue <= WATER_LEVEL;
    if (!isWater && heightValue <= WATER_LEVEL + COAST_MARGIN) {
      biome = "coast";
    }
    const tileType = biomeToTile(biome, { isRiver, height: heightValue }, BIOME_THRESHOLDS);
    return {
      height: heightValue,
      temperature,
      moisture,
      climate,
      biome,
      tileType,
      isRiver,
      isWater,
    };
  };

  const generateRegion = ({
    startX,
    startY,
    width,
    height,
  }: {
    startX: number;
    startY: number;
    width: number;
    height: number;
  }): RegionResult => {
    const tiles: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => "grass"));
    const heightMap: number[][] = Array.from({ length: height }, () => Array<number>(width).fill(0));
    const temperatureMap: number[][] = Array.from({ length: height }, () => Array<number>(width).fill(0));
    const moistureMap: number[][] = Array.from({ length: height }, () => Array<number>(width).fill(0));
    const climateMap: ClimateBand[][] = Array.from({ length: height }, () => Array<ClimateBand>(width));
    const biomeMap: BiomeId[][] = Array.from({ length: height }, () => Array<BiomeId>(width));
    const riverMask: boolean[][] = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
    const waterMask: boolean[][] = Array.from({ length: height }, () => Array<boolean>(width).fill(false));

    const climateCounts = new Map<ClimateBand, number>();
    const biomeCounts = new Map<BiomeId, number>();

    let minHeight = Number.POSITIVE_INFINITY;
    let maxHeight = Number.NEGATIVE_INFINITY;
    let sumHeight = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const worldX = startX + x;
        const worldY = startY + y;
        const sample = sampleTile(worldX, worldY);

        tiles[y][x] = sample.tileType;
        heightMap[y][x] = sample.height;
        temperatureMap[y][x] = sample.temperature;
        moistureMap[y][x] = sample.moisture;
        climateMap[y][x] = sample.climate;
        biomeMap[y][x] = sample.biome;
        riverMask[y][x] = sample.isRiver;
        waterMask[y][x] = sample.isWater;

        if (sample.isWater) {
          tiles[y][x] = sample.height <= DEEP_WATER_LEVEL ? "deep_water" : "water";
        } else if (sample.tileType === "coast" && !sample.isRiver) {
          tiles[y][x] = "coast";
        }

        climateCounts.set(sample.climate, (climateCounts.get(sample.climate) ?? 0) + 1);
        biomeCounts.set(sample.biome, (biomeCounts.get(sample.biome) ?? 0) + 1);

        minHeight = Math.min(minHeight, sample.height);
        maxHeight = Math.max(maxHeight, sample.height);
        sumHeight += sample.height;
      }
    }

    const rivers = deriveRiverPaths(riverMask, heightMap, startX, startY);
    const coasts = deriveCoastPoints(waterMask, startX, startY);
    const totalTiles = width * height;

    const climateBands: ClimateBandCoverage[] = Array.from(climateCounts.entries())
      .map(([band, count]) => ({ band, coverage: count / totalTiles }))
      .sort((a, b) => b.coverage - a.coverage);

    const biomeDistribution: BiomeCoverage[] = Array.from(biomeCounts.entries())
      .map(([biome, count]) => ({ biome, coverage: count / totalTiles }))
      .sort((a, b) => b.coverage - a.coverage);

    const elevation: ElevationSummary = {
      min: minHeight === Number.POSITIVE_INFINITY ? 0 : minHeight,
      max: maxHeight === Number.NEGATIVE_INFINITY ? 0 : maxHeight,
      mean: totalTiles === 0 ? 0 : sumHeight / totalTiles,
    };

    return {
      startX,
      startY,
      width,
      height,
      tiles,
      fields: {
        height: heightMap,
        temperature: temperatureMap,
        moisture: moistureMap,
        climate: climateMap,
        biomes: biomeMap,
        isRiver: riverMask,
        isWater: waterMask,
      },
      features: {
        rivers,
        coasts,
        climateBands,
        biomeDistribution,
        elevation,
      },
    };
  };

  const generateChunk = (chunkX: number, chunkY: number, chunkSize: number): ChunkResult => {
    const startX = chunkX * chunkSize;
    const startY = chunkY * chunkSize;
    const region = generateRegion({ startX, startY, width: chunkSize, height: chunkSize });
    return {
      chunkX,
      chunkY,
      chunkSize,
      ...region,
    };
  };

  return {
    sampleTile,
    generateRegion,
    generateChunk,
  };
}

export type { ClimateBand, BiomeId } from "./biome";
export type { RiverPath, RiverPoint, CoastPoint } from "./features";
