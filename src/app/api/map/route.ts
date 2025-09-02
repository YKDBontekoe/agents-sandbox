import { NextResponse } from 'next/server';
import { generateTileTypes } from '@/lib/map';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Number(searchParams.get('size') ?? '20');
  const map = generateTileTypes(size);
  return NextResponse.json({ map });
}
