import { NextRequest, NextResponse } from 'next/server'
import { generateMap } from '@application'

// Returns a size x size grid of tile type strings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sizeParam = searchParams.get('size')
  const seedParam = searchParams.get('seed')
  const size = Math.max(4, Math.min(100, Number(sizeParam ?? 20)))
  const seed = Number(seedParam ?? 12345)
  const map = generateMap(size, seed)
  return NextResponse.json({ map })
}
