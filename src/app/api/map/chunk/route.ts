import { NextRequest, NextResponse } from 'next/server';
import { createWorldGenerator } from '@engine';

const DEFAULT_CHUNK_SIZE = 32;
const MIN_CHUNK_SIZE = 8;
const MAX_CHUNK_SIZE = 128;

function parseIntParam(value: string | null, fallback: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chunkXParam = searchParams.get('chunkX') ?? searchParams.get('x');
  const chunkYParam = searchParams.get('chunkY') ?? searchParams.get('y');
  const chunkSizeParam = searchParams.get('chunkSize') ?? searchParams.get('size');
  const seedParam = searchParams.get('seed');
  const detail = (searchParams.get('detail') ?? 'full').toLowerCase();

  const chunkX = parseIntParam(chunkXParam, 0);
  const chunkY = parseIntParam(chunkYParam, 0);
  const chunkSize = clamp(
    parseIntParam(chunkSizeParam, DEFAULT_CHUNK_SIZE),
    MIN_CHUNK_SIZE,
    MAX_CHUNK_SIZE
  );
  const seed = parseIntParam(seedParam, 12345);

  const generator = createWorldGenerator(seed);
  const chunk = generator.generateChunk(chunkX, chunkY, chunkSize);

  const metadata = {
    dominantClimate: chunk.features.climateBands[0]?.band ?? null,
    dominantBiome: chunk.features.biomeDistribution[0]?.biome ?? null,
    riverCount: chunk.features.rivers.length,
    coastlineTiles: chunk.features.coasts.length,
    elevation: chunk.features.elevation,
  };

  const response: Record<string, unknown> = {
    chunkX,
    chunkY,
    chunkSize,
    seed,
    tiles: chunk.tiles,
    metadata,
  };

  if (detail === 'minimal') {
    // no-op: base payload already contains minimal information
  } else if (detail === 'standard') {
    response.biomes = chunk.fields.biomes;
    response.features = {
      rivers: chunk.features.rivers,
      coasts: chunk.features.coasts,
      climateBands: chunk.features.climateBands,
      biomeDistribution: chunk.features.biomeDistribution,
      elevation: chunk.features.elevation,
    };
  } else {
    response.biomes = chunk.fields.biomes;
    response.fields = {
      height: chunk.fields.height,
      temperature: chunk.fields.temperature,
      moisture: chunk.fields.moisture,
      climate: chunk.fields.climate,
      isRiver: chunk.fields.isRiver,
      isWater: chunk.fields.isWater,
    };
    response.features = chunk.features;
  }

  const headers = {
    'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
    'Content-Type': 'application/json',
  };

  return NextResponse.json(response, { headers });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
