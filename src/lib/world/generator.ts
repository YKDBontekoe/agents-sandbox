/*
 * Procedural world generator that exposes deterministic field sampling and
 * higher-level feature extraction helpers (rivers, coasts, biome mapping).
 */

export type ClimateBand =
  | "polar"
  | "subpolar"
  | "temperate-humid"
  | "temperate-arid"
  | "subtropical-humid"
  | "subtropical-arid"
  | "tropical-humid"
  | "tropical-arid";

export type BiomeId =
  | "deep_water"
  | "open_water"
  | "coast"
  | "swamp"
  | "temperate_forest"
  | "tropical_forest"
  | "grassland"
  | "steppe"
  | "savanna"
  | "desert"
  | "tundra"
  | "snow"
  | "mountain"
  | "hills"
  | "badlands";

export interface FieldMaps {
  height: number[][];
  temperature: number[][];
  moisture: number[][];
  climate: ClimateBand[][];
  biomes: BiomeId[][];
  isRiver: boolean[][];
  isWater: boolean[][];
}

export interface RiverPoint {
  x: number;
  y: number;
  height: number;
}

export interface RiverPath {
  id: string;
  source: RiverPoint;
  mouth: RiverPoint;
  length: number;
  path: RiverPoint[];
}

export interface CoastPoint {
  x: number;
  y: number;
  type: "land" | "water";
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

const UINT32_MAX = 0xffffffff;
const WATER_LEVEL = 0.38;
const DEEP_WATER_LEVEL = WATER_LEVEL - 0.08;
const RIVER_THRESHOLD = 0.035;
const HEIGHT_NOISE_LAYERS = [
  { seedOffset: 101, frequency: 0.004, amplitude: 1 },
  { seedOffset: 131, frequency: 0.008, amplitude: 0.55 },
  { seedOffset: 151, frequency: 0.018, amplitude: 0.25 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function hash(seed: number, x: number, y: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 362437);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / UINT32_MAX;
}

function valueNoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);

