import { NextRequest, NextResponse } from 'next/server';
import { createWorldGenerator } from '@/lib/world/generator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sizeParam = searchParams.get('size');
  const seedParam = searchParams.get('seed');
  const originXParam = searchParams.get('originX') ?? searchParams.get('startX');
  const originYParam = searchParams.get('originY') ?? searchParams.get('startY');

  const size = Math.max(8, Math.min(256, Number(sizeParam ?? 32)));
  const seed = Number.isFinite(Number(seedParam)) ? Number(seedParam) : 12345;
  const originX = Number.isFinite(Number(originXParam)) ? Number(originXParam) : 0;
  const originY = Number.isFinite(Number(originYParam)) ? Number(originYParam) : 0;

  const generator = createWorldGenerator(seed);
  const region = generator.generateRegion({ startX: originX, startY: originY, width: size, height: size });

  const payload = {
    size,
    seed,
    origin: { x: originX, y: originY },
    tiles: region.tiles,
    fields: {
      height: region.fields.height,
      temperature: region.fields.temperature,
      moisture: region.fields.moisture,
      climate: region.fields.climate,
      biomes: region.fields.biomes,
      isRiver: region.fields.isRiver,
      isWater: region.fields.isWater,
    },
    features: region.features,
  };

  const headers = {
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    'Content-Type': 'application/json',
  };

  return NextResponse.json(payload, { headers });
}