  const n00 = hash(seed, x0, y0);
  const n10 = hash(seed, x1, y0);
  const n01 = hash(seed, x0, y1);
  const n11 = hash(seed, x1, y1);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

function fractalNoise(
  seed: number,
  x: number,
  y: number,
  {
    frequency,
    octaves = 4,
    lacunarity = 2,
    gain = 0.5,
  }: { frequency: number; octaves?: number; lacunarity?: number; gain?: number }
) {
  let amp = 1;
  let freq = frequency;
  let total = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(seed + i * 97, x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm === 0 ? 0 : total / norm;
}

export function classifyBiome(height: number, temperature: number, moisture: number): BiomeId {
  if (height <= WATER_LEVEL) {
    return height <= DEEP_WATER_LEVEL ? "deep_water" : temperature > 0.5 ? "open_water" : "open_water";
  }

  if (height >= 0.82) {
    return "mountain";
  }
  if (height >= 0.7) {
    return temperature < 0.35 ? "tundra" : "hills";
  }

  if (temperature < 0.18) {
    return "snow";
  }
  if (temperature < 0.32) {
    return moisture > 0.55 ? "temperate_forest" : "tundra";
  }
  if (temperature > 0.78) {
    if (moisture < 0.35) return "desert";
    if (moisture < 0.55) return "savanna";
    return "tropical_forest";
  }

  if (moisture < 0.22) {
    return "badlands";
  }
  if (moisture < 0.35) {
    return "steppe";
  }
  if (moisture > 0.78) {
    return "swamp";
  }

  return moisture > 0.55 ? "temperate_forest" : "grassland";
}

export function getClimateBand(temperature: number, moisture: number): ClimateBand {
  if (temperature < 0.2) return "polar";
  if (temperature < 0.35) return "subpolar";
  if (temperature < 0.6) return moisture < 0.4 ? "temperate-arid" : "temperate-humid";
  if (temperature < 0.78) return moisture < 0.45 ? "subtropical-arid" : "subtropical-humid";
  return moisture < 0.5 ? "tropical-arid" : "tropical-humid";
}

function biomeToTile(biome: BiomeId, { isRiver, height }: { isRiver: boolean; height: number }): string {
  if (isRiver) return "river";
  switch (biome) {
    case "deep_water":
      return "deep_water";
    case "open_water":
      return height <= WATER_LEVEL + 0.02 ? "water" : "coast";
    case "coast":
      return "coast";
    case "swamp":
      return "swamp";
    case "temperate_forest":
    case "tropical_forest":
      return "forest";
    case "grassland":
      return "grass";
    case "savanna":
      return "savanna";
    case "steppe":
      return "plains";
    case "desert":
      return "desert";
    case "tundra":
      return "tundra";
    case "snow":
      return "snow";
    case "mountain":
      return "mountain";
    case "hills":
      return "hills";
    case "badlands":
      return "badlands";
    default:
      return "grass";
  }
}

export function deriveCoastPoints(isWater: boolean[][], startX: number, startY: number): CoastPoint[] {
  const results: CoastPoint[] = [];
  const height = isWater.length;
  const width = isWater[0]?.length ?? 0;
  const seen = new Set<string>();

  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isWater[y]?.[x]) continue;
      let touchesWater = false;
      for (const [dx, dy] of deltas) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (isWater[ny]?.[nx]) {
          touchesWater = true;
          break;
        }
      }
      if (!touchesWater) continue;
      const worldX = startX + x;
      const worldY = startY + y;
      const key = `${worldX},${worldY}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ x: worldX, y: worldY, type: "land" });
    }
  }

  return results;
}

function orderRiverComponent(
  component: RiverPoint[],
  heightMap: number[][],
  width: number,
  height: number
): RiverPoint[] {
  if (component.length <= 2) return component;

  const remaining = new Map<string, RiverPoint>();
  component.forEach((point) => {
    remaining.set(`${point.x},${point.y}`, point);
  });

  let current = component.reduce((highest, point) => (point.height > highest.height ? point : highest));
  const ordered: RiverPoint[] = [current];
  remaining.delete(`${current.x},${current.y}`);

  const neighborOffsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  while (remaining.size > 0) {
    let next: RiverPoint | null = null;
    let lowestHeight = Infinity;
    for (const [dx, dy] of neighborOffsets) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const candidate = remaining.get(`${nx},${ny}`);
      if (candidate && candidate.height < lowestHeight) {
        next = candidate;
        lowestHeight = candidate.height;
      }
    }

    if (!next) {
      let fallback: RiverPoint | null = null;
      remaining.forEach((point) => {
        if (!fallback || point.height < fallback.height) {
          fallback = point;
        }
      });
      if (!fallback) break;
      next = fallback;
    }

    ordered.push(next);
    remaining.delete(`${next.x},${next.y}`);
    current = next;
  }

  return ordered;
}

export function deriveRiverPaths(
  isRiver: boolean[][],
  heightMap: number[][],
  startX: number,
  startY: number
): RiverPath[] {
  const height = isRiver.length;
  const width = isRiver[0]?.length ?? 0;
  const visited = new Set<string>();
  const rivers: RiverPath[] = [];
  let riverIndex = 0;

  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isRiver[y]?.[x]) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const stack: Array<{ x: number; y: number }> = [{ x, y }];
      const component: RiverPoint[] = [];
      visited.add(key);

      while (stack.length > 0) {
        const { x: cx, y: cy } = stack.pop()!;
        component.push({ x: cx + startX, y: cy + startY, height: heightMap[cy]?.[cx] ?? 0 });

        for (const [dx, dy] of offsets) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (!isRiver[ny]?.[nx]) continue;
          const neighborKey = `${nx},${ny}`;
          if (visited.has(neighborKey)) continue;
          visited.add(neighborKey);
          stack.push({ x: nx, y: ny });
        }
      }

      if (component.length === 0) continue;

      const ordered = orderRiverComponent(
        component.map((point) => ({
          x: point.x - startX,
          y: point.y - startY,
          height: point.height,
        })),
        heightMap,
        width,
        height
      ).map((point) => ({
        x: point.x + startX,
        y: point.y + startY,
        height: point.height,
      }));

      const source = ordered[0];
      const mouth = ordered[ordered.length - 1];
      rivers.push({
        id: `river-${startX}-${startY}-${riverIndex++}`,
        source,
        mouth,
        length: ordered.length,
        path: ordered,
      });
    }
  }

  return rivers;
}

function computeHeight(seed: number, x: number, y: number) {
  let heightValue = 0;
  let totalAmplitude = 0;
  for (const layer of HEIGHT_NOISE_LAYERS) {
    const value = fractalNoise(seed + layer.seedOffset, x, y, {
      frequency: layer.frequency,
      octaves: 3,
      lacunarity: 2.1,
      gain: 0.55,
    });
    heightValue += value * layer.amplitude;
    totalAmplitude += layer.amplitude;
  }
  heightValue = totalAmplitude === 0 ? 0 : heightValue / totalAmplitude;
  heightValue = Math.pow(heightValue, 1.08);
  return clamp(heightValue, 0, 1);
}

function computeTemperature(seed: number, x: number, y: number, heightValue: number) {
  const lat = Math.abs(y) / 620; // distance from equator influences baseline
  const latInfluence = clamp(1 - lat, 0, 1);
  const continental = fractalNoise(seed + 211, x, y, {
    frequency: 0.0025,
    octaves: 3,
    lacunarity: 2.2,
    gain: 0.55,
  });
  const detail = fractalNoise(seed + 213, x, y, {
    frequency: 0.012,
    octaves: 2,
    lacunarity: 2.1,
    gain: 0.5,
  });
  let temperature = latInfluence * 0.7 + continental * 0.2 + detail * 0.1;
  temperature -= heightValue * 0.32; // high elevations are colder
  return clamp(temperature, 0, 1);
}

function computeMoisture(seed: number, x: number, y: number, heightValue: number) {
  const base = fractalNoise(seed + 271, x, y, {
    frequency: 0.0035,
    octaves: 4,
    lacunarity: 2.0,
    gain: 0.55,
  });
  const detail = fractalNoise(seed + 277, x, y, {
    frequency: 0.015,
    octaves: 2,
    lacunarity: 2.1,
    gain: 0.5,
  });
  let moisture = base * 0.7 + detail * 0.3;
  if (heightValue <= WATER_LEVEL + 0.04) {
    moisture += (WATER_LEVEL + 0.04 - heightValue) * 1.4;
  }
  return clamp(moisture, 0, 1);
}

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
    const moisture = computeMoisture(baseSeed, x, y, heightValue);
    const climate = getClimateBand(temperature, moisture);
    let biome = classifyBiome(heightValue, temperature, moisture);
    const isRiver = computeRiverMask(baseSeed, x, y, heightValue, moisture);
    const isWater = heightValue <= WATER_LEVEL;
    if (!isWater && heightValue <= WATER_LEVEL + 0.02) {
      biome = "coast";
    }
    const tileType = biomeToTile(biome, { isRiver, height: heightValue });
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
